/**
 * redisClient.js — ioredis-based Redis utility for the Node.js backend.
 *
 * Provides:
 *   getRedis()              → ioredis instance (lazy singleton, async)
 *   setPendingOut(personId, data)   → create / overwrite pending OUT entry
 *   getPendingOut(personId)         → read a single pending OUT entry
 *   getAllPendingOuts()              → scan all pending_out:* keys
 *   resetPendingOut(personId)       → reset TTL + checkCount for re-detection
 *   deletePendingOut(personId)      → remove a pending OUT key
 *
 * Falls back gracefully if Redis is unavailable — the server never crashes.
 */

import Redis from "ioredis";

// ── Constants ───────────────────────────────────────────────────────────
const PENDING_OUT_PREFIX = "pending_out:";
const PENDING_OUT_TTL = 60; // Increased to 60s to ensure all 3 cross-checks can complete

// ── Singleton connection ────────────────────────────────────────────────
let _redis = null;
let _connectAttempted = false;

/**
 * Return a lazy-initialised ioredis connection (async).
 * Returns null if Redis is unavailable — all helpers gracefully no-op.
 */
export async function getRedis() {
    if (_redis) return _redis;
    if (_connectAttempted) return null; // Already failed once, don't retry every call

    _connectAttempted = true;
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

    try {
        const client = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            lazyConnect: true,          // Don't auto-connect in constructor
            connectTimeout: 5000,
            retryStrategy(times) {
                if (times > 5) return null; // Stop retrying after 5 attempts
                return Math.min(times * 500, 3000);
            },
        });

        // Catch error events so they don't crash the process
        client.on("error", (err) => {
            console.error(`❌ [Redis] Connection error: ${err.message}`);
        });

        await client.connect();
        console.log(`✅ [Redis] Connected: ${redisUrl}`);
        _redis = client;
        return _redis;
    } catch (err) {
        console.warn(`⚠️ [Redis] Unavailable (${err.message}) — running without Redis`);
        _redis = null;
        return null;
    }
}

// ── Pending OUT helpers ─────────────────────────────────────────────────

/**
 * Create or overwrite a pending OUT entry in Redis.
 * @param {string} personId - Employee / person MongoDB ID
 * @param {object} data - { personId, detectedAt, expiresAt, checkCount, activeCameras }
 * @returns {Promise<boolean>}
 */
export async function setPendingOut(personId, data) {
    const redis = await getRedis();
    if (!redis) return false;

    try {
        const key = `${PENDING_OUT_PREFIX}${personId}`;
        await redis.setex(key, PENDING_OUT_TTL, JSON.stringify(data));
        return true;
    } catch (err) {
        console.error(`❌ [Redis] setPendingOut failed for ${personId}: ${err.message}`);
        return false;
    }
}

/**
 * Get a single pending OUT entry.
 * @param {string} personId
 * @returns {Promise<object|null>}
 */
export async function getPendingOut(personId) {
    const redis = await getRedis();
    if (!redis) return null;

    try {
        const key = `${PENDING_OUT_PREFIX}${personId}`;
        const raw = await redis.get(key);
        return raw ? JSON.parse(raw) : null;
    } catch (err) {
        console.error(`❌ [Redis] getPendingOut failed for ${personId}: ${err.message}`);
        return null;
    }
}

/**
 * Scan for ALL pending_out:* keys and return parsed values.
 * Uses SCAN to avoid blocking Redis on large datasets.
 * @returns {Promise<object[]>} - Array of parsed pending OUT entries
 */
export async function getAllPendingOuts() {
    const redis = await getRedis();
    if (!redis) return [];

    try {
        const results = [];
        let cursor = "0";

        do {
            const [nextCursor, keys] = await redis.scan(cursor, "MATCH", `${PENDING_OUT_PREFIX}*`, "COUNT", 100);
            cursor = nextCursor;

            if (keys.length > 0) {
                // Pipeline GET for all found keys
                const pipeline = redis.pipeline();
                keys.forEach((key) => pipeline.get(key));
                const values = await pipeline.exec();

                for (const [err, raw] of values) {
                    if (!err && raw) {
                        try {
                            results.push(JSON.parse(raw));
                        } catch {
                            // skip malformed entries
                        }
                    }
                }
            }
        } while (cursor !== "0");

        return results;
    } catch (err) {
        console.error(`❌ [Redis] getAllPendingOuts failed: ${err.message}`);
        return [];
    }
}

/**
 * Reset the TTL and checkCount for a pending OUT entry.
 * Used when the person is re-detected on the OUT camera.
 * @param {string} personId
 * @returns {Promise<boolean>}
 */
export async function resetPendingOut(personId) {
    const redis = await getRedis();
    if (!redis) return false;

    try {
        const key = `${PENDING_OUT_PREFIX}${personId}`;
        const raw = await redis.get(key);
        if (!raw) return false;

        const data = JSON.parse(raw);
        data.checkCount = 0;
        data.expiresAt = new Date(Date.now() + 30 * 1000).toISOString();

        await redis.setex(key, PENDING_OUT_TTL, JSON.stringify(data));
        return true;
    } catch (err) {
        console.error(`❌ [Redis] resetPendingOut failed for ${personId}: ${err.message}`);
        return false;
    }
}

/**
 * Delete a pending OUT key (used on cancel or confirm).
 * @param {string} personId
 * @returns {Promise<boolean>}
 */
export async function deletePendingOut(personId) {
    const redis = await getRedis();
    if (!redis) return false;

    try {
        const key = `${PENDING_OUT_PREFIX}${personId}`;
        await redis.del(key);
        return true;
    } catch (err) {
        console.error(`❌ [Redis] deletePendingOut failed for ${personId}: ${err.message}`);
        return false;
    }
}
