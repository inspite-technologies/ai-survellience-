# ai-survellience-

An advanced, premium-tier full-stack AI Surveillance & Workspace Management platform featuring Face Recognition attendance, HR verification workflows, Gamified Rewards (Scratch Cards), Manager/Employee dashboards, Performance Scoring, and real-time analytics.

---

## 🚀 Key Modules & Architecture

### 🛡️ 1. Face Recognition & Verification
- **Automated Registration**: Employees register with their face descriptors (`/api/faces/save`).
- **HR Controls**: Multi-tier HR portal to approve, reject, or request changes on pending facial registration.
- **Biometric Security**: Direct matching of face descriptors against database features for spoof-proof verification.

### 📅 2. AI-Powered Attendance
- **Biometric Clock In/Out**: Deep integration with cameras and face-engines for automated presence detection.
- **Manager Insights**: Live dashboard showing real-time present, late, or absent employee reports.
- **Automatic Scoring**: Integrates attendance punctuality directly into the employee rating profiles.

### 🎁 3. Gamified Rewards & Engagement
- **Scratch Cards**: Employees earn scratch cards for consistent performance, punctuality, and peer recognition.
- **Bonus Point System**: Managers award points that can be redeemed for rewards, preserving historical audit trails.

### 📊 4. Multi-Role Dashboards & Analytics
- **Employee View**: Self-service tracking of punctuality, rating, scratch cards, and performance points.
- **Manager View**: Operational command center for rating employee grooming, attitude, and workflow compliance.
- **Leaderboards & Peer Metrics**: High-performance gamification systems.

---

## 🛠️ Technology Stack
- **Frontend**: React + Vite, Tailwind CSS, Modern UI components
- **Backend API**: Node.js, Express, Mongoose, RESTful Services
- **AI Core**: Python, OpenCV, FAISS, face-recognition engine
- **Database**: MongoDB (live persistence store)
- **Containerization & Deployment**: Docker, Docker Compose, Nginx Reverse Proxy, MediaMTX for RTSP/WebRTC streams

---

## ⚙️ Development Setup

### 1. Prerequisites
- Docker & Docker Compose
- Node.js (v18+)
- Python 3.10+

### 2. Quick Start (Docker Compose)
To launch the entire containerized suite (Frontend, Backend, Face Engine, MongoDB, MediaMTX, Nginx):
```bash
docker-compose up --build -d
```

### 3. Manual Component Launch
- **Backend API Server**:
  ```bash
  cd server && npm install && npm run dev
  ```
- **React Frontend**:
  ```bash
  cd Faceapp && npm install && npm run dev
  ```
- **Face Engine**:
  ```bash
  cd face-engine && pip install -r requirements.txt && python app.py
  ```

---

## 📚 API Reference
For complete endpoints, request formats, and response examples, refer to [ai_app_api_docs.md](ai_app_api_docs.md).
