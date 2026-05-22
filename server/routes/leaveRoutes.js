import express from 'express';
import { applyLeaveHR, approveLeave, rejectLeave, getAllLeaves,approveLeaveRequestManager,rejectLeaveRequestManager,fetchPendingManagerLeavesForHR } from "../controllers/leaveController.js";
import protectHR from '../middleware/hrMiddleWare.js'
const app = express.Router()

app.route('/').post(applyLeaveHR).get(getAllLeaves)
app.route('/accept/:id').put(approveLeave)
app.route('/reject/:id').put(rejectLeave)

// hr want to accept manager leaves
app.post('/manager-leave/accept',protectHR,approveLeaveRequestManager)
app.post('/manager-leave/reject',protectHR,rejectLeaveRequestManager)
// fetch pending manager leaves for hr
app.get('/manager-leave/pending',protectHR,fetchPendingManagerLeavesForHR)


export default app
