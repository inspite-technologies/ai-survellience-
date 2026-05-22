import express from "express";
import { createTeam, getTeam } from "../../controllers/teamController.js";

const router = express.Router();

router.post("/", createTeam);
router.get("/", getTeam);


export default router;