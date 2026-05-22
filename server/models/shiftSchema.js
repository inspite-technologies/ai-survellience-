import mongoose from "mongoose";

var Schema = mongoose.Schema;
var shiftSchema = new Schema({
  shiftName: {
    type: String,
    required: true,
    // enum: ["Morning shift", "Afternoon Shift", "Evening Shift", "Night Shift"],
  },
  shiftColor: {
    type: String,
    required: true,
    enum: ["Green", "Dark Green", "Blue", "Orange", "Purple", "Teal", "Red"],
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  breakDuration: {
    type: Number,
    required: true,
  },
  activeShift: {
    type: Boolean,
    default: true
  },
  // akid changes: Allow choosing many days like Monday AND Tuesday
  // #r dirst: Making a list of days for school
  workingDays: [{
    type: String,
    required: true,
    enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  }],
  employeeIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Face",
    }
  ]
});

const Shift = mongoose.model("Shift", shiftSchema);
export default Shift;
