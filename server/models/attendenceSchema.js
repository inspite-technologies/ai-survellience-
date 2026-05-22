import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Face',
    required: true,
    index: true
  },
  employeeName: { 
    type: String, 
    required: true,
    index: true
  },
  timeIn: { 
    type: Date,
    index: true
  },
  timeOut: {
    type: Date
  },
  duration: {
    type: Number
  },
  event: { 
    type: String, 
    enum: ['in', 'out'],
    required: true
  },
  breakType: {
    type: String,
    enum: ['none', 'tea', 'lunch', 'snacks', 'other'],
    default: 'none'
  },
  date: { 
    type: String,
    index: true
  }
}, {
  timestamps: true
});

attendanceSchema.index({ userId: 1, timeIn: -1 });
attendanceSchema.index({ employeeName: 1, timeIn: -1 });
attendanceSchema.index({ userId: 1, date: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema, 'attendances');
export default Attendance