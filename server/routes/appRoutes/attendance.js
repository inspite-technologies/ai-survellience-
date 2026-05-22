import express from "express";
import { getAppAttendance, getPresentEmployees } from "../../controllers/appAttendanceController.js";
import { getMonthlyAttendanceHistory, getEmployeeHomeData } from "../../controllers/attendenceController.js";
import protect from "../../middleware/managerMiddleWare.js";
import employeeProtect from "../../middleware/userMiddleWare.js";

const router = express.Router();

router.get("/", protect, getAppAttendance);
router.get("/present", protect, getPresentEmployees);
router.get("/employee", employeeProtect, getMonthlyAttendanceHistory);
router.get("/home", employeeProtect, getEmployeeHomeData);

export default router;
