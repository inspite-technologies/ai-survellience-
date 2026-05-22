import { createHelpAndIssue } from "../../controllers/helpAndIssueController.js";
import express from "express";
import protectUser from "../../middleware/userMiddleWare.js";

const router = express.Router();

router.post("/", protectUser, createHelpAndIssue);

export default router;
