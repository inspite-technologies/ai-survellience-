import express from "express";
import { 
  saveFace, 
  getFaces, 
  deleteFace, 
  updateFace, 
  viewEmployee,
  getUnverifiedFaces,
  verifyFace,
  rejectFace,
  handleRegistrationDecision
} from "../controllers/faceController.js";

const router = express.Router();

router.get('/', getFaces);
router.get('/unverified', getUnverifiedFaces);
router.post('/save', saveFace);
router.get('/:id', viewEmployee);
router.put('/:id', updateFace);
router.patch('/verify/:id', verifyFace);
router.delete('/:id', deleteFace);
router.delete('/reject/:id', rejectFace);
router.post('/decide/:id', handleRegistrationDecision);

export default router;