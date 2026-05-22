# Ai surveillance app: attendance, scratch cards, bonus point, dashboard, notification integration

> **Target Roles:** Employee Side & Manager Side (3 HR)
> **Base URL:** `http://<SERVER_IP>/api`

---

## 🚀 Core Registration & Verification

### 1. Employee Registration
**Endpoint:** `POST /api/faces/save`  
**Description:** Used by employees to register their details and face descriptor.  
**Request Body:**
```json
{
  "name": "Employee Name",
  "email": "email@example.com",
  "phoneNumber": "1234567890",
  "password": "your_secure_password",
  "descriptor": [0.12, -0.04, ...],
  "department": "Engineering",
  "position": "Developer"
}
```

### 2. HR Approval/Rejection Decision
**Endpoint:** `POST /api/faces/decide/:id`  
**Description:** One-stop API for HR to approve or reject a pending registration.  
**Request Body:**
```json
{
  "status": "approved" 
}
// OR
{
  "status": "rejected"
}
```

---

## 📅 Attendance Module

### Employee Side (Clock In/Out)
- **Clock In:** `POST /api/attendance/in` (Body: `{ "userId": "...", "employeeName": "..." }`)
- **Clock Out:** `POST /api/attendance/out` (Body: `{ "userId": "...", "bbox": {...}, "cameraId": "..." }`)

### Manager Side (Monitoring)
- **Team Report:** `GET /api/app-attendance/` (Fetch today's present/late/absent list)
- **Present List:** `GET /api/app-attendance/present` (Real-time present list for scoring)

---

## 🎁 Rewards & Engagement

### Scratch Cards
- **My Cards:** `GET /api/scratch-cards/` (Fetch top 3 active cards for employee)
- **Redeem Card:** `PATCH /api/scratch-cards/:id/status` (Body: `{"action": "scratched"}` or `{"action": "redeemed"}`)

### Bonus Points
- **Award Points:** `POST /api/bonus/` (HR/Manager awards points for performance)
- **Point History:** `GET /api/bonus/history/:employeeId`

---

## 📊 Dashboard & Scoring

### Manager Dashboard
- **Rate Employee:** `POST /api/rating/` (Manager rates grooming, attitude, punctuality)
- **My Performance:** `GET /api/rating/manager-scores` (Manager views their own leadership scores)

### Employee Dashboard
- **View Ratings:** `GET /api/rating/employee-ratings` (Employee sees their own daily scores)

---

## 🔔 Communications & Notifications

### Help & Status Integration
- **Submit Issue:** `POST /api/help-issue/` (Employee sends ticket to HR/Manager)
- **System Updates:** Notifications are integrated into the main dashboard state via the respective `GET` endpoints for Attendance, Leave, and Rewards.

---

## 🛡️ Error Reference
- **401 Unauthorized:** Invalid or missing `token` header.
- **403 Forbidden:** Account not yet verified by HR.
- **400 Bad Request:** Missing required fields or invalid `status`.
