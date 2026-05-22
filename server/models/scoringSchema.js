import mongoose from "mongoose";

const scoringSchema = new mongoose.Schema({
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Manager',
    required: true
  },
  employeeId: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Face',
    required: true
  }],
}, { timestamps: true });


const submitAllScoring = mongoose.model("submitAllScoring", scoringSchema);
export default submitAllScoring;