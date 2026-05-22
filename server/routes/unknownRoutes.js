import express from "express";
import {
  logUnknown,
  listUnknown,
  getUnknownById,
  deleteUnknown
} from "../controllers/unknownController.js";

const router = express.Router();

router.post("/log", logUnknown);
router.get("/list", listUnknown);
router.get("/:unknownId", getUnknownById);
router.delete("/:unknownId", deleteUnknown);

export default router;
