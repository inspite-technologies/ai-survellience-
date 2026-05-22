import mongoose from "mongoose";

const roomOccupancySchema = new mongoose.Schema({
    cameraId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    lastCount: {
        type: Number,
        default: 0
    },
    descriptors: {
        type: [[Number]],
        default: []
    },
    lastSeen: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const RoomOccupancy = mongoose.model('RoomOccupancy', roomOccupancySchema, 'room_occupancy');

export default RoomOccupancy;
