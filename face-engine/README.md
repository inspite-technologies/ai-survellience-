# Face Engine

Standalone Python microservice for face detection, embedding extraction, and recognition.

## Tech Stack

| Component       | Library              |
| --------------- | -------------------- |
| Web framework   | FastAPI + Uvicorn    |
| Face detection  | RetinaFace (InsightFace) |
| Face embeddings | ArcFace (InsightFace)    |
| Similarity index| FAISS (IndexFlatIP)  |
| Database        | MongoDB (pymongo)    |

---

## Setup

### 1. Install dependencies

```bash
cd face-engine
pip install -r requirements.txt
```

### 2. Create `.env`

```bash
cp .env.example .env
```

Fill in:

```
MONGO_URI=mongodb://localhost:27017
DB_NAME=facescan
SIMILARITY_THRESHOLD=0.5
MODEL_NAME=buffalo_l
```

### 3. Run the service

```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

On first launch the InsightFace model (`buffalo_l`) will be downloaded automatically (~300 MB).

---

## API Endpoints

### `POST /generate-embedding`

Extract the face embedding from a base64-encoded image.

**Request:**
```json
{
  "image_base64": "<base64-string>"
}
```

**Response:**
```json
{
  "embedding": [0.023, -0.112, ...]
}
```

---

### `POST /index/add`

Add an embedding to the FAISS index and persist it in MongoDB.

**Request:**
```json
{
  "employee_id": "emp_001",
  "embedding": [0.023, -0.112, ...]
}
```

**Response:**
```json
{
  "status": "added"
}
```

---

### `POST /recognize`

Detect a face and search FAISS for the closest match.

**Request:**
```json
{
  "image_base64": "<base64-string>"
}
```

**Response:**
```json
{
  "employee_id": "emp_001",
  "similarity": 0.87
}
```

If the similarity score is below `SIMILARITY_THRESHOLD`, `employee_id` will be `null`.

---

## How It Works

### Enrollment

```
Node backend
  → POST /generate-embedding   (get embedding)
  → Node stores employee record
  → POST /index/add            (add to FAISS + Mongo)
```

### Recognition

```
Node backend
  → POST /recognize            (detect face → search FAISS)
  ← returns { employee_id, similarity }
```

### Index Rebuild

On startup the service checks for a persisted index at `index/faiss.index`.
If not found, it rebuilds from all documents in the MongoDB `face_vectors` collection.

---

## Architecture

- **Model** loaded once at startup (RetinaFace + ArcFace via InsightFace)
- **FAISS index** kept in memory; persisted to `index/` on every write
- **MongoDB** is the source of truth for embeddings
- **Mapping**: `faiss_internal_id → employee_id` stored in `index/id_map.json`

Expected latency: **<150 ms** per request for <10 k users.

---

## Future Upgrades

- [ ] Redis async queue for heavy workloads
- [ ] GPU acceleration (CUDAExecutionProvider)
- [ ] IndexIVFFlat for larger datasets
- [ ] Multi-face detection & batch enrollment
- [ ] Anti-spoofing / liveness detection
- [ ] Horizontal scaling
