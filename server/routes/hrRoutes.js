import express from 'express';
import { HRSignup, HRLogin, getCurrentHR } from '../controllers/hrController.js';
const app = express.Router();

app.route('/').post(HRSignup)
app.route('/login').post(HRLogin)
app.route('/:id').get(getCurrentHR)

export default app