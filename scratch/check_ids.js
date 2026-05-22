import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './server/.env' });

const mongoUri = process.env.MONGODB_URI;

async function checkIds() {
    try {
        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB");

        const Face = mongoose.model('Face', new mongoose.Schema({}, { strict: false }));
        const HR = mongoose.model('HR', new mongoose.Schema({}, { strict: false }));
        const Manager = mongoose.model('Manager', new mongoose.Schema({}, { strict: false }));

        const employees = await Face.find({}, '_id name').limit(5);
        const hrs = await HR.find({}, '_id name').limit(5);
        const managers = await Manager.find({}, '_id fullName').limit(5);

        console.log("\n--- EMPLOYEES ---");
        employees.forEach(e => console.log(`${e._id} - ${e.name}`));

        console.log("\n--- HR ---");
        hrs.forEach(h => console.log(`${h._id} - ${h.name}`));

        console.log("\n--- MANAGERS ---");
        managers.forEach(m => console.log(`${m._id} - ${m.fullName}`));

        await mongoose.disconnect();
    } catch (err) {
        console.error("❌ Error:", err.message);
    }
}

checkIds();
