import express from "express";
import {
  createScratchCards,
  getAllScratchCards,
  getMyScratchCards,
  updateScratchCardStatus,
  deleteScratchCard,
} from "../../controllers/scratchCardController.js";
import protect from "../../middleware/userMiddleWare.js"


const router = express.Router();


router.get("/",protect, getMyScratchCards);
router.patch("/:id/status",protect,updateScratchCardStatus);


export default router;
