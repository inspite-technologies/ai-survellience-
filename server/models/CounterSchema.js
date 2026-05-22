import mongoose from "mongoose";

// ✅ COUNTER SCHEMA - For Atomic ID Generation
const counterSchema = new mongoose.Schema({
  _id: String,
  sequence_value: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);
export default Counter 