"""
Pydantic request / response schemas for the FastAPI endpoints.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


# ── Embedding ────────────────────────────────────────────────────────────

class EmbeddingRequest(BaseModel):
    image_base64: str = Field(..., description="Base64-encoded face image")


class EmbeddingResponse(BaseModel):
    embedding: List[float]


# ── Index ────────────────────────────────────────────────────────────────

class IndexAddRequest(BaseModel):
    employee_id: str = Field(..., description="Unique employee identifier")
    embedding: List[float] = Field(..., description="Normalised face embedding vector")
    occlusion_type: Optional[str] = Field("clear", description="Type of occlusion (e.g. clear, glasses, mask)")


class IndexAddBatchRequest(BaseModel):
    employee_id: str = Field(..., description="Unique employee identifier")
    embeddings: List[List[float]] = Field(..., description="List of normalised face embedding vectors")
    occlusion_types: Optional[List[str]] = Field(None, description="List of occlusion types matching the embeddings")


# ── Enrollment Status ────────────────────────────────────────────────────

class EnrollmentStatusResponse(BaseModel):
    employee_id: str
    total_embeddings: int
    poses_captured: List[str]
    has_glasses_embed: bool
    has_mask_embed: bool
    coverage_score: float


# ── Recognition ──────────────────────────────────────────────────────────

class RecognitionResult(BaseModel):
    employee_id: Optional[str] = Field(
        None, description="Matched employee ID, or null if below threshold"
    )
    employee_name: Optional[str] = Field(
        None, description="Matched employee name from DB, or null if unknown"
    )
    similarity: float = Field(..., description="Cosine similarity score")
    bbox: List[float] = Field(..., description="Bounding box [x1, y1, x2, y2]")
    embedding: Optional[List[float]] = Field(None, description="ArcFace embedding vector")
    face_image: Optional[str] = Field(None, description="Base64-encoded face crop")
    occlusion_detected: bool = Field(False, description="True if glasses or mask were detected")


class RecognizeRequest(BaseModel):
    image_base64: str = Field(..., description="Base64-encoded face image")


class RecognizeResponse(BaseModel):
    results: List[RecognitionResult] = Field(..., description="List of recognized persons in the image")
    status: str = Field("success", description="Status of the request (success, skipped, no_motion)")


# ── Person Counting ──────────────────────────────────────────────────────

class CountPeopleRequest(BaseModel):
    image_base64: str = Field(..., description="Base64-encoded room image")
    camera_id: str = Field(..., description="Unique camera identifier")


class CountPeopleResponse(BaseModel):
    camera_id: str
    person_count: int
    bounding_boxes: List[List[float]] = Field(..., description="List of [x1, y1, x2, y2] boxes")
    appearance_descriptors: List[List[float]] = Field(
        default_factory=list,
        description="HSV color histograms per person for cross-camera deduplication"
    )


# ── Tracking (DeepSORT) ─────────────────────────────────────────────────

class TrackResult(BaseModel):
    track_id: int = Field(..., description="Persistent track ID from DeepSORT")
    bbox: List[float] = Field(..., description="Bounding box [x1, y1, x2, y2]")
    is_confirmed: bool = Field(..., description="Whether the track is confirmed (seen >= n_init frames)")


class CountAndTrackResponse(BaseModel):
    camera_id: str
    person_count: int
    tracks: List[TrackResult] = Field(..., description="List of tracked persons with persistent IDs")


# ── Cross-Check (OUT Confirmation) ──────────────────────────────────────

class CrossCheckRequest(BaseModel):
    personId: str = Field(..., description="Employee/person ID to look for in indoor cameras")
    cameraIds: List[str] = Field(..., description="List of indoor camera IDs to check (e.g. ['cam-room', 'cam-room2'])")


class CrossCheckResponse(BaseModel):
    found: bool = Field(..., description="True if personId was found in any of the specified cameras")
    cameraId: Optional[str] = Field(None, description="ID of the camera where the person was found (if any)")
