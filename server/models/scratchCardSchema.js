import mongoose from "mongoose";

const scratchCardSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Face",
    required: true,
  },

  employeeName: {
    type: String,
    required: true,
  },

  title: {
    type: String,
    required: true,
  },

  description: {
    type: String,
    required: true,
  },

  rewardType: {
    type: String,
    required: true,
  },

  rewardValue: {
    type: String, // e.g. "500 Points", "$10"
    default: "",
  },

  code: {
    type: String, // e-voucher code
    default: "",
  },

  batchId: {
    type: String,
    default: null,
  },

  validUntil: {
    type: Date,
    required: true,
  },

  images: {
    type: [String],
    default: [],
  },

  status: {
    type: String,
    enum: ["Unredeemed", "Scratched", "Redeemed", "Expired"],
    default: "Unredeemed",
  },

  maxRedemptions: {
    type: Number,
    default: 1,
  },

  redemptionCount: {
    type: Number,
    default: 0,
  },

  scratchedAt: {
    type: Date,
    default: null,
  },

  redeemedAt: {
    type: Date,
    default: null,
  },

  expiredAt: {
    type: Date,
    default: null,
  },

  createdBy: { // NEW FIELD: HR who created the card
    type: mongoose.Schema.Types.ObjectId,
    ref: "HR",
    required: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const ScratchCard = mongoose.model("ScratchCard", scratchCardSchema);
export default ScratchCard;
