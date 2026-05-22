import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './models/adminSchema.js';
import HR from './models/hrSchema.js';
import Face from './models/faceSchema.js';
import Manager from './models/managerSchema.js';

dotenv.config();

const emailToCheck = "ayesha@gmail.com";

const checkUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        console.log(`Checking for email: ${emailToCheck}`);

        const admin = await Admin.findOne({ email: emailToCheck });
        console.log(`Admin found: ${!!admin}`);
        if (admin) console.log(admin);

        const hr = await HR.findOne({ email: emailToCheck });
        console.log(`HR found: ${!!hr}`);
        if (hr) console.log(hr);

        const employee = await Face.findOne({ email: emailToCheck });
        console.log(`Employee (Face) found: ${!!employee}`);
        if (employee) console.log(employee);

        const manager = await Manager.findOne({ email: emailToCheck });
        console.log(`Manager found: ${!!manager}`);
        if (manager) console.log(manager);

        // Also check case-insensitive if not found
        if (!admin && !hr && !employee && !manager) {
            console.log("Not found with exact match. checking case-insensitive regex...");
            const regex = new RegExp(`^${emailToCheck}$`, 'i');

            const adminRegex = await Admin.findOne({ email: regex });
            console.log(`Admin (Regex) found: ${!!adminRegex}`);
            if (adminRegex) console.log("Actual email in Admin:", adminRegex.email);

            const hrRegex = await HR.findOne({ email: regex });
            console.log(`HR (Regex) found: ${!!hrRegex}`);
            if (hrRegex) console.log("Actual email in HR:", hrRegex.email);

            const empRegex = await Face.findOne({ email: regex });
            console.log(`Employee (Regex) found: ${!!empRegex}`);
            if (empRegex) console.log("Actual email in Face:", empRegex.email);

            const mgrRegex = await Manager.findOne({ email: regex });
            console.log(`Manager (Regex) found: ${!!mgrRegex}`);
            if (mgrRegex) console.log("Actual email in Manager:", mgrRegex.email);
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected");
        process.exit();
    }
};

checkUser();
