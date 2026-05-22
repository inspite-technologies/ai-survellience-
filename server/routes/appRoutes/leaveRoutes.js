import { applyLeaveEmployee, fetchEmployeeHistory, fetchLeaveRequest, approveLeaveRequest, rejectLeaveRequest,applyLeaveManager,fetchManagerHistory } from "../../controllers/leaveController.js";
import express from "express";
import protect from "../../middleware/managerMiddleWare.js";
import protectUser from '../../middleware/userMiddleWare.js'

const router = express.Router();

router.post("/", protectUser, applyLeaveEmployee);
router.get("/", protectUser, fetchEmployeeHistory);
router.get("/leave-request",protect,fetchLeaveRequest)
// router.post('/approve-request',protect,approveLeaveRequest)
// router.post('/reject-request',protect,rejectLeaveRequest)

// manager api for leave

router.post("/manager-leave",protect,applyLeaveManager)
router.get("/manager-leave",protect,fetchManagerHistory)





export default router;
