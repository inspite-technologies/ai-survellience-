/**
 * outConfirmationService.js — Background job that runs every 10 seconds.
 *
 * Workflow:
 *   1. Fetch all pending_out:* keys from Redis
 *   2. For each pending person:
 *      - Increment checkCount
 *      - Call AI Engine POST /cross-check with indoor camera IDs
 *      - If person found indoors → cancel OUT (delete Redis key)
 *      - If checkCount >= 3 and NOT found → confirm OUT in MongoDB
 *   3. Clean up Redis key after confirmation or cancellation
 *
 * Starts automatically when the backend server boots.
 */

import axios from "axios";
import {
    getAllPendingOuts,
    setPendingOut,
    deletePendingOut,
    resetPendingOut,
} from "../utils/redisClient.js";
import { confirmAttendanceOut } from "../controllers/attendenceController.js";
import PresenceState from "../models/presenceStateSchema.js";

// ── Configuration ───────────────────────────────────────────────────────
const CHECK_INTERVAL_MS = 10_000; // 10 seconds
const MAX_CHECK_COUNT = 3;        // Confirm OUT after 3 failed cross-checks
const FACE_ENGINE_URL = process.env.FACE_ENGINE_URL || "http://localhost:8000";

// Indoor cameras to cross-check against (from MediaMTX config)
const INDOOR_CAMERA_IDS = ["cam-room", "cam-room2"];

let _intervalHandle = null;
let _isProcessing = false; // Lock to prevent overlapping interval executions

// ── Main tick ───────────────────────────────────────────────────────────

/**
 * Single tick of the confirmation loop.
 * Processes all pending OUT entries in Redis.
 */
async function processOutConfirmations() {
    if (_isProcessing) return;
    _isProcessing = true;

    try {
        const pendingOuts = await getAllPendingOuts();

        if (pendingOuts.length === 0) return;

        console.log(
            `🔍 [OUT Confirm] Processing ${pendingOuts.length} pending OUT(s)...`
        );

        for (const entry of pendingOuts) {
            const { personId, employeeName } = entry;

            if (!personId) continue;

            // 1. FAST PATH: Check PresenceState (Indoor Cameras)
            // If seen indoors in the last 15 seconds, they are definitely still inside.
            try {
                const presence = await PresenceState.findOne({ employee_id: personId }).lean();
                const now = Date.now();
                const lastSeen = presence ? new Date(presence.last_seen).getTime() : 0;

                if (now - lastSeen < 5000) {
                    console.log(`⏱️ [OUT Confirm] ${employeeName} seen in ${presence.last_seen_camera || 'unknown'} recently. Resetting 30s OUT buffer.`);
                    await resetPendingOut(personId);
                    continue;
                }
            } catch (err) {
                console.error(`⚠️ [OUT Confirm] Presence check failed for ${employeeName}:`, err.message);
            }

            // Increment check count
            entry.checkCount = (entry.checkCount || 0) + 1;

            try {
                // ── Cross-check with AI Engine ──
                const crossCheckResult = await callCrossCheck(personId, INDOOR_CAMERA_IDS);

                if (crossCheckResult.found) {
                    // Person found indoors → reset the OUT timer to 30s
                    await resetPendingOut(personId);
                    console.log(
                        `⏱️ [OUT Confirm] OUT BUFFER RESET for ${employeeName} (${personId}) — ` +
                        `found on camera "${crossCheckResult.cameraId}" at check #${entry.checkCount}`
                    );
                    continue;
                }

                // Person NOT found indoors
                if (entry.checkCount >= MAX_CHECK_COUNT) {
                    // 3 checks done, person not found → confirm OUT
                    console.log(
                        `✅ [OUT Confirm] 3/3 checks complete — confirming OUT for ${employeeName} (${personId})`
                    );

                    const result = await confirmAttendanceOut(personId, employeeName);
                    await deletePendingOut(personId);

                    if (result.success) {
                        console.log(
                            `✅ [OUT Confirm] OUT logged to MongoDB for ${employeeName} (${personId})`
                        );
                    } else {
                        console.warn(
                            `⚠️ [OUT Confirm] MongoDB log failed for ${employeeName}: ${result.message}`
                        );
                    }
                } else {
                    // Still has checks remaining — update Redis with incremented checkCount
                    await setPendingOut(personId, entry);
                    console.log(
                        `🔄 [OUT Confirm] Check ${entry.checkCount}/${MAX_CHECK_COUNT} for ${employeeName} (${personId}) — not found indoors, will re-check`
                    );
                }
            } catch (err) {
                console.error(
                    `❌ [OUT Confirm] Error processing ${employeeName} (${personId}): ${err.message}`
                );
                // Don't delete the key on error — let it retry next tick or expire via TTL
            }
        }
    } catch (err) {
        console.error(`❌ [OUT Confirm] Tick error: ${err.message}`);
    } finally {
        _isProcessing = false;
    }
}

// ── AI Engine cross-check call ──────────────────────────────────────────

/**
 * Call the AI Engine's /cross-check endpoint.
 * @param {string} personId - Employee/person ID to look for
 * @param {string[]} cameraIds - List of indoor camera IDs to check
 * @returns {Promise<{found: boolean, cameraId?: string}>}
 */
async function callCrossCheck(personId, cameraIds) {
    try {
        const response = await axios.post(
            `${FACE_ENGINE_URL}/cross-check`,
            {
                personId,
                cameraIds,
            },
            {
                timeout: 15_000, // 15s timeout (frame grabs + recognition can be slow)
            }
        );

        return {
            found: response.data.found || false,
            cameraId: response.data.cameraId || null,
        };
    } catch (err) {
        // If cross-check fails entirely, treat as "not found" to avoid blocking forever
        console.warn(
            `⚠️ [Cross-Check] Failed for ${personId}: ${err.message} — treating as not found`
        );
        return { found: false };
    }
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Start the OUT confirmation background job.
 * Should be called once at server startup.
 */
export function startOutConfirmation() {
    if (_intervalHandle) {
        console.warn("⚠️ [OUT Confirm] Service already running");
        return;
    }

    _intervalHandle = setInterval(processOutConfirmations, CHECK_INTERVAL_MS);

    console.log(
        `🚀 [OUT Confirm] Background service started — checking every ${CHECK_INTERVAL_MS / 1000}s`
    );
}

/**
 * Stop the OUT confirmation background job.
 * Useful for graceful shutdown.
 */
export function stopOutConfirmation() {
    if (_intervalHandle) {
        clearInterval(_intervalHandle);
        _intervalHandle = null;
        console.log("🛑 [OUT Confirm] Background service stopped");
    }
}
