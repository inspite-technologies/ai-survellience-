import express from 'express'
import {
    createBonusPoints,
    getAllBonusPoints,
    getTopBonusEmployees,
    getEmployeeBonusHistory,
    allocateBonusPoints,
    decideBonusPoints,
    deleteBonusPoints
} from "../controllers/bonusController.js";

const router = express.Router()

router.route('/').post(createBonusPoints).get(getAllBonusPoints)
router.route('/leaderboard').get(getTopBonusEmployees)
router.get('/history/:employeeId', getEmployeeBonusHistory);
router.post('/allocate', allocateBonusPoints);
router.post('/decide', decideBonusPoints);
router.delete('/:id', deleteBonusPoints);

export default router;
