"""
Database layer — MongoDB connection via pymongo.

Exposes:
    get_face_vectors_collection()  →  pymongo.collection.Collection

Document schema in face_vectors:
{
    "employee_id": str,
    "embedding":   [float, …],
    "created_at":  datetime
}

NOTE: The `employees` collection is managed by the Node backend — not here.
"""

import logging
from pymongo import MongoClient
from pymongo.collection import Collection
from config import MONGO_URI, DB_NAME

logger = logging.getLogger(__name__)

_client: MongoClient | None = None


def connect() -> None:
    """Initialise the MongoDB connection."""
    global _client
    # Log configuration (masking password)
    safe_uri = MONGO_URI.split("@")[-1] if "@" in MONGO_URI else MONGO_URI
    logger.info("🔌 Connecting to MongoDB: ...@%s", safe_uri)
    logger.info("📁 Target Database: %s", DB_NAME)
    
    _client = MongoClient(MONGO_URI)
    # Force a round-trip to verify the connection is alive
    _client.admin.command("ping")
    logger.info("✅ Connected to MongoDB")


def get_face_vectors_collection() -> Collection:
    """Return the `face_vectors` collection (lazy connect if needed)."""
    if _client is None:
        connect()
    return _client[DB_NAME]["face_vectors"]  # type: ignore[index]


def get_employees_collection() -> Collection:
    """Return the `employees` collection (lazy connect if needed)."""
    if _client is None:
        connect()
    return _client[DB_NAME]["employees"]  # type: ignore[index]
