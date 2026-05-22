import express from 'express';
import { login, register, updateFCMToken } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.post('/update-fcm-token', updateFCMToken);
// Fallback for post('/') if frontend sends to /api/auth/ directly
router.post('/', login);

export default router;
