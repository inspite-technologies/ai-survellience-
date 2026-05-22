import express from 'express';
import { createShift, assignEmployeesToShift, getAllShifts, updateShifts, deleteShift, getShiftById } from "../controllers/shiftController.js";

const app = express.Router()

app.route('/').post(createShift).get(getAllShifts)
app.route('/:id').get(getShiftById).put(updateShifts).delete(deleteShift)
app.route('/:id/assign').put(assignEmployeesToShift)


export default app