import express from 'express';
import { 
  registerFCMToken, 
  removeFCMToken, 
  getEmployeeNotifications, 
  getManagerNotifications, 
  getHRNotifications,
  markNotificationAsRead, 
  sendManualNotification,
  testFCMConnection
} from '../controllers/notificationController.js';
import userProtect from '../middleware/userMiddleWare.js';
import managerProtect from '../middleware/managerMiddleWare.js';
import hrProtect from '../middleware/hrMiddleWare.js';

const router = express.Router();

// Token Management
router.post('/register-token', registerFCMToken);
router.post('/remove-token', removeFCMToken);

// History - Separate endpoints as requested
router.get('/employee', userProtect, getEmployeeNotifications);
router.get('/manager', managerProtect, getManagerNotifications);
router.get('/hr', hrProtect, getHRNotifications);

// Management
router.patch('/:id/read', markNotificationAsRead);
router.post('/send', hrProtect, sendManualNotification); // For HR/Admin to send manual pushes
router.post('/test-fcm', testFCMConnection); // Public test route (or add protection if desired)

export default router;
