import Face from "../models/faceSchema.js";
import faceEngineService from "../services/faceEngineService.js";
import mongoose from "mongoose";
import { updatePresenceState } from "../services/presenceReconciliationService.js";
import { processUnknown } from "./unknownController.js";

/**
 * DECOUPLED Face Controller for high-accuracy recognition using Python engine.
 */

export const enrollEmployee = async (req, res) => {
    try {
        const { name, faceImages, email, phoneNumber, password, occlusionTypes } = req.body;

        if (!name || !faceImages || !Array.isArray(faceImages) || faceImages.length === 0 || !email || !phoneNumber) {
            return res.status(400).json({
                success: false,
                message: "Name, email, phone number, and an array of faceImages are required"
            });
        }

        const existing = await Face.findOne({ $or: [{ name }, { email }], isActive: true });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Employee with this name or email already exists"
            });
        }

        console.log(`🎥 Starting enrollment for ${name} with ${faceImages.length} images...`);

        const embeddings = [];
        const errors = [];

        for (let i = 0; i < faceImages.length; i++) {
            try {
                console.log(`🖼️  Processing image ${i + 1}/${faceImages.length}...`);
                const embedding = await faceEngineService.generateEmbedding(faceImages[i]);
                embeddings.push(embedding);
            } catch (err) {
                console.warn(`⚠️  Failed to process image ${i + 1}: ${err.message}`);
                errors.push(`Image ${i + 1}: ${err.message}`);
            }
        }

        if (embeddings.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Failed to detect a face in any of the provided images. Enrollment cancelled.",
                errors
            });
        }

        const employee = await Face.create({
            name,
            descriptor: embeddings[0],
            email,
            phoneNumber,
            password: password || phoneNumber,
            isActive: true,
            isVerified: false // Ensure new employees require verification
        });

        console.log(`✅ Employee saved to MongoDB with _id: ${employee._id}`);

        // ✅ FIX: Use employee._id.toString() explicitly — ensures FAISS gets the same string
        // that MongoDB uses, so lookups always match
        const employeeIdStr = employee._id.toString();
        console.log(`🧠 Syncing ${embeddings.length} embeddings to FAISS for ID: "${employeeIdStr}"`);

        await faceEngineService.addToIndexBatch(employeeIdStr, embeddings, occlusionTypes);

        console.log(`✅ FAISS sync complete for ${name}`);

        res.status(201).json({
            success: true,
            data: {
                id: employee._id,
                name: employee.name,
                processedImages: embeddings.length,
                failedImages: errors.length
            },
            message: `Employee enrolled successfully with ${embeddings.length} versions of their face.`
        });

    } catch (error) {
        console.error("❌ Enrollment Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getEnrollmentQuality = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ success: false, message: "Employee ID is required" });
        }

        const status = await faceEngineService.getEnrollmentStatus(id);

        res.status(200).json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error("❌ Enrollment Quality Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const recognizeEmployee = async (req, res) => {
    try {
        const { faceImage, cameraId, cameraType } = req.body;

        if (!faceImage) {
            return res.status(400).json({ success: false, message: "faceImage (base64) is required" });
        }

        console.log("🚀 starting multi-face recognition...");
        const response = await faceEngineService.recognize(faceImage);
        const engineResults = response.results || [];

        console.log(`📥 Engine found ${engineResults.length} faces`);

        const finalResults = await Promise.all(engineResults.map(async (result) => {
            const rawId = result.employee_id;
            const bbox = result.bbox;
            const similarity = result.similarity;
            const embedding = result.embedding;
            const faceCrop = result.face_image;

            // ── Unknown Face Handling ──
            if (!rawId) {
                console.log(`👤 [appFaceController] Unknown face detected. Similarity: ${similarity.toFixed(3)}. Embedding: ${embedding ? 'YES' : 'NO'}. Crop: ${faceCrop ? faceCrop.length : '0'} bytes`);
                // Fire and forget — log the unknown person if they have an embedding
                if (embedding) {
                    processUnknown(embedding, similarity, faceCrop)
                        .then(res => console.log(`✅ [processUnknown] SUCCESS: ${res.data?.unknownId} (${res.message})`))
                        .catch(err => console.error("❌ [processUnknown] FATAL ERROR:", err.message));
                }

                return {
                    match: false,
                    bbox,
                    similarity,
                    message: "No match above threshold",
                    isUnknown: true
                };
            }

            if (!mongoose.Types.ObjectId.isValid(rawId)) {
                return { match: false, bbox, similarity, message: `Invalid ID from FAISS: ${rawId}` };
            }

            const objectId = new mongoose.Types.ObjectId(rawId);
            const employee = await Face.findById(objectId);

            if (!employee) {
                return { match: false, bbox, similarity, message: `ID ${rawId} not found in DB` };
            }

            if (!employee.isActive) {
                return { match: false, bbox, similarity, message: `Employee ${employee.name} inactive` };
            }

            return {
                match: true,
                bbox,
                similarity,
                data: employee,
                message: `Match found: ${employee.name}`
            };
        }));

        // ── Presence tracking: update last_seen for ROOM camera detections ──
        if (cameraType === 'ROOM') {
            const matchedIds = finalResults
                .filter(r => r.match && r.data?._id)
                .map(r => r.data._id);

            // Fire-and-forget — don't block the response
            for (const empId of matchedIds) {
                updatePresenceState(empId, cameraId).catch(() => { });
            }
        }

        res.status(200).json({
            success: true,
            results: finalResults
        });

    } catch (error) {
        console.error("❌ Recognition Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Check verification status for the mobile app
 */
export const checkVerification = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ 
                success: false, 
                status: "error", 
                message: "Invalid employee ID format" 
            });
        }

        const employee = await Face.findById(id);

        if (!employee) {
            return res.status(404).json({ 
                success: false, 
                status: "rejected", 
                message: "Registration rejected or record not found" 
            });
        }

        if (employee.isVerified) {
            return res.status(200).json({
                success: true,
                status: "approved",
                message: "Employee is verified",
                data: {
                    id: employee._id,
                    name: employee.name,
                    email: employee.email,
                    isVerified: true
                }
            });
        } else {
            return res.status(200).json({
                success: true,
                status: "pending",
                message: "Registration is pending HR approval",
                data: {
                    id: employee._id,
                    name: employee.name,
                    isVerified: false
                }
            });
        }

    } catch (error) {
        console.error("❌ Verification Status Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};