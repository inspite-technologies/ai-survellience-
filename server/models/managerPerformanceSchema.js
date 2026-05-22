import mongoose from "mongoose";

const managerPerformanceSchema = new mongoose.Schema({
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Manager',
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  scores: {
    teamPerformance: { type: Number, default: 1 },
    attendanceRate: { type: Number, default: 1 },
    punctuality: { type: Number, default: 1 },
    taskCompletion: { type: Number, default: 1 },
    teamSatisfaction: { type: Number, default: 1 },
    leadership: { type: Number, default: 1 },
    communication: { type: Number, default: 1 },
    problemSolving: { type: Number, default: 1 }
  },
  overallScore: {
    type: Number,
    default: 1
  },
  notes: {
    type: String,
    default: ""
  },
  evaluatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Ensure unique scoring per manager per month/year
managerPerformanceSchema.index({ managerId: 1, month: 1, year: 1 }, { unique: true });

const ManagerPerformance = mongoose.model("ManagerPerformance", managerPerformanceSchema);
export default ManagerPerformance;
