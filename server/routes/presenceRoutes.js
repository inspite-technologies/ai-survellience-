import express from "express";
import PresenceState from "../models/presenceStateSchema.js";
import PresenceAnomaly from "../models/presenceAnomalySchema.js";
import Attendance from "../models/attendenceSchema.js";
import { getExpectedInside, getCheckoutCount, getActiveBreak } from "../services/presenceReconciliationService.js";
import RoomOccupancy from "../models/RoomOccupancy.js";
import { deduplicateRoomCounts } from "../utils/deduplication.js";

const router = express.Router();

/**
 * GET /api/presence/status
 * Returns expected-inside vs detected-inside snapshot
 */
router.get("/status", async (req, res) => {
    try {
        const dateStr = new Date().toISOString().split("T")[0];

        // Check for active break
        const activeBreak = await getActiveBreak();

        // ExpectedInside (checked in, not checked out)
        const expectedEmployees = await getExpectedInside();
        const checkoutCount = await getCheckoutCount();

        // All presence states
        const presenceStates = await PresenceState.find()
            .populate("employee_id", "name")
            .lean();

        const cutoff = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes visibility buffer
        const detectedInside = presenceStates.filter(
            (s) => new Date(s.last_seen) >= cutoff
        );

        // Room camera counts (deduplicated across cameras)
        const allRooms = await RoomOccupancy.find({}).lean();
        const totalRoomCount = deduplicateRoomCounts(allRooms);

        // Active fraud suspects
        const activeSuspects = await PresenceAnomaly.find({ status: "ACTIVE" })
            .populate("employee_id", "name")
            .lean();

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            expected_inside: {
                count: expectedEmployees.length,
                employees: expectedEmployees.map((e) => ({
                    employee_id: e.employee_id,
                    name: e.employeeName,
                })),
            },
            detected_inside: {
                count: detectedInside.length,
                employees: detectedInside.map((s) => ({
                    employee_id: s.employee_id?._id || s.employee_id,
                    name: s.employee_id?.name || "Unknown",
                    last_seen: s.last_seen,
                    last_seen_camera: s.last_seen_camera,
                })),
            },
            checkout_count: checkoutCount,
            camera_count: totalRoomCount,
            fraud_suspects: {
                count: activeSuspects.length,
                suspects: activeSuspects.map((a) => ({
                    employee_id: a.employee_id?._id || a.employee_id,
                    name: a.employee_id?.name || "Unknown",
                    missing_since: a.first_detected_at,
                    confirmed_at: a.confirmed_at,
                    missing_minutes: Math.floor(
                        (Date.now() - new Date(a.first_detected_at)) / 60000
                    ),
                })),
            },
            active_break: activeBreak,
            monitoring: presenceStates
                .filter((s) => s.missing_since)
                .map((s) => ({
                    employee_id: s.employee_id?._id || s.employee_id,
                    name: s.employee_id?.name || "Unknown",
                    missing_since: s.missing_since,
                    missing_minutes: Math.floor(
                        (Date.now() - new Date(s.missing_since)) / 60000
                    ),
                })),
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * GET /api/presence/fraud-suspects
 * Returns all employees flagged as SUSPECT_EXIT (gone without checkout)
 * Only employees who have been missing for >= 5 minutes with checkout = 0
 */
router.get("/fraud-suspects", async (req, res) => {
    try {
        const activeSuspects = await PresenceAnomaly.find({
            status: "ACTIVE",
            type: "SUSPECT_EXIT",
        })
            .populate("employee_id", "name")
            .sort({ confirmed_at: -1 })
            .lean();

        const suspects = activeSuspects.map((anomaly) => ({
            id: anomaly._id,
            employee_id: anomaly.employee_id?._id || anomaly.employee_id,
            name: anomaly.employee_id?.name || "Unknown",
            type: anomaly.type,
            first_detected_at: anomaly.first_detected_at,
            confirmed_at: anomaly.confirmed_at,
            missing_minutes: Math.floor(
                (Date.now() - new Date(anomaly.first_detected_at)) / 60000
            ),
            status: anomaly.status,
        }));

        // Also get monitoring (not yet confirmed suspects — still within 5-min window)
        const presenceStates = await PresenceState.find({
            missing_since: { $ne: null },
        })
            .populate("employee_id", "name")
            .lean();

        const monitoring = presenceStates.map((s) => ({
            employee_id: s.employee_id?._id || s.employee_id,
            name: s.employee_id?.name || "Unknown",
            missing_since: s.missing_since,
            missing_minutes: Math.floor(
                (Date.now() - new Date(s.missing_since)) / 60000
            ),
        }));

        res.json({
            success: true,
            suspect_count: suspects.length,
            monitoring_count: monitoring.length,
            suspects,
            monitoring,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * GET /api/presence/anomalies
 * Returns all presence anomalies, optionally filtered by status
 */
router.get("/anomalies", async (req, res) => {
    try {
        const { status } = req.query;
        const query = status ? { status: status.toUpperCase() } : {};

        const anomalies = await PresenceAnomaly.find(query)
            .populate("employee_id", "name")
            .sort({ createdAt: -1 })
            .limit(100);

        res.json({
            success: true,
            count: anomalies.length,
            anomalies,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * POST /api/presence/update
 * Updates an employee's presence state when seen by a room camera.
 * Used by front-end room cameras when they recognize a face.
 * Also handles face-to-track binding for DeepSORT continuity.
 */
router.post("/update", async (req, res) => {
    try {
        const { employeeId, cameraId, faceBbox, employeeName } = req.body;
        if (!employeeId) {
            return res.status(400).json({ success: false, message: "employeeId is required" });
        }

        const { updatePresenceState } = (await import("../services/presenceReconciliationService.js")).default;
        await updatePresenceState(employeeId, cameraId);

        // Face-to-track binding: if faceBbox was provided, find overlapping track
        if (faceBbox && cameraId) {
            const trackingService = (await import("../services/trackingService.js")).default;
            const latestTracks = trackingService.getLatestTracks(cameraId);

            if (latestTracks.length > 0) {
                const matchedTrackId = trackingService.findTrackForBbox(cameraId, faceBbox, latestTracks);
                if (matchedTrackId !== null) {
                    trackingService.bindTrack(cameraId, matchedTrackId, employeeId, employeeName || "Unknown");
                }
            }
        }

        // Auto Check-In: If employee is OUT, but spotted inside a room, automatically log them IN
        try {
            const Attendance = (await import("../models/attendenceSchema.js")).default;
            const now = new Date();
            const dateStr = now.toISOString().split("T")[0];
            
            const lastTodayRecord = await Attendance.findOne({
                userId: employeeId,
                date: dateStr
            }).sort({ createdAt: -1 }).lean();

            // Only trigger the IN process if they are completely missing or currently marked OUT
            if (!lastTodayRecord || lastTodayRecord.event === 'out') {
                console.log(`🚪 [Auto-IN] ${employeeName || employeeId} seen by room camera ${cameraId} while OUT. Marking IN automatically.`);
                const { attendanceIn } = await import("../controllers/attendenceController.js");
                const mockReq = { body: { userId: employeeId, employeeName: employeeName || "Unknown" } };
                const mockRes = { 
                    status: () => mockRes, 
                    json: (data) => {} 
                };
                await attendanceIn(mockReq, mockRes);
            }
        } catch (e) {
            console.error("❌ Auto Check-In from Room Error:", e.message);
        }

        res.json({ success: true, message: "Presence state updated" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

export default router;

