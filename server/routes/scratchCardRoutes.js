import express from 'express';
import {
    createScratchCards,
    getAllScratchCards,
    deleteScratchCard,
    getEmployeeCards,
    getRedeemedCards,
    adminUpdateScratchCard
} from '../controllers/scratchCardController.js';
import hrProtect from '../middleware/hrMiddleWare.js'
import upload from '../config/multer.js'

const router = express.Router();

router.route('/')
  .post(hrProtect, upload.any(), createScratchCards) // Support multi-field image mapping
  .get(hrProtect,getAllScratchCards);
router.get("/redeemed", hrProtect, getRedeemedCards);
router.get("/employee/:employeeId", hrProtect, getEmployeeCards);
router.route('/:id')
    .put(hrProtect, upload.array("images", 1), adminUpdateScratchCard)
    .delete(hrProtect, deleteScratchCard);
export default router;
