/**
 * Cross-Camera Person Deduplication
 *
 * Uses HSV color histogram intersection to identify the same person
 * seen from different cameras. Two histograms with a high intersection
 * score (>= threshold) are considered the same person.
 */

const MATCH_THRESHOLD = 0.70; // Increased from 0.55 to prevent over-matching different people

/**
 * Histogram intersection: sum of element-wise minimums.
 * Both histograms must be normalized to [0,1] by the face-engine.
 * Result is in [0, 1] — 1.0 = identical, 0.0 = no overlap.
 */
function histogramIntersection(a, b) {
    if (!a || !b || a.length === 0 || b.length === 0) return 0;
    if (a.length !== b.length) return 0;

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += Math.min(a[i], b[i]);
    }
    return sum;
}

/**
 * Deduplicate person counts across all room cameras.
 *
 * Algorithm:
 *   1. Collect all person descriptors from all cameras.
 *   2. Greedily match descriptors across different cameras using
 *      histogram intersection.
 *   3. Each match reduces the total count by 1 (same person, two cameras).
 *   4. Persons without descriptors are always counted as unique.
 *
 * @param {Array} allRooms - Array of { cameraId, lastCount, descriptors: number[][] }
 * @returns {number} Deduplicated total person count
 */
function deduplicateRoomCounts(allRooms) {
    if (!allRooms || allRooms.length === 0) return 0;
    if (allRooms.length === 1) return allRooms[0].lastCount || 0;

    // Flatten all persons with their camera source
    const allPersons = [];
    for (const room of allRooms) {
        const descriptors = room.descriptors || [];
        const count = room.lastCount || 0;

        for (let i = 0; i < count; i++) {
            allPersons.push({
                cameraId: room.cameraId,
                descriptor: descriptors[i] || null, // may not have descriptor
            });
        }
    }

    // Track which persons have been matched as duplicates
    const matched = new Set();
    let duplicates = 0;

    // Compare persons across different cameras
    for (let i = 0; i < allPersons.length; i++) {
        if (matched.has(i)) continue;
        if (!allPersons[i].descriptor || allPersons[i].descriptor.length === 0) continue;

        for (let j = i + 1; j < allPersons.length; j++) {
            if (matched.has(j)) continue;
            if (!allPersons[j].descriptor || allPersons[j].descriptor.length === 0) continue;

            // Only compare across different cameras
            if (allPersons[i].cameraId === allPersons[j].cameraId) continue;

            const score = histogramIntersection(allPersons[i].descriptor, allPersons[j].descriptor);
            if (score >= MATCH_THRESHOLD) {
                matched.add(j); // Mark j as a duplicate of i
                duplicates++;
                console.log(
                    `🔗 Dedup match: cam(${allPersons[i].cameraId})#${i} ↔ cam(${allPersons[j].cameraId})#${j} (score: ${score.toFixed(3)})`
                );
                break; // Each person from cam i matches at most one from cam j
            }
        }
    }

    const rawTotal = allPersons.length;
    const uniqueTotal = rawTotal - duplicates;

    console.log(
        `📊 Room Dedup: raw=${rawTotal}, duplicates=${duplicates}, unique=${uniqueTotal} (${allRooms.length} cameras)`
    );

    return uniqueTotal;
}

export { deduplicateRoomCounts, histogramIntersection };
