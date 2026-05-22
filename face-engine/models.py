"""
Model initialization — loads InsightFace FaceAnalysis (RetinaFace + ArcFace)
once at import / startup time.

TODO: GPU acceleration — switch providers to CUDAExecutionProvider when available.
"""

import logging
import onnxruntime as ort
from insightface.app import FaceAnalysis
from insightface.model_zoo import model_zoo
from ultralytics import YOLO
from config import MODEL_NAME

logger = logging.getLogger(__name__)


def get_optimized_ort_session():
    """
    Returns an optimized ONNX session options and providers configuration.
    """
    session_options = ort.SessionOptions()
    session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    session_options.execution_mode = ort.ExecutionMode.ORT_PARALLEL
    session_options.intra_op_num_threads = 4
    session_options.inter_op_num_threads = 2

    providers = [
        (
            "CPUExecutionProvider",
            {
                "arena_extend_strategy": "kSameAsRequested",
                "cpu_memory_arena_cfg": "max_mem:1073741824",
            },
        )
    ]
    return session_options, providers


def load_model():
    """
    Initialise and return the InsightFace models:
    - SCRFD detector
    - Face embedding model (from FaceAnalysis)
    """
    logger.info("Loading InsightFace models (SCRFD + %s) …", MODEL_NAME)

    session_options, providers = get_optimized_ort_session()

    model = FaceAnalysis(
        name=MODEL_NAME,
        providers=providers,
    )
    
    model.prepare(ctx_id=0, det_size=(640, 640))
    logger.info("Models loaded and ready.")
    
    # Extract the detector directly from the initialized FaceAnalysis pipeline
    scrfd_detector = getattr(model, 'det_model', model.models.get('detection'))
    if scrfd_detector is None:
        logger.warning("Detector not found in FaceAnalysis models. Proceeding anyway, but detection might fail.")
    
    # Return both so embedding_service can use the two-stage pipeline
    return scrfd_detector, model


def load_yolo_model() -> YOLO:
    """
    Initialise and return the YOLOv8 model for person counting.
    Loads yolov8n.pt (Nano) for CPU-optimized inference.
    """
    from config import YOLO_MODEL_NAME
    logger.info("Loading YOLOv8 model: %s …", YOLO_MODEL_NAME)
    model = YOLO(YOLO_MODEL_NAME)
    logger.info("YOLOv8 model loaded and ready.")
    return model
