import mongoose from 'mongoose';
import Face from './models/faceSchema.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const test = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/facescan');
        console.log("Connected to MongoDB");

        const employee = await Face.findOne({ isVerified: true });
        if (!employee) {
            console.log("No verified employee found");
            process.exit(1);
        }

        console.log("Found Employee:", employee.name, "(ID:", employee._id, ")");

        const token = jwt.sign({ id: employee._id }, process.env.JWT_SECRET_KEY, { expiresIn: '10d' });
        console.log("Generated Token:", token);

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

test();
