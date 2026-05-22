import mongoose from "mongoose";

const salarySchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Face',
        required: true,
    },
    employeeName: { type: String, required: true },
    month: { type: String, required: true }, // Format: YYYY-MM
    baseSalary: { type: Number, required: true },
    allowances: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    overtimeRate: { type: Number, default: 0 },
    grossSalary: { type: Number, required: true },
    taxAmount: { type: Number, required: true },
    netSalary: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'paid', 'approved', 'rejected'],
        default: 'pending'
    },
    processedBy: { type: String },
    paymentDate: { type: Date },
    reason: { type: String }, // For salary change requests
    createdAt: { type: Date, default: Date.now }
});

const Salary = mongoose.model("Salary", salarySchema);
export default Salary;
