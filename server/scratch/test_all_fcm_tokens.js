import mongoose from 'mongoose';
import dotenv from 'dotenv';
import HR from '../models/hrSchema.js';
import Face from '../models/faceSchema.js';
import Manager from '../models/managerSchema.js';
import Admin from '../models/adminSchema.js';
import { sendPushNotification } from '../services/notificationService.js';

dotenv.config({ path: '../.env' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not found in .env file");
  process.exit(1);
}

async function testAllTokens() {
  try {
    console.log("🚀 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected.");

    console.log("🔍 Fetching tokens from all collections...");

    const [employees, hrs, managers, admins] = await Promise.all([
      Face.find({}, 'fcmTokens name'),
      HR.find({}, 'fcmTokens name'),
      Manager.find({}, 'fcmTokens fullName name'),
      Admin.find({}, 'fcmTokens email')
    ]);

    const allTokens = new Set();
    const stats = {
      employees: 0,
      hrs: 0,
      managers: 0,
      admins: 0
    };

    const processUserTokens = (users, type) => {
      users.forEach(user => {
        // Collect from singular field
        if (user.fcmToken) {
          allTokens.add(user.fcmToken);
          stats[type]++;
        }
        // Collect from plural array
        if (user.fcmTokens && user.fcmTokens.length > 0) {
          user.fcmTokens.forEach(t => {
            if (t.token) {
              allTokens.add(t.token);
              // stats[type]++; // Don't double count for stats if we want unique users, but token count is fine
            }
          });
        }
      });
    };

    processUserTokens(employees, 'employees');
    processUserTokens(hrs, 'hrs');
    processUserTokens(managers, 'managers');
    processUserTokens(admins, 'admins');

    const tokenArray = Array.from(allTokens);

    console.log("📊 Token Statistics:");
    console.log(`- Employees: ${stats.employees}`);
    console.log(`- HR users: ${stats.hrs}`);
    console.log(`- Managers: ${stats.managers}`);
    console.log(`- Admins: ${stats.admins}`);
    console.log(`- Total Unique Tokens: ${tokenArray.length}`);

    if (tokenArray.length === 0) {
      console.warn("⚠️ No tokens found in the database. Aborting test.");
      return;
    }

    const title = "System-wide FCM Test 🚀";
    const body = `This is a test notification sent to all ${tokenArray.length} registered devices.`;
    
    console.log(`📡 Sending test notification to ${tokenArray.length} tokens...`);
    const response = await sendPushNotification(tokenArray, title, body, {
      type: 'system_test',
      timestamp: new Date().toISOString(),
      isGlobal: "true"
    });

    console.log("✅ Test Result Summary:");
    console.log(`- Success Count: ${response.successCount}`);
    console.log(`- Failure Count: ${response.failureCount}`);
    
    if (response.failureCount > 0) {
      console.log("💡 Tip: Failures usually occur for tokens that are expired or invalid.");
    }

  } catch (err) {
    console.error("❌ Test failed:", err);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

testAllTokens();
