import mongoose from 'mongoose';
import dotenv from 'dotenv';
import HR from '../models/hrSchema.js';
import Face from '../models/faceSchema.js';
import { sendPushNotification } from '../services/notificationService.js';

dotenv.config({ path: '../.env' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not found in .env file");
  process.exit(1);
}

async function testTrigger() {
  try {
    console.log("🚀 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected.");

    // 1. Find a test HR user (Reno)
    const hr = await HR.findOne({ name: "reno" });
    if (!hr || !hr.fcmTokens || hr.fcmTokens.length === 0) {
      console.error("❌ No HR user with tokens found.");
      process.exit(1);
    }

    console.log(`📡 Found HR user: ${hr.name} with ${hr.fcmTokens.length} tokens.`);

    // 2. Find a test Employee
    const employee = await Face.findOne();
    const applicantName = employee ? employee.name : "Test Employee";

    // 3. Trigger Notification (Simulating applyLeaveEmployee logic)
    const tokens = hr.fcmTokens.map(t => t.token);
    const title = "New Leave Request 📝 [TEST]";
    const body = `${applicantName} has applied for sick leave (Test Notification).`;
    
    console.log(`📡 Sending test notification to ${tokens.length} tokens...`);
    const response = await sendPushNotification(tokens, title, body, {
      type: 'new_leave_request',
      leaveId: "test-id-123",
      applicantName,
      isTest: "true"
    });

    console.log("✅ Trigger result:", JSON.stringify(response, null, 2));

  } catch (err) {
    console.error("❌ Test failed:", err);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

testTrigger();
