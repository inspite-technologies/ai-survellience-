"""
Redis client — shared connection for the face-engine.

Provides:
    get_redis()  →  redis.Redis (lazy singleton)
    cache_get(key) → dict | None
    cache_set(key, value, ttl)
    cache_delete(key)

Falls back gracefully if Redis is unavailable so the service
never crashes due to a cache miss.
"""

import json
import logging
import os
import redis

logger = logging.getLogger(__name__)

_redis_client: redis.Redis | None = None


def get_redis() -> redis.Redis | None:
    """Return a lazy-initialised Redis connection (or None if unavailable)."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    try:
        _redis_client = redis.from_url(
            redis_url,
            decode_responses=True,
            socket_connect_timeout=3,
            socket_timeout=2,
            retry_on_timeout=True,
        )
        _redis_client.ping()
        logger.info("✅ Redis connected: %s", redis_url)
    except Exception as e:
        logger.warning("⚠️  Redis unavailable (%s) — running without cache", e)
        _redis_client = None

    return _redis_client


# ── Convenience helpers ──────────────────────────────────────────────────


def cache_get(key: str) -> dict | None:
    """Get a JSON-serialised value from Redis. Returns None on miss or error."""
    r = get_redis()
    if r is None:
        return None
    try:
        raw = r.get(key)
        if raw is None:
            return None
        return json.loads(raw)
    except Exception as e:
        logger.debug("Redis GET %s failed: %s", key, e)
        return None


def cache_set(key: str, value, ttl: int = 30) -> bool:
    """Set a JSON-serialised value in Redis with TTL (seconds)."""
    r = get_redis()
    if r is None:
        return False
    try:
        r.setex(key, ttl, json.dumps(value))
        return True
    except Exception as e:
        logger.debug("Redis SET %s failed: %s", key, e)
        return False


def cache_delete(key: str) -> bool:
    """Delete a key from Redis."""
    r = get_redis()
    if r is None:
        return False
    try:
        r.delete(key)
        return True
    except Exception as e:
        logger.debug("Redis DEL %s failed: %s", key, e)
        return False


def cache_delete_pattern(pattern: str) -> int:
    """Delete all keys matching a glob pattern. Returns count deleted."""
    r = get_redis()
    if r is None:
        return 0
    try:
        keys = list(r.scan_iter(match=pattern, count=200))
        if keys:
            return r.delete(*keys)
        return 0
    except Exception as e:
        logger.debug("Redis DEL pattern %s failed: %s", pattern, e)
        return 0
