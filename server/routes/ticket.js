import { fetchHelpAndIssues } from "../controllers/helpAndIssueController.js";

import express from "express";
import protectHR from "../middleware/hrMiddleWare.js";

const router = express.Router();

router.get("/", protectHR, fetchHelpAndIssues);

export default router;
