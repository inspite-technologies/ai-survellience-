import express from 'express';
import {
  addManager,
  getAllManagers,
  getEachManager,
  editManagerDetails,
  deleteManagerDetails,
  getManagerDashboard,
  getManagerTeamAttendance,
  getManagerPerformanceHistory,
  triggerMonthlyScoring
} from '../controllers/managerController.js'
import protect from '../middleware/managerMiddleWare.js'

const app = express.Router()

// Admin/HR endpoints
app.route('/').post(addManager).get(getAllManagers)
app.route('/:id').get(getEachManager).put(editManagerDetails).delete(deleteManagerDetails)

// Manager-specific Dashboard endpoints (Protected)
app.get('/me/dashboard', protect, getManagerDashboard)
app.get('/me/team-reports', protect, getManagerTeamAttendance)
app.get('/me/performance-history', protect, getManagerPerformanceHistory)

// Admin/System triggers
app.post('/trigger-performance-scoring', triggerMonthlyScoring)

export default app
