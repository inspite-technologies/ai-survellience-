import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Face",
        required: true
    },
    managerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Manager",
        required: true
    },
    grooming: {
        type: Number,
        required: true
    },
    attitude: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const Rating = mongoose.model("EmployeeRating", ratingSchema);
export default Rating;
