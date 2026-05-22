import mongoose from 'mongoose';
import Notification from '../models/notificationSchema.js';
import HR from '../models/hrSchema.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/facescan';

async function createTestNotification() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const hr = await HR.findOne();
    if (!hr) {
      console.log('No HR user found in DB. Please create an HR user first.');
      await mongoose.disconnect();
      return;
    }

    console.log(`Creating test notification for HR: ${hr.name} (${hr._id})`);

    const testNotif = await Notification.create({
      userId: hr._id,
      userType: 'HR',
      title: 'Test Notification 🛠️',
      body: 'This is a test notification to verify the HR dashboard is working correctly.',
      data: {
        type: 'system',
        priority: 'high',
        screen: '/settings'
      }
    });

    console.log('Test notification created successfully:');
    console.log(JSON.stringify(testNotif, null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

createTestNotification();
