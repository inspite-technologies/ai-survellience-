from insightface.app import FaceAnalysis
from config import MODEL_NAME

print(f"Loading {MODEL_NAME}")
model = FaceAnalysis(name=MODEL_NAME)
print("Models attributes:", [m for m in dir(model) if not m.startswith('__')])
if hasattr(model, 'models'):
    print("models dict:", model.models)
if hasattr(model, 'det_model'):
    print("det_model:", model.det_model)
