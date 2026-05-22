import axios from "axios";

const FACE_ENGINE_URL = process.env.FACE_ENGINE_URL || "http://localhost:8000";

/**
 * Service to communicate with the Python Face Engine microservice.
 */
class FaceEngineService {
    /**
     * Extract a normalized face embedding from a base64 image.
     * @param {string} imageBase64 - Base64 encoded image string.
     * @returns {Promise<number[]>} - 512-d embedding vector.
     */
    async generateEmbedding(imageBase64) {
        try {
            const response = await axios.post(`${FACE_ENGINE_URL}/generate-embedding`, {
                image_base64: imageBase64,
            });
            return response.data.embedding;
        } catch (error) {
            console.error("❌ Face Engine Embedding Error:", error.response?.data || error.message);
            throw new Error(error.response?.data?.detail || "Failed to generate embedding");
        }
    }

    /**
     * Add a normalized embedding to the FAISS index.
     * @param {string} employeeId - Unique identifier for the employee.
     * @param {number[]} embedding - 512-d normalized vector.
     */
    async addToIndex(employeeId, embedding) {
        try {
            const response = await axios.post(`${FACE_ENGINE_URL}/index/add`, {
                employee_id: employeeId,
                embedding: embedding,
            });
            return response.data;
        } catch (error) {
            console.error("❌ Face Engine Index Add Error:", error.response?.data || error.message);
            throw new Error(error.response?.data?.detail || "Failed to add to index");
        }
    }

    /**
     * Add multiple embeddings to the FAISS index atomically.
     * @param {string} employeeId - Unique identifier for the employee.
     * @param {number[][]} embeddings - Array of 512-d normalized vectors.
     * @param {string[]} occlusionTypes - Array of occlusion types corresponding to each embedding.
     */
    async addToIndexBatch(employeeId, embeddings, occlusionTypes = null) {
        try {
            const payload = {
                employee_id: employeeId,
                embeddings: embeddings,
            };
            if (occlusionTypes) {
                payload.occlusion_types = occlusionTypes;
            }
            const response = await axios.post(`${FACE_ENGINE_URL}/index/add-batch`, payload);
            return response.data;
        } catch (error) {
            console.error("❌ Face Engine Index Batch Add Error:", error.response?.data || error.message);
            throw new Error(error.response?.data?.detail || "Failed to add batch to index");
        }
    }

    /**
     * Get the enrollment status (occlusion coverage) for an employee.
     * @param {string} employeeId - Unique identifier for the employee.
     * @returns {Promise<Object>} - Enrollment coverage metrics.
     */
    async getEnrollmentStatus(employeeId) {
        try {
            const response = await axios.get(`${FACE_ENGINE_URL}/employees/${employeeId}/enrollment-status`);
            return response.data;
        } catch (error) {
            console.error("❌ Face Engine Enrollment Status Error:", error.response?.data || error.message);
            throw new Error(error.response?.data?.detail || "Failed to get enrollment status");
        }
    }

    /**
     * Recognize a face from a base64 image using FAISS search.
     * @param {string} imageBase64 - Base64 encoded image string.
     * @returns {Promise<{employee_id: string|null, similarity: number}>}
     */
    async recognize(imageBase64) {
        try {
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, "base64");
            const blob = new Blob([buffer], { type: 'image/jpeg' });

            const formData = new FormData();
            formData.append("file", blob, "image.jpg");

            const response = await axios.post(`${FACE_ENGINE_URL}/recognize`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            return response.data;
        } catch (error) {
            console.error("❌ Face Engine Recognition Error:", error.response?.data || error.message);
            throw new Error(error.response?.data?.detail || "Recognition failed");
        }
    }

    /**
     * Count people in a room camera frame.
     * @param {string} imageBase64 - Base64 encoded image string.
     * @param {string} cameraId - Identifier for the room camera.
     * @returns {Promise<{person_count: number, bounding_boxes: number[][]}>}
     */
    async countPeople(imageBase64, cameraId) {
        try {
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, "base64");
            const blob = new Blob([buffer], { type: 'image/jpeg' });

            const formData = new FormData();
            formData.append("file", blob, "image.jpg");
            formData.append("camera_id", cameraId);

            const response = await axios.post(`${FACE_ENGINE_URL}/count-people`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            return response.data;
        } catch (error) {
            console.error("❌ Face Engine Counting Error:", error.response?.data || error.message);
            throw new Error(error.response?.data?.detail || "Counting failed");
        }
    }

    /**
     * Count people and track them with DeepSORT.
     * Used by ROOM cameras for identity continuity.
     * @param {string} imageBase64 - Base64 encoded image string.
     * @param {string} cameraId - Identifier for the room camera.
     * @returns {Promise<{camera_id: string, person_count: number, tracks: Array}>}
     */
    async countAndTrack(imageBase64, cameraId) {
        try {
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, "base64");
            const blob = new Blob([buffer], { type: 'image/jpeg' });

            const formData = new FormData();
            formData.append("file", blob, "image.jpg");
            formData.append("camera_id", cameraId);

            const response = await axios.post(`${FACE_ENGINE_URL}/count-and-track`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            return response.data;
        } catch (error) {
            console.error("❌ Face Engine Track Error:", error.response?.data || error.message);
            throw new Error(error.response?.data?.detail || "Count-and-track failed");
        }
    }
}

export default new FaceEngineService();
