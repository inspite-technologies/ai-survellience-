import express from "express";
import roomCountController from "../controllers/roomCountController.js";

const router = express.Router();

/**
 * Route for person counting in room camera frames.
 * POST /api/room/count
 */
router.post("/count", roomCountController.countPeople);

export default router;
