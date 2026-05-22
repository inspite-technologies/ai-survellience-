import express from "express";
import { getSettings, bulkUpdateSettings, initSettings } from "../controllers/settingsController.js";

const router = express.Router();

router.get("/", getSettings);
router.put("/bulk", bulkUpdateSettings);
router.post("/init", initSettings);

export default router;
