"""
Face Engine — FastAPI application.

Startup sequence:
    1. Load environment variables
    2. Connect to MongoDB
    3. Load InsightFace model (RetinaFace + ArcFace)
    4. Initialise FAISS index (from disk or MongoDB)

Endpoints:
    POST /generate-embedding   — extract face embedding from image
    POST /index/add            — add embedding to FAISS + Mongo
    POST /recognize            — identify face via FAISS search

Redis is used for caching frequently accessed data:
    - Recognition results (30s TTL)
    - Enrollment status (60s TTL)
    - Invalidated on write operations
"""

import logging
import os
import cv2
import numpy as np
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form
from datetime import datetime, timezone
from collections import defaultdict, deque
from deep_sort_realtime.deepsort_tracker import DeepSort

import database
import embedding_service
import person_count_service
from redis_client import get_redis, cache_get, cache_set, cache_delete, cache_delete_pattern
from models import load_model, load_yolo_model
from schemas import (
    CountAndTrackResponse,
    CountPeopleRequest,
    CountPeopleResponse,
    CrossCheckRequest,
    CrossCheckResponse,
    EmbeddingRequest,
    EmbeddingResponse,
    IndexAddRequest,
    IndexAddBatchRequest,
    RecognitionResult,
    RecognizeRequest,
    RecognizeResponse,
    TrackResult,
    EnrollmentStatusResponse,
)

# ── Logging ──────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan (startup / shutdown) ────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run heavy initialisation once before the first request."""
    # 1. MongoDB
    database.connect()

    # 2. InsightFace models (SCRFD + FaceAnalysis)
    models = load_model()
    embedding_service.init(models)

    # 3. YOLOv8 model for person counting
    yolo_model = load_yolo_model()
    person_count_service.init(yolo_model)

    # 5. FAISS index
    embedding_service.load_or_build_index()

    try:
        total_embeddings = embedding_service._index.ntotal if embedding_service._index else 0
        logger.info("Loaded %d embeddings in FAISS index.", total_embeddings)
        
        logger.info("Warming up ONNX models...")
        dummy_frame = np.zeros((640, 640, 3), dtype=np.uint8)
        embedding_service.process_frame_two_stage(dummy_frame)
        logger.info("ONNX warmup complete.")
    except Exception as e:
        logger.warning("Failed ONNX warmup: %s", e)

    logger.info("🚀 Face Engine is ready")

    # 6. Redis
    r = get_redis()
    if r:
        logger.info("✅ Redis cache layer active")
    else:
        logger.warning("⚠️  Running without Redis cache")

    yield
    logger.info("Face Engine shutting down")


# ── Global State for Optimization ───────────────────────────────────────
frame_count = 0
prev_detect_frame = None

# ── App instance ─────────────────────────────────────────────────────────

app = FastAPI(
    title="Face Engine",
    description="Face detection, embedding extraction & recognition micro-service",
    version="1.0.0",
    lifespan=lifespan,
)


# ── Endpoints ────────────────────────────────────────────────────────────


@app.post("/generate-embedding", response_model=EmbeddingResponse)
async def generate_embedding(req: EmbeddingRequest):
    """
    Decode a base64 image, detect the face, and return the normalised
    ArcFace embedding.
    """
    emb, bbox = embedding_service.generate_embedding(req.image_base64)
    return EmbeddingResponse(embedding=emb)


@app.post("/index/add")
async def index_add(req: IndexAddRequest):
    """
    Add an embedding to the FAISS index and persist it in MongoDB.
    """
    import numpy as np

    embedding = np.array(req.embedding, dtype=np.float32)
    embedding_service.add_employee_to_index(embedding_service._index, embedding_service._id_map, req.employee_id, embedding)
    
    # Invalidate caches for this employee
    cache_delete(f"enrollment:{req.employee_id}")
    cache_delete_pattern("recog:*")  # recognition cache may change

    # Also save to mongo so rebuilds work later
    from database import get_face_vectors_collection
    from datetime import datetime, timezone
    from bson import ObjectId
    collection = get_face_vectors_collection()
    collection.insert_one({
        "employee_id": ObjectId(req.employee_id),
        "embedding": req.embedding,
        "occlusion_type": req.occlusion_type,
        "created_at": datetime.now(timezone.utc),
    })
    
    return {"status": "added"}


@app.post("/index/add-batch")
async def index_add_batch(req: IndexAddBatchRequest):
    """
    Add multiple embeddings atomically to the FAISS index and Mongo.
    """
    import numpy as np

    embeddings = np.array(req.embeddings, dtype=np.float32)
    embedding_service.add_employee_to_index(embedding_service._index, embedding_service._id_map, req.employee_id, embeddings)
    
    # Invalidate caches for this employee
    cache_delete(f"enrollment:{req.employee_id}")
    cache_delete_pattern("recog:*")

    from database import get_face_vectors_collection
    from datetime import datetime, timezone
    from bson import ObjectId
    collection = get_face_vectors_collection()
    
    occlusion_types = req.occlusion_types
    if occlusion_types is None or len(occlusion_types) != len(req.embeddings):
        occlusion_types = ["clear"] * len(req.embeddings)
        
    docs = [{
        "employee_id": ObjectId(req.employee_id),
        "embedding": emb,
        "occlusion_type": occlusion_types[i],
        "created_at": datetime.now(timezone.utc),
    } for i, emb in enumerate(req.embeddings)]
    
    if docs:
        collection.insert_many(docs)
        
    return {"status": "added"}


@app.get("/employees/{employee_id}/enrollment-status", response_model=EnrollmentStatusResponse)
async def get_enrollment_status(employee_id: str):
    """
    Returns enrollment coverage statistics for a given employee.
    Cached in Redis for 60 seconds to avoid repeated Mongo queries.
    """
    # Check Redis cache first
    cache_key = f"enrollment:{employee_id}"
    cached = cache_get(cache_key)
    if cached:
        return EnrollmentStatusResponse(**cached)

    from database import get_face_vectors_collection
    from bson import ObjectId
    collection = get_face_vectors_collection()

    try:
        cursor = collection.find({"employee_id": ObjectId(employee_id)})
        poses_captured = []
        for doc in cursor:
            poses_captured.append(doc.get("occlusion_type", "clear"))
            
        total = len(poses_captured)
        has_glasses = "glasses" in poses_captured
        has_mask = "mask" in poses_captured
        
        # Calculate coverage score
        score = 0.0
        if "clear" in poses_captured:
            score += 0.4
        if has_glasses:
            score += 0.3
        if has_mask:
            score += 0.3
            
        result = EnrollmentStatusResponse(
            employee_id=employee_id,
            total_embeddings=total,
            poses_captured=poses_captured,
            has_glasses_embed=has_glasses,
            has_mask_embed=has_mask,
            coverage_score=score
        )
        # Cache for 60 seconds
        cache_set(cache_key, result.model_dump(), ttl=60)
        return result
    except Exception as e:
        logger.error(f"Error getting enrollment status: {e}")
        return EnrollmentStatusResponse(
            employee_id=employee_id,
            total_embeddings=0,
            poses_captured=[],
            has_glasses_embed=False,
            has_mask_embed=False,
            coverage_score=0.0
        )


@app.post("/recognize", response_model=RecognizeResponse)
async def recognize(
    file: UploadFile = File(...),
    camera_id: str = Form(None)
):
    """
    Detect ALL faces in the image, generate embeddings for each,
    and search the FAISS index for matches.
    
    Optimized: Uses the new Two-Stage Recognition Pipeline.
    """
    try:
        contents = await file.read()
        import numpy as np
        img = cv2.imdecode(np.frombuffer(contents, np.uint8), cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image from blob")
    except Exception as e:
        logger.error(f"Error decoding image: {e}")
        return RecognizeResponse(results=[], status="error")

    # 3. Process Faces (Two Stage Pipeline)
    face_data = embedding_service.process_frame_two_stage(img)
    
    if not face_data:
        return RecognizeResponse(results=[], status="no_faces")

    # 4. Batch-fetch employee names from MongoDB
    matched_ids = [f.get("employee_id") for f in face_data if f.get("employee_id")]
    name_map = {}
    if matched_ids:
        try:
            from database import get_employees_collection
            from bson import ObjectId
            employees_col = get_employees_collection()
            obj_ids = []
            for eid in matched_ids:
                try:
                    obj_ids.append(ObjectId(eid))
                except Exception as ex:
                    logger.warning("❌ Invalid ObjectId in matched_ids: %s", eid)

            logger.info("🔍 Name Lookup: matched_ids=%s, count=%d", matched_ids, len(matched_ids))
            
            cursor = employees_col.find(
                {"_id": {"$in": obj_ids}},
                {"name": 1}
            )
            found_count = 0
            for doc in cursor:
                found_count += 1
                name_map[str(doc["_id"])] = doc.get("name", "Unknown")
            
            logger.info("✅ Name Lookup Result: Found %d/%d names in employees collection", found_count, len(obj_ids))
            if found_count < len(obj_ids):
                logger.warning("⚠️  Some IDs from FAISS were NOT found in employees collection: %s", 
                               [eid for eid in matched_ids if eid not in name_map])
        except Exception as e:
            logger.error("❌ Failed to fetch employee names: %s", e, exc_info=True)

    # 5. Map results
    results = []
    for face in face_data:
        emp_id = face.get("employee_id")
        results.append(RecognitionResult(
            employee_id=emp_id,
            employee_name=name_map.get(emp_id) if emp_id else None,
            similarity=float(face.get("similarity", 0.0)),
            bbox=face["bbox"],
            embedding=face["embedding"],
            face_image=face.get("face_image", ""),
            occlusion_detected=face.get("occlusion_detected", False)
        ))

    return RecognizeResponse(results=results, status="success")


@app.get("/db-check")
async def db_check():
    """Diagnostic endpoint to verify MongoDB connection and collection counts."""
    try:
        from database import get_employees_collection, get_face_vectors_collection, DB_NAME
        emp_col = get_employees_collection()
        vec_col = get_face_vectors_collection()
        
        emp_count = emp_col.count_documents({})
        vec_count = vec_col.count_documents({})
        
        # Sample one employee to check structure
        sample_emp = emp_col.find_one({}, {"name": 1, "isActive": 1})
        if sample_emp:
            sample_emp["_id"] = str(sample_emp["_id"])

        return {
            "status": "connected",
            "db_name": DB_NAME,
            "employees_count": emp_count,
            "face_vectors_count": vec_count,
            "sample_employee": sample_emp
        }
    except Exception as e:
        logger.error("DB check failed: %s", e)
        return {"status": "error", "message": str(e)}


# ── Tracking state ──
camera_trackers: dict = {}

def get_tracker_for_camera(camera_id: str) -> DeepSort:
    if camera_id not in camera_trackers:
        # max_age=3: keep tracks alive for 3 frames (15 seconds at 5s polling rate)
        # n_init=1: Confirm tracks immediately
        camera_trackers[camera_id] = DeepSort(
            max_age=3, n_init=1, nms_max_overlap=0.7,
            max_cosine_distance=0.3, nn_budget=100
        )
    return camera_trackers[camera_id]

# Per-camera history for count smoothing
camera_count_histories: dict = {}

def smooth_count(camera_id: str, raw: int) -> int:
    if camera_id not in camera_count_histories:
        # maxlen=5: Median filter over the last 5 frames (~25 seconds) to smooth out flickers
        camera_count_histories[camera_id] = deque(maxlen=5)
    
    history = camera_count_histories[camera_id]
    history.append(raw)
    return int(sorted(history)[len(history) // 2])

@app.post("/count-people")
async def count_people(
    file: UploadFile = File(...),
    camera_id: str = Form(...)
):
    """
    Detect, count and track people in the image using YOLOv8 + DeepSORT.
    """
    logger.info("👥 Person count request for camera: %s", camera_id)
    
    contents = await file.read()
    img = cv2.imdecode(np.frombuffer(contents, np.uint8), cv2.IMREAD_COLOR)

    if img is None:
        logger.error("Failed to decode image")
        return {"status": "error", "message": "Failed to decode image"}
    
    # Resize for optimization (max width 1024) - copying from original logic
    h, w = img.shape[:2]
    if w > 1024:
        scale = 1024 / w
        img = cv2.resize(img, (1024, int(h * scale)))

    # YOLO — detect persons only (class 0)
    results = person_count_service._model(img, classes=[0], conf=0.20, iou=0.4, agnostic_nms=True, verbose=False)[0]
    
    detections = []
    for box in results.boxes:
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        conf = float(box.conf[0])
        if conf > 0.5:
            # DeepSORT format: [x, y, width, height]
            detections.append(([x1, y1, x2-x1, y2-y1], conf, 'person'))
    
    tracker = get_tracker_for_camera(camera_id)
    tracks = tracker.update_tracks(detections, frame=img)
    confirmed = [t for t in tracks if t.is_confirmed()]
    
    raw_count = len(confirmed)
    smoothed_count = smooth_count(camera_id, raw_count)
    bounding_boxes = [t.to_ltrb().tolist() for t in confirmed]
    
    # Extract appearance descriptors for deduplication
    appearance_descriptors = []
    for t in confirmed:
        bbox = t.to_ltrb() # [l, t, r, b]
        descriptor = person_count_service._compute_appearance_descriptor(img, bbox)
        appearance_descriptors.append(descriptor)

    logger.info("👥 Camera %s: Found %d people (raw: %d)", camera_id, smoothed_count, raw_count)

    return {
        'camera_id': camera_id,
        'count': smoothed_count,
        'person_count': smoothed_count,
        'raw_count': raw_count,
        'track_ids': [t.track_id for t in confirmed],
        'bounding_boxes': bounding_boxes,
        'appearance_descriptors': appearance_descriptors,
        'timestamp': datetime.utcnow().isoformat()
    }


# ── Cross-Check (OUT Confirmation) ──────────────────────────────────────

MEDIAMTX_URL = os.getenv("MEDIAMTX_URL", "rtsp://localhost:8554")


@app.post("/cross-check", response_model=CrossCheckResponse)
async def cross_check(req: CrossCheckRequest):
    """
    Cross-check whether a person (by employee ID) is visible on any
    of the specified indoor cameras.

    For each camera:
      1. Grab latest frame from MediaMTX RTSP stream
      2. Run ArcFace recognition pipeline
      3. Check if any match equals the requested personId

    If a camera is offline or the frame grab fails, it is skipped.
    """
    person_id = req.personId
    camera_ids = req.cameraIds

    logger.info(
        "🔍 Cross-check request for person %s on cameras %s",
        person_id, camera_ids
    )

    for cam_id in camera_ids:
        rtsp_url = f"{MEDIAMTX_URL}/{cam_id}"

        try:
            # Grab a single frame from the RTSP stream
            cap = cv2.VideoCapture(rtsp_url)

            if not cap.isOpened():
                logger.warning(
                    "⚠️  Cross-check: camera '%s' offline (cannot open %s) — skipping",
                    cam_id, rtsp_url
                )
                continue

            ret, frame = cap.read()
            cap.release()

            if not ret or frame is None:
                logger.warning(
                    "⚠️  Cross-check: failed to grab frame from '%s' — skipping",
                    cam_id
                )
                continue

            # Run the existing two-stage recognition pipeline
            face_data = embedding_service.process_frame_two_stage(frame)

            if not face_data:
                logger.info(
                    "   Cross-check: no faces detected on camera '%s'",
                    cam_id
                )
                continue

            # Check if any recognized face matches the target person
            for face in face_data:
                matched_id = face.get("employee_id")
                similarity = face.get("similarity", 0.0)

                if matched_id and matched_id == person_id:
                    logger.info(
                        "✅ Cross-check: person %s FOUND on camera '%s' "
                        "(similarity=%.3f)",
                        person_id, cam_id, similarity
                    )
                    return CrossCheckResponse(
                        found=True,
                        cameraId=cam_id
                    )

            logger.info(
                "   Cross-check: person %s not matched on camera '%s' "
                "(%d face(s) checked)",
                person_id, cam_id, len(face_data)
            )

        except Exception as e:
            logger.error(
                "❌ Cross-check: error on camera '%s': %s — skipping",
                cam_id, e
            )
            continue

    # Person not found on any camera
    logger.info(
        "❌ Cross-check: person %s NOT found on any of %s",
        person_id, camera_ids
    )
    return CrossCheckResponse(found=False)
