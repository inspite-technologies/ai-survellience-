import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const faceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    descriptor: { type: [Number], required: true },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manager",
      default: null,
    },
    email: {
      type: String,
      required: false,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String },

    phoneNumber: {
      type: String,
      trim: true,
    },

    department: {
      type: String,
    },

    position: {
      type: String,
    },

    shiftTime: {
      type: String,
    },

    shift: {
      type: Date,
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      default: null,
    },
    shiftName: {
      type: String,
      default: "",
    },

    joinDate: {
      type: Date,
    },

    monthlySalary: {
      type: Number,
    },

    address: {
      type: String,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    bonusPoints: {
      type: Number,
      default: 0,
    },
    grooming: { type: Number, default: 0 },
    attitude: { type: Number, default: 0 },
    punctuality: { type: Number, default: 0 },
    lastEvaluated: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      default: "",
    },
    fcmTokens: [{
      token: { type: String, required: true },
      deviceType: { type: String, enum: ['android', 'ios', 'web'] },
      lastUpdated: { type: Date, default: Date.now }
    }],
    fcmToken: { type: String, default: null },
  },
  {
    timestamps: true,
  },
);

faceSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
faceSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Face = mongoose.model("Face", faceSchema, "employees");
export default Face;
