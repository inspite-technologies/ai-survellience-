import mongoose from "mongoose";

var Schema = mongoose.Schema;
var leaveSchema = new Schema({

  // Applicant Type: 'employee' or 'hr'
  applicantType: {
    type: String,
    enum: ['employee', 'hr'],
    required: true,
    default: 'employee'
  },

  // For employee leave applications
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Face',
    required: function () {
      return this.applicantType === 'employee';
    }
  },

  // For HR self-leave applications
  hrId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HR',
    required: function () {
      return this.applicantType === 'hr';
    }
  },

  // Store applicant name for easier display
  applicantName: {
    type: String,
    required: false // Populated by controller
  },

  leaveType: {
    type: String,
    enum: [
      'sick',
      'casual',
      'annual',
      'maternity',
      'paternity',
      'unpaid',
      'compensatory',
      'emergency',
      'half',
      'Sick Leave (12 days/year)',
      'Casual Leave (10 days/year)',
      'Annual Leave (20 days/year)',
      'Maternity Leave (90 days/year)',
      'Paternity Leave (7 days/year)',
      'Unpaid Leave',
      'Compensatory Off',
      'Emergency Leave (3 days/year)'
    ],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  // --- NEW FIELDS ADDED BELOW ---

  // Stores the "Half Day Leave" checkbox (True/False)
  isHalfDay: {
    type: Boolean,
    default: false
  },

  // Stores the "Half Day Period" dropdown value
  halfDayPeriod: {
    type: String,
    enum: ['morning', 'afternoon', 'Morning (First Half)', 'Afternoon (Second Half)'],
    required: function () {
      // This makes the field required only if isHalfDay is true
      return this.isHalfDay === true;
    }
  },

  reason: {
    type: String
  },
  rejectionReason: {
    type: String
  }

}, { timestamps: true });

const LeaveManagement = mongoose.model("LeaveManagement", leaveSchema);
export default LeaveManagement;