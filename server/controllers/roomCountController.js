import faceEngineService from "../services/faceEngineService.js";
import trackingService from "../services/trackingService.js";
import RoomOccupancy from "../models/RoomOccupancy.js";
import Settings from "../models/settingsSchema.js";
import { getExpectedInside, getCheckoutCount, updatePresenceState } from "../services/presenceReconciliationService.js";
import { deduplicateRoomCounts } from "../utils/deduplication.js";

/**
 * Controller to handle room person counting + DeepSORT tracking.
 */
class RoomCountController {
    constructor() {
        this.countRequestCounter = 0;
    }

    /**
     * POST /api/room/count
     * Detect, count, and track people in a room camera frame.
     * Uses DeepSORT for identity continuity between frames.
     */
    countPeople = async (req, res) => {
        try {
            const { imageBase64, cameraId } = req.body;

            if (!imageBase64 || !cameraId) {
                return res.status(400).json({
                    success: false,
                    message: "imageBase64 and cameraId are required",
                });
            }

            // 1. Get count from engine
            const result = await faceEngineService.countPeople(imageBase64, cameraId);
            const currentCount = result.person_count || 0;
            const descriptors = result.appearance_descriptors || [];

            // 2. Cleanup stale occupancy entries (older than 10 mins)
            const staleCutoff = new Date(Date.now() - 10 * 60 * 1000);
            await RoomOccupancy.deleteMany({ lastSeen: { $lt: staleCutoff } });

            // 3. Update occupancy for this camera (including descriptors)
            await RoomOccupancy.findOneAndUpdate(
                { cameraId },
                { lastCount: currentCount, descriptors, lastSeen: new Date() },
                { upsert: true }
            );

            // 4. Calculate Total Room Count (deduplicated across cameras)
            const allRooms = await RoomOccupancy.find({}).lean();
            const totalRoomCount = deduplicateRoomCounts(allRooms);

            // 5. Get Expected Inside Count & Checkout Count
            const expectedEmployees = await getExpectedInside();
            const expectedCount = expectedEmployees.length;
            const checkoutCount = await getCheckoutCount();

            // 6. Check Discrepancy — Headcount Monitoring
            const isMismatch = totalRoomCount !== expectedCount;
            let shouldRecognize = isMismatch;
            let discrepancyStartSetting = await Settings.findOne({ key: "room_discrepancy_start" });

            if (isMismatch) {
                const now = new Date();
                if (!discrepancyStartSetting) {
                    discrepancyStartSetting = await Settings.create({
                        key: "room_discrepancy_start",
                        value: now.toISOString()
                    });
                    console.log(`⚠️ Headcount Discrepancy: Camera(${totalRoomCount}) < Checked-in(${expectedCount}). Monitoring started.`);
                }
            } else {
                if (discrepancyStartSetting) {
                    await Settings.deleteOne({ key: "room_discrepancy_start" });
                    console.log(`✅ Headcount reconciled: Camera(${totalRoomCount}) >= Checked-in(${expectedCount}).`);
                }
            }

            return res.status(200).json({
                success: true,
                person_count: currentCount,
                bounding_boxes: result.bounding_boxes || [],
                totalRoomCount,
                expectedCount,
                checkoutCount,
                shouldRecognize,
                fraudCheck: {
                    isMismatch,
                    checkinCount: expectedCount,
                    checkoutCount,
                    presentCount: totalRoomCount,
                }
            });
        } catch (error) {
            console.error("❌ Room Count Controller Error:", error.message);
            return res.status(500).json({
                success: false,
                message: error.message || "Failed to count people",
            });
        }
    };
}

export default new RoomCountController();
