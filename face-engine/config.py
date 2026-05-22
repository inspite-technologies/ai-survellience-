"""
Configuration module — loads environment variables using python-dotenv.
"""

import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME: str = os.getenv("DB_NAME", "facescan")
SIMILARITY_THRESHOLD: float = float(os.getenv("SIMILARITY_THRESHOLD", "0.4"))
MODEL_NAME: str = os.getenv("MODEL_NAME", "buffalo_l")
YOLO_MODEL_NAME: str = os.getenv("YOLO_MODEL_NAME", "yolov8s.pt")
REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")

# Paths
INDEX_DIR: str = os.path.join(os.path.dirname(__file__), "index")
FAISS_INDEX_PATH: str = os.path.join(INDEX_DIR, "faiss.index")
ID_MAP_PATH: str = os.path.join(INDEX_DIR, "id_map.json")
