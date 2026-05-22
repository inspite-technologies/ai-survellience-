# FaceScan API Reference (Simplified)

> **Base URL:** `http://<SERVER_IP>/api`
> **Auth Header:** `token: <JWT_TOKEN>`

---

## 1. Web Dashboard APIs

### Auth & Employees
- **Login:** `POST /api/auth/login` (Body: email, password)
- **Register HR:** `POST /api/auth/register` (Body: name, email, password)
- **List Employees:** `GET /api/faces/`
- **Register Employee:** `POST /api/faces/save` (Body: name, descriptor, email, phoneNumber, password, shiftTime, etc.)
- **Approve/Reject Registration:** `POST /api/faces/decide/:id` (Body: `{"status": "approved"}` or `{"status": "rejected"}`)
- **List Verified:** `GET /api/faces/`
- **List Unverified:** `GET /api/faces/unverified`

### Attendance
- **Last Event:** `GET /api/attendance/last/:userId`
- **Clock In:** `POST /api/attendance/in` (Body: userId, employeeName)
- **Clock Out:** `POST /api/attendance/out` (Body: userId, bbox, cameraId)
- **Daily Summary:** `GET /api/attendance/summary/:userId?date=YYYY-MM-DD`
- **Status Today:** `GET /api/attendance/today?date=YYYY-MM-DD`

### HR Management
- **Apply Leave:** `POST /api/leave/`
- **List Leaves:** `GET /api/leave/`
- **Approve Leave:** `PUT /api/leave/accept/:id`
- **Reject Leave:** `PUT /api/leave/reject/:id`
- **Award Bonus:** `POST /api/bonus/`
- **Process Salary:** `POST /api/salary/process`
- **Create Shift:** `POST /api/shifts/`
- **Assign Shift:** `PUT /api/shifts/:id/assign`

---

## 2. Mobile App (Flutter) APIs

### App Attendance
- **Team Report:** `GET /api/app-attendance/` [Manager]
- **Present List:** `GET /api/app-attendance/present` [Manager]

### App Leave
- **Apply Leave:** `POST /api/app-leave/` [Employee]
- **My History:** `GET /api/app-leave/` [Employee]
- **Pending Requests:** `GET /api/app-leave/leave-request` [Manager]
- **Approve/Reject:** `POST /api/app-leave/approve-request` or `reject-request` [Manager]

### Face Recognition (FAISS)
- **Enroll Face:** `POST /api/app-faces/enroll` (Body: name, email, faceImages[], occlusionTypes[])
- **Recognize:** `POST /api/app-faces/recognize` (Body: faceImage, cameraId, cameraType)

### Other Features
- **Scratch Cards:** `GET /api/scratch-cards/` (Body: action: scratched/redeemed)
- **Help Ticket:** `POST /api/help-issue/`
- **Rate Employee:** `POST /api/rating/` [Manager]
- **My Ratings:** `GET /api/rating/employee-ratings` [Employee]

---

## Error Codes
- **200/201:** Success
- **400:** Validation Error
- **401:** Unauthorized (Invalid Token)
- **403:** Pending Verification
- **500:** Server Error
