import mongoose from "mongoose";

const leaveRequestSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Face",
    required: function() {
      // required only if managerId is not provided
      return !this.managerId;
    }
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Manager",
    required: function() {
      // required only if employeeId is not provided
      return !this.employeeId;
    }
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  title: {
    type: String,
    enum: ["sick leave", "monthly leave"],
  },
  reason: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  actionAt: {
    type: Date,
  },
});

const LeaveRequest = mongoose.model("LeaveRequest", leaveRequestSchema);
export default LeaveRequest;
