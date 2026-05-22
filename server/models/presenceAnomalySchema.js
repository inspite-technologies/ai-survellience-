import mongoose from "mongoose";

const presenceAnomalySchema = new mongoose.Schema({
    employee_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Face',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['SUSPECT_EXIT'],
        default: 'SUSPECT_EXIT',
        required: true
    },
    first_detected_at: {
        type: Date,
        required: true
    },
    confirmed_at: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'CLEARED'],
        default: 'ACTIVE',
        index: true
    }
}, {
    timestamps: true
});

// Prevent duplicate active anomalies for the same employee
presenceAnomalySchema.index({ employee_id: 1, status: 1 });

const PresenceAnomaly = mongoose.model('PresenceAnomaly', presenceAnomalySchema, 'presence_anomalies');
export default PresenceAnomaly;
