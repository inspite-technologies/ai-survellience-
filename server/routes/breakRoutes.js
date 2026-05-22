import express from 'express';
import {
    addBreak,
    getAllBreaks,
    updateBreak,
    deleteBreak,
    toggleBreakStatus,
    getGlobalSettings,
    updateGlobalSettings
} from '../controllers/breakController.js';

const app = express.Router();

app.route('/').post(addBreak).get(getAllBreaks);
app.route('/settings').get(getGlobalSettings).put(updateGlobalSettings);
app.route('/:id').put(updateBreak).delete(deleteBreak).patch(toggleBreakStatus);

export default app;
