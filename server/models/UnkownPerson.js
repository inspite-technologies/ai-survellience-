import mongoose from "mongoose";

const unknownPersonSchema = new mongoose.Schema({
  unknownId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  displayName: {
    type: String,
    required: true
  },
  descriptor: {
    type: [Number],
    required: true
  },
  faceImagePath: {
    type: String,
    default: null
  },
  faceImageUrl: {
    type: String,
    default: null
  },
  detections: [{
    timestamp: { type: Date, default: Date.now },
    date: String,
    time: String,
    confidence: Number
  }],
  totalDetections: {
    type: Number,
    default: 1
  },
  firstSeen: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'blocked', 'identified'],
    default: 'active'
  }
}, {
  timestamps: true
});

unknownPersonSchema.index({ lastSeen: -1 });

const UnknownPerson = mongoose.model('UnknownPerson', unknownPersonSchema, 'unknown_persons');
export default UnknownPerson