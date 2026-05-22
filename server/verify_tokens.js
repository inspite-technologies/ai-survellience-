import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Face from './models/faceSchema.js';
import HR from './models/hrSchema.js';
import Manager from './models/managerSchema.js';
import Admin from './models/adminSchema.js';

dotenv.config();

async function checkTokens() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const users = [
      { model: Face, name: 'Employees' },
      { model: HR, name: 'HR' },
      { model: Manager, name: 'Managers' },
      { model: Admin, name: 'Admins' }
    ];

    for (const { model, name } of users) {
      const count = await model.countDocuments({ fcmToken: { $ne: null } });
      const total = await model.countDocuments();
      console.log(`📊 ${name}: ${count}/${total} users have fcmToken populated.`);
      
      if (count > 0) {
        const samples = await model.find({ fcmToken: { $ne: null } }).limit(2);
        samples.forEach(s => {
          console.log(`   - ${s.name || s.fullName || s.email}: ${s.fcmToken.substring(0, 10)}...`);
        });
      }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

checkTokens();
