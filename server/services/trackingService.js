/**
 * Tracking Service — In-memory Track ↔ Employee binding layer.
 *
 * Manages the mapping between DeepSORT Track IDs and Employee IDs.
 * Bindings are stored in memory only — no DB writes.
 *
 * Lifecycle:
 *   1. YOLO detects person → DeepSORT assigns Track ID
 *   2. Face recognition succeeds → bind Track ID to Employee ID
 *   3. Track visible without face → presence confirmed via binding
 *   4. Track disappears for >10s → remove binding
 */

// Track expiry: 10 seconds without visibility
const TRACK_EXPIRY_MS = 210_000; // 3.5 minutes (survives 3-min polling interval)

/**
 * activeTracks structure:
 * {
 *   [cameraId]: {
 *     [trackId]: { employeeId, employeeName, lastSeen, boundAt }
 *   }
 * }
 */
const activeTracks = {};

/**
 * Latest tracks from the most recent count-and-track call per camera.
 * Used by face-to-track binding to find overlapping tracks.
 * { [cameraId]: [{ track_id, bbox, is_confirmed }, ...] }
 */
const latestTracks = {};

/**
 * Bind a Track ID to an Employee ID.
 */
function bindTrack(cameraId, trackId, employeeId, employeeName) {
    if (!activeTracks[cameraId]) activeTracks[cameraId] = {};

    activeTracks[cameraId][trackId] = {
        employeeId,
        employeeName,
        lastSeen: Date.now(),
        boundAt: Date.now(),
    };

    console.log(`🔗 Bound track ${trackId} → ${employeeName} (${employeeId}) on camera ${cameraId}`);
}

/**
 * Store the latest tracks from a count-and-track response.
 */
function setLatestTracks(cameraId, tracks) {
    latestTracks[cameraId] = tracks;
}

/**
 * Get the latest tracks for a camera.
 */
function getLatestTracks(cameraId) {
    return latestTracks[cameraId] || [];
}

/**
 * Get all active bindings for a camera.
 */
function getBindings(cameraId) {
    return activeTracks[cameraId] || {};
}

/**
 * Find which track's bbox best overlaps with a face bbox.
 * Uses Intersection over Minimum Area (IoMin) for robustness
 * since face bbox is typically much smaller than body bbox.
 *
 * @param {string} cameraId
 * @param {number[]} faceBbox - [x1, y1, x2, y2] of the face
 * @param {Array} tracks - Array of { track_id, bbox, is_confirmed }
 * @returns {number|null} - Matching track_id or null
 */
function findTrackForBbox(cameraId, faceBbox, tracks) {
    const [fx1, fy1, fx2, fy2] = faceBbox;
    const faceArea = (fx2 - fx1) * (fy2 - fy1);
    if (faceArea <= 0) return null;

    let bestTrackId = null;
    let bestScore = 0;

    for (const track of tracks) {
        const [tx1, ty1, tx2, ty2] = track.bbox;
        const trackArea = (tx2 - tx1) * (ty2 - ty1);
        if (trackArea <= 0) continue;

        // Intersection
        const ix1 = Math.max(fx1, tx1);
        const iy1 = Math.max(fy1, ty1);
        const ix2 = Math.min(fx2, tx2);
        const iy2 = Math.min(fy2, ty2);

        if (ix1 >= ix2 || iy1 >= iy2) continue; // No overlap

        const intersection = (ix2 - ix1) * (iy2 - iy1);
        // IoMin: intersection / min(faceArea, trackArea)
        // Good for face-inside-body matching
        const score = intersection / Math.min(faceArea, trackArea);

        if (score > bestScore) {
            bestScore = score;
            bestTrackId = track.track_id;
        }
    }

    if (bestTrackId === null && tracks.length > 0) {
        console.warn(`⚠️ [${cameraId}] No track matched for face. Best score: ${bestScore.toFixed(2)} (Threshold: 0.30). Face Area: ${faceArea}, Tracks: ${tracks.length}`);
    } else if (bestTrackId !== null) {
        console.log(`✅ [${cameraId}] Matched face to track ${bestTrackId} (Score: ${bestScore.toFixed(2)})`);
    }

    // Require at least 30% overlap with the smaller bbox
    return bestScore >= 0.3 ? bestTrackId : null;
}

/**
 * Update lastSeen timestamps for all visible tracks on a camera.
 */
function updateTrackTimestamps(cameraId, visibleTrackIds) {
    if (!activeTracks[cameraId]) return;

    const now = Date.now();
    for (const trackId of visibleTrackIds) {
        if (activeTracks[cameraId][trackId]) {
            activeTracks[cameraId][trackId].lastSeen = now;
        }
    }
}

/**
 * Remove tracks not seen for >TRACK_EXPIRY_MS.
 */
function cleanExpiredTracks(cameraId) {
    if (!activeTracks[cameraId]) return;

    const now = Date.now();
    const bindings = activeTracks[cameraId];

    for (const trackId of Object.keys(bindings)) {
        if (now - bindings[trackId].lastSeen > TRACK_EXPIRY_MS) {
            console.log(
                `⏰ Track ${trackId} expired for ${bindings[trackId].employeeName} on camera ${cameraId}`
            );
            delete bindings[trackId];
        }
    }
}

/**
 * Get a Set of employee IDs with active (non-expired) tracks on a camera.
 */
function getTrackedEmployees(cameraId) {
    if (!activeTracks[cameraId]) return new Set();

    const now = Date.now();
    const result = new Set();

    for (const [trackId, binding] of Object.entries(activeTracks[cameraId])) {
        if (now - binding.lastSeen <= TRACK_EXPIRY_MS) {
            result.add(binding.employeeId);
        }
    }

    return result;
}

/**
 * Get ALL tracked employees across ALL cameras.
 * Used by reconciliation to determine who is "inside".
 */
function getAllTrackedEmployees() {
    const result = new Set();
    const now = Date.now();

    for (const cameraId of Object.keys(activeTracks)) {
        for (const binding of Object.values(activeTracks[cameraId])) {
            if (now - binding.lastSeen <= TRACK_EXPIRY_MS) {
                result.add(binding.employeeId);
            }
        }
    }

    return result;
}

export default {
    bindTrack,
    getBindings,
    findTrackForBbox,
    updateTrackTimestamps,
    cleanExpiredTracks,
    getTrackedEmployees,
    getAllTrackedEmployees,
    setLatestTracks,
    getLatestTracks,
};
