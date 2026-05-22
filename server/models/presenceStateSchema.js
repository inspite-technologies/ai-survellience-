import mongoose from "mongoose";

const presenceStateSchema = new mongoose.Schema({
    employee_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Face',
        required: true,
        unique: true,
        index: true
    },
    last_seen: {
        type: Date,
        required: true,
        index: true
    },
    last_seen_camera: {
        type: String,
        default: null
    },
    missing_since: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

const PresenceState = mongoose.model('PresenceState', presenceStateSchema, 'presence_states');
export default PresenceState;
