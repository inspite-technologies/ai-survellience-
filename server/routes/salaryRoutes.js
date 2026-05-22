import express from 'express';
import {
    salaryChange,
    approveSalary,
    rejectSalary,
    getMonthlySalaries,
    processSalary,
    markAsPaid,
    getSalaryRequests
} from '../controllers/salaryController.js';

const router = express.Router();

router.get('/', getMonthlySalaries);
router.post('/process', processSalary);
router.put('/pay/:id', markAsPaid);

// Change request routes
router.get('/requests', getSalaryRequests);
router.post('/change', salaryChange);
router.put('/approve/:id', approveSalary);
router.put('/reject/:id', rejectSalary);

export default router;