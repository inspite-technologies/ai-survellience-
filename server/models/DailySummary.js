import mongoose from "mongoose";

// Daily Summary Schema
const dailySummarySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Face',
    required: true,
    index: true
  },
  employeeName: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true,
    index: true
  },
  totalMinutes: {
    type: Number,
    default: 0
  },
  totalHours: {
    type: String
  },
  sessions: [{
    timeIn: Date,
    timeOut: Date,
    duration: Number,
    breakType: String
  }],
  breaks: {
    tea: { type: Number, default: 0 },
    lunch: { type: Number, default: 0 },
    snacks: { type: Number, default: 0 }
  },
  firstIn: Date,
  lastOut: Date,
  currentStatus: {
    type: String,
    enum: ['in', 'out']
  },
  lastInTime: Date,
  lastOutTime: Date,
  isLate: {
    type: Boolean,
    default: false
  },
  lateByMinutes: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

dailySummarySchema.index({ userId: 1, date: 1 }, { unique: true });

const DailySummary = mongoose.model('DailySummary', dailySummarySchema);
export default DailySummary