"""
Person Count Service — uses YOLOv8 to detect and count people in images.
Isolated from the face recognition pipeline.

Cross-camera deduplication:
    For each detected person, we compute an HSV color histogram of their
    clothing (the middle 60% of the crop to avoid background edges).
    These descriptors are returned to the backend which uses histogram
    intersection to match the same person seen from different cameras.
"""

import base64
import logging
import cv2
import numpy as np
from ultralytics import YOLO

logger = logging.getLogger(__name__)

# Global model instance
_model: YOLO = None

# Histogram params: H(32 bins) × S(32 bins) = 1024-dim descriptor
_HIST_CHANNELS = [0, 1]       # H and S channels
_HIST_BINS = [32, 32]
_HIST_RANGES = [0, 180, 0, 256]


def init(model: YOLO):
    """Initialize the service with a pre-loaded YOLO model."""
    global _model
    _model = model
    logger.info("Person Count Service initialized with YOLO model.")


def _compute_appearance_descriptor(img, bbox):
    """
    Compute an HSV color histogram for a person crop.
    Uses the middle 60% of the crop to reduce background contamination.
    Returns a normalized 1024-dim float list, or empty list on failure.
    """
    try:
        h, w = img.shape[:2]
        x1, y1, x2, y2 = [int(v) for v in bbox]

        # Clamp to image bounds
        x1 = max(0, x1)
        y1 = max(0, y1)
        x2 = min(w, x2)
        y2 = min(h, y2)

        crop = img[y1:y2, x1:x2]
        if crop.size == 0:
            return []

        # Use middle 60% to avoid background at edges
        ch, cw = crop.shape[:2]
        margin_x = int(cw * 0.2)
        margin_y = int(ch * 0.2)
        core = crop[margin_y:ch - margin_y, margin_x:cw - margin_x]
        if core.size == 0:
            core = crop  # fallback to full crop

        hsv = cv2.cvtColor(core, cv2.COLOR_BGR2HSV)
        hist = cv2.calcHist([hsv], _HIST_CHANNELS, None, _HIST_BINS, _HIST_RANGES)
        
        # Use L1 normalization (sum = 1.0) instead of MINMAX so that
        # histogram intersection in the JS backend calculates probabilities correctly.
        cv2.normalize(hist, hist, 1.0, 0.0, cv2.NORM_L1)

        return hist.flatten().tolist()
    except Exception as e:
        logger.warning("Failed to compute appearance descriptor: %s", e)
        return []


def count_persons(image_base64: str):
    """
    Decode base64 image, resize for optimization, and run YOLOv8 person detection.
    Returns (count, bounding_boxes, appearance_descriptors).
    
    Performance Constraints:
    - Target CPU inference: < 300ms per 720p frame.
    - Image resized to max width 1024.
    - No model re-instantiation (uses global _model).
    """
    if _model is None:
        raise RuntimeError("YOLO model not initialized. Call init() first.")

    try:
        # 1. Decode base64 to OpenCV image
        encoded_data = image_base64.split(",")[-1]
        nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            logger.error("Failed to decode image from base64")
            return 0, [], []

        # 2. Resize for optimization (max width 1024)
        h, w = img.shape[:2]
        if w > 1024:
            scale = 1024 / w
            img = cv2.resize(img, (1024, int(h * scale)))
            logger.debug("Resized image from %dx%d to %dx%d", w, h, img.shape[1], img.shape[0])

        # 3. Run inference — filter for class 0 (person)
        results = _model(img, classes=[0], conf=0.20, iou=0.4, agnostic_nms=True, verbose=False)

        # 4. Extract results
        person_count = 0
        bounding_boxes = []
        appearance_descriptors = []

        if results and len(results) > 0:
            boxes = results[0].boxes
            person_count = len(boxes)
            for box in boxes:
                bbox = box.xyxy[0].tolist()
                bounding_boxes.append(bbox)
                descriptor = _compute_appearance_descriptor(img, bbox)
                appearance_descriptors.append(descriptor)

        return person_count, bounding_boxes, appearance_descriptors

    except Exception as e:
        logger.exception("Error during person counting: %s", e)
        raise
