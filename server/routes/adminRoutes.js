import express from 'express';
import { adminSignup,adminLogin } from '../controllers/adminController.js';
// import protect from '../middleWare/adminMiddleWare.js'
const app = express.Router()

app.route('/').post(adminSignup)
app.route('/login').post(adminLogin)

export default app