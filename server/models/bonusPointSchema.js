import mongoose from "mongoose";

const bonusSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Face',
    required: true,
  },
  transactionType: {
    type: String,
    enum: ['reward', 'deduction'],
    required: true
  },
  category: {
    type: String,
    enum: [
      'Performance Excellence',
      'Perfect Attendance',
      'Punctuality',
      'Team Collaboration',
      'Innovation & Ideas',
      'Sales Achievement',
      'Customer Service',
      'Other',
      'Pending Allocation'
    ],
    default: 'Pending Allocation'
  },
  status: {
    type: String,
    enum: ['pending_allocation', 'pending_approval', 'approved', 'rejected'],
    default: 'pending_allocation'
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Manager'
  },
  allocatedCategory: {
    type: String
  },
  date: {
    type: String, // String format YYYY-MM-DD for easy filtering as per frontend
    required: true,
    default: () => new Date().toISOString().split('T')[0]
  }
}, {
  timestamps: true
});

const BonusPoints = mongoose.model('BonusPoints', bonusSchema);
export default BonusPoints;
