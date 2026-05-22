import express from "express";
import {
  getLastAttendance,
  attendanceIn,
  attendanceOut,
  getAttendanceSummary,
  getTodayAttendance,
  getAttendanceHistory,
  getAttendanceLogs,
  getAttendanceStats,
  getEmployeeHomeData,
} from "../controllers/attendenceController.js";
import protect from "../middleware/userMiddleWare.js";

const router = express.Router();

router.get("/last/:userId", getLastAttendance);
router.post("/in", attendanceIn);
router.post("/out", attendanceOut);


router.get("/summary/:userId", getAttendanceSummary);
router.get("/today", getTodayAttendance);
router.get("/history/:userId", getAttendanceHistory);
router.get("/logs", getAttendanceLogs);
router.get("/stats", getAttendanceStats);

export default router;
