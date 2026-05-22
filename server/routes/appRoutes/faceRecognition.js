import express from "express";
import { enrollEmployee, recognizeEmployee, getEnrollmentQuality, checkVerification } from "../../controllers/appFaceController.js";

const router = express.Router();

/**
 * Routes for High-Accuracy Face Recognition (Python + FAISS)
 */

router.post("/enroll", enrollEmployee);
router.post("/recognize", recognizeEmployee);
router.get("/verify/:id", checkVerification);
router.get("/:id/enrollment-quality", getEnrollmentQuality);

export default router;
