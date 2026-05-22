import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const Schema = mongoose.Schema;

/**
 * @typedef {Object} ScoringMetrics
 * @property {number} teamPerformance
 * @property {number} attendanceRate
 * @property {number} punctuality
 * @property {number} taskCompletion
 * @property {number} teamSatisfaction
 * @property {number} leadership
 * @property {number} communication
 * @property {number} problemSolving
 */

/**
 * Manager Schema for storing manager profiles and performance metrics
 */
const managerSchema = new Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },
  branch: {
    type: String,
    default: ""
  },
  joinDate: {
    type: Date,
    required: true
  },
  annualSalary: {
    type: String,
    required: true
  },
  /** @type {ScoringMetrics} */
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
  /** Average score calculated from individual metrics */
  overallScore: {
    type: Number,
    default: 1
  },
  /** Timestamp of the last performance evaluation */
  lastEvaluated: {
    type: Date,
    default: Date.now
  },
  /** Manager evaluation notes/feedback */
  notes: {
    type: String,
    default: ""
  },
  /** List of employees assigned to this manager */
  employees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Face"
  }],
  fcmTokens: [
    {
      token: { type: String, required: true },
      deviceType: { type: String, enum: ["android", "ios", "web"], default: "web" },
      lastUsed: { type: Date, default: Date.now },
    },
  ],
  fcmToken: { type: String, default: null },
}, { timestamps: true });

/** Pre-save hook to hash password */
managerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/** Compare entered password with hashed password */
managerSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Manager = mongoose.model("Manager", managerSchema);
export default Manager;
