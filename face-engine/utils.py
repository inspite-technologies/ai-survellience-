"""
Utility helpers shared across the service.
"""

import base64
import numpy as np
import cv2


def decode_base64_image(image_base64: str) -> np.ndarray:
    """
    Decode a base64-encoded image string into an OpenCV BGR numpy array.
    Supports both raw base64 and strings with 'data:image/...;base64,' prefixes.

    Raises ValueError if the data cannot be decoded.
    """
    try:
        # Debugging
        print(f"DEBUG: Received base64 string. Length: {len(image_base64)}")
        print(f"DEBUG: First 50 chars: {image_base64[:50]}")

        # Strip data URL prefix if present
        if "," in image_base64:
            print("DEBUG: Stripping data URL prefix")
            image_base64 = image_base64.split(",")[1]

        img_bytes = base64.b64decode(image_base64)
        print(f"DEBUG: Decoded bytes length: {len(img_bytes)}")
        
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if img is None:
            print("DEBUG: cv2.imdecode returned None")
            raise ValueError("cv2.imdecode returned None — invalid image data")
        
        print(f"DEBUG: Successfully decoded image. Shape: {img.shape}")
        # Check if image is mostly black (common capture issue)
        mean_val = np.mean(img)
        print(f"DEBUG: Image mean brightness: {mean_val:.2f}")
        if mean_val < 5:
            print("DEBUG: WARNING - Image is very dark or black!")
        
        return img
    except Exception as exc:
        print(f"DEBUG: Exception during decoding: {exc}")
        raise ValueError(f"Failed to decode base64 image: {exc}") from exc


def normalize_embedding(embedding: np.ndarray) -> np.ndarray:
    """L2-normalise an embedding vector (required for cosine-similarity via inner product)."""
    norm = np.linalg.norm(embedding)
    if norm == 0:
        return embedding
    return embedding / norm
