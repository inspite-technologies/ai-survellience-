import mongoose from "mongoose";

var Schema = mongoose.Schema
const breakSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
      default: "☕",
    },
    color: {
      type: String,
      default: "#1e7b4e",
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
    },
    maxEmployeesAtOnce: {
      type: Number,
      default: 0,
      min: 0,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
    },
    allowedDays: {
      type: [String],
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
  }
);

const breakGlobalSettingsSchema = new Schema({
  autoDeductBreakTime: { type: Boolean, default: true },
  allowFlexibleBreaks: { type: Boolean, default: false },
  requireApproval: { type: Boolean, default: false },
  sendBreakReminders: { type: Boolean, default: true },
  trackBreakLocation: { type: Boolean, default: false },
  allowBreakExtension: { type: Boolean, default: false },
  maxBreakExtensionMinutes: { type: Number, default: 5 },
  penaltyForOvertime: { type: Boolean, default: false },
  notifyManagerOnOvertime: { type: Boolean, default: true }
}, { timestamps: true });

const BreakManagement = mongoose.model("BreakManagement", breakSchema);
const BreakSettings = mongoose.model("BreakSettings", breakGlobalSettingsSchema);

export { BreakManagement, BreakSettings };