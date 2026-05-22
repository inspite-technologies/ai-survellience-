"""
Embedding service — face detection (SCRFD) + embedding extraction (ArcFace).

Refactored to a 2-stage pipeline:
1. Detection (Speed Layer)
2. Embedding (Accuracy Layer)
3. Recognition (FAISS Search Layer)
"""

import logging
import time
import hashlib
import cv2
import base64
import numpy as np
import os
import pickle
import faiss
from fastapi import HTTPException

from redis_client import cache_get, cache_set, cache_delete_pattern

# Missing from original: need insightface utils for norm_crop
from insightface.utils import face_align

from utils import decode_base64_image, normalize_embedding

logger = logging.getLogger(__name__)

# Module-level references
_detector = None
_arcface = None
_index = None
_id_map = {}

INDEX_PATH = '/app/data/face_index.faiss'
IDMAP_PATH = '/app/data/id_map.pkl'


def init(models) -> None:
    """Store references to the loaded SCRFD and FaceAnalysis models."""
    global _detector, _arcface
    _detector, _arcface = models


BASE_THRESHOLD = 0.40

def detect_occlusion_and_get_threshold(kps, bbox) -> float:
    if kps is None or bbox is None:
        return BASE_THRESHOLD
        
    face_h = bbox[3] - bbox[1]
    face_w = bbox[2] - bbox[0]
    
    if face_h <= 0 or face_w <= 0:
        return BASE_THRESHOLD
        
    # Check for mask: if nose-to-mouth distance is compressed
    nose_y   = kps[2][1]
    mouth_y  = (kps[3][1] + kps[4][1]) / 2
    lower_ratio = (mouth_y - nose_y) / face_h
    if lower_ratio < 0.08:
        return BASE_THRESHOLD - 0.08  # 0.34 — mask detected
    
    # Check for glasses: eye spacing distortion
    eye_dist = abs(kps[0][0] - kps[1][0])
    eye_ratio = eye_dist / face_w
    if eye_ratio < 0.25 or eye_ratio > 0.55:
        return BASE_THRESHOLD - 0.05  # 0.37 — glasses detected
    
    return BASE_THRESHOLD


def process_frame_two_stage(img_original: np.ndarray):
    """
    Two-stage recognition pipeline:
      Stage 1 (Detection): 480p downscaled image using scrfd
      Stage 2 (Embedding): 112x112 aligned face crop using arcface
      Stage 3 (FAISS search): batch search embeddings
    """
    if _detector is None or _arcface is None:
        raise RuntimeError("Embedding service not initialised — call init() first")
        
    try:
        results = []
        orig_h, orig_w = img_original.shape[:2]
        
        # ── Stage 1: Detection (Speed Layer) ──
        t_det_start = time.perf_counter()
        
        target_h = 480
        scale = target_h / orig_h
        target_w = int(orig_w * scale)
        
        # Downscale for detection (preserve aspect ratio)
        img_small = cv2.resize(img_original, (target_w, target_h))
        # run scrfd limit 5 faces or arbitrary logic if needed? We let it find everything above threshold.
        bboxes, kpss = _detector.detect(img_small)
        
        t_det_end = time.perf_counter()
        logger.info("Stage 1 (Detection) took %.3fs. Found %d faces.", t_det_end - t_det_start, len(bboxes) if bboxes is not None else 0)
        
        if bboxes is None or len(bboxes) == 0:
            return []
            
        # Limit to top 5 largest faces (same logic as before) if there are too many
        if len(bboxes) > 5:
            areas = (bboxes[:, 2] - bboxes[:, 0]) * (bboxes[:, 3] - bboxes[:, 1])
            top5_idx = np.argsort(areas)[-5:][::-1]
            bboxes = bboxes[top5_idx]
            kpss = kpss[top5_idx]

        # Scale bbox and keypoints back to original resolution
        bboxes = bboxes / scale
        if kpss is not None:
            kpss = kpss / scale
            
        # ── Stage 2: Embedding (Accuracy Layer) ──
        t_emb_start = time.perf_counter()
        embeddings = []
        face_crops = []
        thresholds = []
        
        for i in range(len(bboxes)):
            bbox = bboxes[i]
            kps = kpss[i] if kpss is not None else None
            
            thresh = detect_occlusion_and_get_threshold(kps, bbox)
            thresholds.append(thresh)
            
            # Align face crop to standard ArcFace 112x112 size
            crop = face_align.norm_crop(img_original, landmark=kps, image_size=112)
            
            # Get 512-dim embedding using arcface (specifically from buffalo_l's 'recognition' model)
            emb = _arcface.models['recognition'].get_feat(crop).flatten()
            emb = normalize_embedding(emb)
            
            embeddings.append(emb)
            face_crops.append(crop)
            
        t_emb_end = time.perf_counter()
        logger.info("Stage 2 (Embedding) took %.3fs.", t_emb_end - t_emb_start)
        
        # ── Stage 3: FAISS Search (with Redis caching) ──
        t_search_start = time.perf_counter()
        batch_matches = []
        for i, emb in enumerate(embeddings):
            thresh = thresholds[i]

            # Check Redis cache by embedding hash
            emb_hash = hashlib.md5(emb.tobytes()).hexdigest()
            cache_key = f"recog:{emb_hash}"
            cached = cache_get(cache_key)
            if cached:
                batch_matches.append((cached.get("employee_id"), cached.get("similarity", 0.0)))
                continue

            emp_id, score = faiss_search_with_voting(_index, _id_map, emb, threshold=thresh)
            batch_matches.append((emp_id, score))

            # Cache the result for only 3 seconds for successful matches to prevent duplicate FAISS searches
            # Don't cache 'None' (not found) results to allow immediate re-evaluation on next frame
            if emp_id:
                cache_set(cache_key, {"employee_id": emp_id, "similarity": float(score)}, ttl=3)

        t_search_end = time.perf_counter()
        logger.info("Stage 3 (FAISS Search) took %.3fs.", t_search_end - t_search_start)
        
        for i, (employee_id, similarity) in enumerate(batch_matches):
            bbox = bboxes[i].astype(int).tolist()[:4] # x1, y1, x2, y2
            emb = embeddings[i]
            thresh = thresholds[i]
            
            # Prepare base64 image for the response overlay
            face_crop = face_crops[i]
            if face_crop.size > 0:
                _, buffer = cv2.imencode('.jpg', face_crop)
                face_base64 = base64.b64encode(buffer).decode('utf-8')
            else:
                face_base64 = ""
                
            results.append({
                "employee_id": employee_id,
                "similarity": float(similarity),
                "score": float(similarity), # compatibility alias
                "bbox": bbox,
                "embedding": emb.astype(np.float32).tolist(),
                "face_image": f"data:image/jpeg;base64,{face_base64}" if face_base64 else "",
                "occlusion_detected": thresh < BASE_THRESHOLD
            })
            
        return results
        
    except Exception as e:
        logger.error("Error in two-stage processing: %s", e, exc_info=True)
        return []


def generate_embeddings_all(image_base64: str, detect_size=None):
    """
    Compatibility wrapper for old single-stage function.
    Now redirects directly to process_frame_two_stage.
    """
    img = decode_base64_image(image_base64)
    return process_frame_two_stage(img)


def generate_embedding(image_base64: str):
    """
    Single face pipeline (standard enrollment).
    """
    img = decode_base64_image(image_base64)
    results = process_frame_two_stage(img)

    if not results:
        raise HTTPException(status_code=400, detail="No face detected in image")

    # Pick largest for single-face compatibility
    def _area(res):
        b = res["bbox"]
        return (b[2] - b[0]) * (b[3] - b[1])

    best = max(results, key=_area)
    return best["embedding"], best["bbox"]


def faiss_search_with_voting(index, id_map, query_embedding, threshold=0.42, k=30, is_occluded=False):
    """Search FAISS index with top-k voting logic."""
    if index is None or index.ntotal == 0:
        return None, 0.0

    if is_occluded:
        threshold = max(0.35, threshold - 0.05)

    # Reshape and normalize
    q = np.array(query_embedding, dtype=np.float32).reshape(1, 512)
    faiss.normalize_L2(q)

    search_k = min(k, index.ntotal)
    distances, indices = index.search(q, search_k)
    
    vote_scores = {}
    for i in range(search_k):
        dist = float(distances[0][i])
        idx = int(indices[0][i])
        if dist >= threshold and idx in id_map:
            emp_id = id_map[idx]
            if emp_id not in vote_scores:
                vote_scores[emp_id] = []
            vote_scores[emp_id].append(dist)
            
    if not vote_scores:
        return None, 0.0
        
    best_emp = None
    best_score = -1.0
    best_max_dist = 0.0
    for emp_id, scores in vote_scores.items():
        comp = max(scores) * 0.7 + (len(scores) / 10.0) * 0.3
        if comp > best_score:
            best_score = comp
            best_emp = emp_id
            best_max_dist = max(scores)
            
    return best_emp, best_max_dist


def build_faiss_index(embeddings: np.ndarray, employee_ids: list):
    """Smart index builder."""
    n = len(embeddings)
    if n == 0:
        return faiss.IndexFlatIP(512), {}
        
    embeddings = np.ascontiguousarray(embeddings, dtype=np.float32)
    faiss.normalize_L2(embeddings)
    
    if n < 100:
        index = faiss.IndexFlatIP(512)
        index.add(embeddings)
    else:
        nlist = min(int(np.sqrt(n)) * 4, 256)
        quantizer = faiss.IndexFlatIP(512)
        index = faiss.IndexIVFFlat(quantizer, 512, nlist, faiss.METRIC_INNER_PRODUCT)
        index.nprobe = 10
        index.train(embeddings)
        index.add(embeddings)
        
    id_map = {int(i): employee_ids[i] for i in range(n)}
    return index, id_map


def save_index(index, id_map):
    """Write FAISS index and id_map to disk."""
    if index is None:
        return
    os.makedirs(os.path.dirname(INDEX_PATH), exist_ok=True)
    faiss.write_index(index, INDEX_PATH)
    with open(IDMAP_PATH, "wb") as f:
        pickle.dump(id_map, f)
    logger.debug("Saved FAISS index: %d vectors.", index.ntotal)


def load_or_build_index():
    """Load from disk if possible, else rebuild from Mongo."""
    global _index, _id_map
    
    os.makedirs(os.path.dirname(INDEX_PATH), exist_ok=True)
    
    if os.path.exists(INDEX_PATH) and os.path.exists(IDMAP_PATH):
        logger.info("Loading FAISS index from disk...")
        _index = faiss.read_index(INDEX_PATH)
        with open(IDMAP_PATH, "rb") as f:
            _id_map = pickle.load(f)
        logger.info("Loaded FAISS index: %d vectors", _index.ntotal)
    else:
        logger.info("Rebuilding FAISS index from MongoDB...")
        from database import get_face_vectors_collection
        collection = get_face_vectors_collection()
        cursor = collection.find({}, {"employee_id": 1, "embedding": 1})
        
        embeddings = []
        employee_ids = []
        for doc in cursor:
            embeddings.append(doc["embedding"])
            employee_ids.append(str(doc["employee_id"]))
            
        if embeddings:
            emb_array = np.array(embeddings, dtype=np.float32)
            _index, _id_map = build_faiss_index(emb_array, employee_ids)
            save_index(_index, _id_map)
            logger.info("Rebuilt index with %d vectors", _index.ntotal)
        else:
            _index = faiss.IndexFlatIP(512)
            _id_map = {}
            logger.info("Created empty FAISS index")


def add_employee_to_index(index, id_map, employee_id, new_embeddings):
    """Hot-add embeddings without full rebuild."""
    if index is None:
        return
        
    new_embs = np.array(new_embeddings, dtype=np.float32)
    if new_embs.ndim == 1:
        new_embs = new_embs.reshape(1, -1)
    
    faiss.normalize_L2(new_embs)
    
    start_idx = index.ntotal
    index.add(new_embs)
    
    for i in range(len(new_embs)):
        id_map[int(start_idx + i)] = employee_id
        
    save_index(index, id_map)
    logger.info("Added %d new vectors for employee %s", len(new_embs), employee_id)

