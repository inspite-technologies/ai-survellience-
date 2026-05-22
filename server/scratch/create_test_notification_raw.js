import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/facescan';

async function createTestNotification() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const hrCollection = mongoose.connection.db.collection('hrs');
    const hr = await hrCollection.findOne();
    
    if (!hr) {
      console.log('No HR user found in DB.');
      await mongoose.disconnect();
      return;
    }

    console.log(`Creating test notification for HR: ${hr.name || hr.fullName} (${hr._id})`);

    const notificationsCollection = mongoose.connection.db.collection('notifications');
    const testNotif = {
      userId: hr._id,
      userType: 'HR',
      title: 'Test Notification 🛠️',
      body: 'This is a test notification to verify the HR dashboard is working correctly.',
      data: {
        type: 'system',
        priority: 'high',
        screen: '/settings'
      },
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await notificationsCollection.insertOne(testNotif);

    console.log('Test notification created successfully:', result.insertedId);

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

createTestNotification();
