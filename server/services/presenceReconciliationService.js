import cron from "node-cron";
import Attendance from "../models/attendenceSchema.js";
import PresenceState from "../models/presenceStateSchema.js";
import PresenceAnomaly from "../models/presenceAnomalySchema.js";
import DailySummary from "../models/DailySummary.js";
import { BreakManagement } from "../models/breakSchema.js";
import trackingService from "./trackingService.js";
import { sendPushNotification } from "./notificationService.js";
import Face from "../models/faceSchema.js";

/**
 * Helper: Checks if the current time is within a scheduled break.
 * Returns { boolean, breakName }
 */
export async function getActiveBreak() {
    try {
        const now = new Date();
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const currentDay = days[now.getDay()];
        const currentTimeStr = now.toTimeString().slice(0, 5); // "HH:mm"

        const activeBreaks = await BreakManagement.find({
            isActive: true,
            allowedDays: currentDay,
            startTime: { $lte: currentTimeStr },
            endTime: { $gte: currentTimeStr },
        }).lean();

        if (activeBreaks.length > 0) {
            return {
                isBreak: true,
                name: activeBreaks[0].name,
            };
        }

        return { isBreak: false, name: null };
    } catch (err) {
        console.error("❌ Error checking active break:", err);
        return { isBreak: false, name: null };
    }
}

// =========================================================
// ⚙️  Tunables — adjust for testing, restore for production
// =========================================================
const DETECTION_WINDOW_MINUTES = 2;   // Reduced for faster detection
const SUSPECT_EXIT_MINUTES = 3;      // Suspect exit still at 3 minutes
const CRON_SCHEDULE = "* * * * *";   // Every minute

// =========================================================
// 1️⃣  ExpectedInside — employees checked in but not out today
// =========================================================
export async function getExpectedInside() {
    const dateStr = new Date().toISOString().split("T")[0];

    // Get the latest attendance event per employee for today
    const latestEvents = await Attendance.aggregate([
        { $match: { date: dateStr } },
        { $sort: { createdAt: 1 } }, // Sort chronologically to get the latest in each group
        {
            $group: {
                _id: "$userId",
                latestEvent: { $last: "$event" },
                employeeName: { $last: "$employeeName" },
            },
        },
        // Keep only those whose latest event is "in" (actively inside, not on break/out)
        { $match: { latestEvent: "in" } },
    ]);

    return latestEvents.map((e) => ({
        employee_id: e._id,
        employeeName: e.employeeName,
    }));
}

// =========================================================
// 1️⃣b  getCheckoutCount — employees who have clocked out today
// =========================================================
export async function getCheckoutCount() {
    const dateStr = new Date().toISOString().split("T")[0];

    const checkedOut = await DailySummary.find({
        date: dateStr,
        currentStatus: "out",
    }).lean();

    return checkedOut.length;
}

// =========================================================
// 1️⃣c  hasEmployeeCheckedOut — check if specific employee has checkout = 0
// =========================================================
async function hasEmployeeCheckedOut(employeeId) {
    const dateStr = new Date().toISOString().split("T")[0];

    const summary = await DailySummary.findOne({
        userId: employeeId,
        date: dateStr,
    }).lean();

    // If employee has currentStatus === 'out', they legitimately clocked out
    return summary?.currentStatus === "out";
}

// =========================================================
// 2️⃣  DetectedInside — employees seen by room cameras recently
//     Now includes DeepSORT tracked employees (body tracking)
// =========================================================
async function getDetectedInside() {
    const cutoff = new Date(Date.now() - DETECTION_WINDOW_MINUTES * 60 * 1000);

    // Source 1: Face recognition — employees seen via PresenceState
    const states = await PresenceState.find({
        last_seen: { $gte: cutoff },
    });
    const faceDetected = new Set(states.map((s) => s.employee_id.toString()));

    // Source 2: Body tracking — employees with active DeepSORT tracks
    const trackDetected = trackingService.getAllTrackedEmployees();

    // Merge both sources: present if face seen OR body tracked
    const merged = new Set([...faceDetected, ...trackDetected]);

    if (trackDetected.size > 0) {
        console.log(
            `👁️ Detected inside: ${faceDetected.size} via face + ${trackDetected.size} via body tracking = ${merged.size} unique`
        );
    }

    return merged;
}

// =========================================================
// 3️⃣  Reconciliation — compare, manage timers, flag anomalies
// =========================================================
async function reconcile() {
    try {
        const expectedInside = await getExpectedInside();
        const checkoutCount = await getCheckoutCount();

        const now = new Date();

        // ── PRIMARY CHECK: Total Room Camera Headcount ──────
        // Room cameras do person COUNTING (not identification).
        // Compare total headcount vs total checked-in count.
        const RoomOccupancy = (await import("../models/RoomOccupancy.js")).default;
        const allRooms = await RoomOccupancy.find({}).lean();
        const totalCameraCount = allRooms.reduce((sum, r) => sum + (r.lastCount || 0), 0);

        console.log(
            `🔄 Reconciliation | Checked-In: ${expectedInside.length} | Camera Count: ${totalCameraCount} | Checked-Out Today: ${checkoutCount}`
        );

        // ✅ If camera count >= checked-in count → everyone is present, no fraud
        if (totalCameraCount >= expectedInside.length) {
            console.log(`✅ Camera count (${totalCameraCount}) >= Checked-in (${expectedInside.length}). All present — clearing any active flags.`);

            // Clear ALL active anomalies and missing timers (everyone's accounted for)
            const clearedAnomalies = await PresenceAnomaly.updateMany(
                { status: "ACTIVE" },
                { $set: { status: "CLEARED" } }
            );
            if (clearedAnomalies.modifiedCount > 0) {
                console.log(`🧹 Cleared ${clearedAnomalies.modifiedCount} stale anomaly(ies)`);
            }

            // Reset all missing_since timers
            await PresenceState.updateMany(
                { missing_since: { $ne: null } },
                { $set: { missing_since: null } }
            );

            return; // No fraud possible
        }

        // ──────────────────────────────────────────────────────
        // ⚠️ Camera count < Checked-in count → potential fraud
        // Someone may have left without clocking out
        // ──────────────────────────────────────────────────────
        const missingCount = expectedInside.length - totalCameraCount;
        console.log(
            `⚠️ Camera count (${totalCameraCount}) < Checked-in (${expectedInside.length}). ${missingCount} person(s) potentially left without checkout.`
        );

        // Try to identify WHO is missing using PresenceState (if face recognition is active on room cameras)
        const detectedInsideSet = await getDetectedInside();

        // Find employees not seen by cameras recently
        const missingEmployees = expectedInside.filter(
            (e) => !detectedInsideSet.has(e.employee_id.toString())
        );

        // If PresenceState has NO data (room cameras don't do face ID), 
        // all employees will appear "missing" — but we know only `missingCount` actually left.
        // In that case, we can't identify WHO specifically, so skip per-employee flagging
        // and just log the discrepancy.
        if (detectedInsideSet.size === 0 && expectedInside.length > 0) {
            console.log(
                `📹 No face-level camera data available. Camera headcount shows ${missingCount} missing person(s).`
            );

            // We know X people are missing but can't identify them by name.
            // The room count discrepancy is already tracked by roomCountController.
            // Per-employee flagging will work once face recognition runs on room cameras.
            return;
        }

        // ── Per-employee flagging (when face recognition data IS available) ──
        for (const emp of missingEmployees) {
            const empId = emp.employee_id;

            // ✅ CHECKOUT-AWARE: Skip employees who legitimately clocked out
            const hasCheckedOut = await hasEmployeeCheckedOut(empId);
            if (hasCheckedOut) {
                console.log(`✅ ${emp.employeeName} has clocked out — skipping (legitimate exit)`);
                continue;
            }

            // Employee is checked in, NOT checked out, but NOT detected by cameras → potential fraud
            console.log(`🔍 ${emp.employeeName}: Checked-in=YES, Checked-out=NO, Camera-detected=NO → Monitoring...`);

            // Upsert presence state — set missing_since if not already set
            const state = await PresenceState.findOneAndUpdate(
                { employee_id: empId },
                {
                    $setOnInsert: { last_seen: new Date(0), last_seen_camera: null },
                },
                { upsert: true, new: true }
            );

            if (!state.missing_since) {
                state.missing_since = now;
                await state.save();
                console.log(
                    `⏱️  Started fraud timer: ${emp.employeeName} (missing_since: ${now.toISOString()})`
                );
            } else {
                // Check threshold
                const missingMinutes = (now - state.missing_since) / 60000;


                if (missingMinutes >= SUSPECT_EXIT_MINUTES) {
                    // Check if an active anomaly already exists
                    const existingAnomaly = await PresenceAnomaly.findOne({
                        employee_id: empId,
                        status: "ACTIVE",
                    });

                    if (!existingAnomaly) {
                        await PresenceAnomaly.create({
                            employee_id: empId,
                            type: "SUSPECT_EXIT",
                            first_detected_at: state.missing_since,
                            confirmed_at: now,
                            status: "ACTIVE",
                        });
                        console.log(
                            `🚨 SUSPECT_EXIT flagged: ${emp.employeeName} — Gone ${Math.floor(missingMinutes)} min without checkout (FRAUDULENT)`
                        );
                    }
                } else {
                    console.log(
                        `👀 Watching: ${emp.employeeName} (${Math.floor(missingMinutes)} min / ${SUSPECT_EXIT_MINUTES} min threshold)`
                    );
                }
            }
        }

        // ── Reappeared employees — clear timers & anomalies ──
        const reappearedEmployees = expectedInside.filter((e) =>
            detectedInsideSet.has(e.employee_id.toString())
        );

        for (const emp of reappearedEmployees) {
            const empId = emp.employee_id;

            const state = await PresenceState.findOne({ employee_id: empId });
            if (state && state.missing_since) {
                state.missing_since = null;
                await state.save();
                console.log(`✅ Cleared missing timer: ${emp.employeeName}`);

                // Clear any ACTIVE anomalies (not yet actioned)
                const cleared = await PresenceAnomaly.updateMany(
                    { employee_id: empId, status: "ACTIVE" },
                    { $set: { status: "CLEARED" } }
                );

                if (cleared.modifiedCount > 0) {
                    console.log(
                        `🧹 Cleared ${cleared.modifiedCount} anomaly(ies) for ${emp.employeeName}`
                    );
                }
            }
        }
    } catch (err) {
        console.error("❌ Reconciliation error:", err.message);
    }
}

// =========================================================
// 🔌  Public API — call from server.js to start the cron
// =========================================================
export function startPresenceReconciliation() {
    console.log(
        `🟢 Presence Reconciliation started (schedule: ${CRON_SCHEDULE}, detection window: ${DETECTION_WINDOW_MINUTES}m, suspect threshold: ${SUSPECT_EXIT_MINUTES}m)`
    );

    cron.schedule(CRON_SCHEDULE, reconcile);
}

// =========================================================
// 📝  Helpers — update presence when room camera recognises
// =========================================================
export async function updatePresenceState(employeeId, cameraId) {
    try {
        const now = new Date();
        await PresenceState.findOneAndUpdate(
            { employee_id: employeeId },
            {
                $set: {
                    last_seen: now,
                    last_seen_camera: cameraId || null,
                    missing_since: null,          // reset timer on detection
                },
            },
            { upsert: true }
        );

        // Auto-Recovery: Clear any ACTIVE anomalies if employee reappears
        const cleared = await PresenceAnomaly.updateMany(
            { employee_id: employeeId, status: "ACTIVE" },
            { $set: { status: "CLEARED" } }
        );

        if (cleared.modifiedCount > 0) {
            console.log(`✅ Auto-recovered: Employee ${employeeId} reappeared. Anomaly cleared.`);
        }
    } catch (err) {
        console.error("❌ updatePresenceState error:", err.message);
    }
}

export default { startPresenceReconciliation, updatePresenceState, getExpectedInside, getCheckoutCount };
