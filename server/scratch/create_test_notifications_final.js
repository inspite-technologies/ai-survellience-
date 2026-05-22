import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/facescan';

async function createTestNotificationsForAllAdminAndHR() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const hrCollection = mongoose.connection.db.collection('hrs');
    const hrs = await hrCollection.find().toArray();
    
    const adminCollection = mongoose.connection.db.collection('admins');
    const admins = await adminCollection.find().toArray();

    const allUsers = [
      ...hrs.map(u => ({ ...u, type: 'HR' })),
      ...admins.map(u => ({ ...u, type: 'Admin' }))
    ];
    
    if (allUsers.length === 0) {
      console.log('No HR or Admin users found in DB.');
      await mongoose.disconnect();
      return;
    }

    console.log(`Creating test notifications for ${allUsers.length} users...`);

    const notificationsCollection = mongoose.connection.db.collection('notifications');
    const testNotifs = allUsers.map(user => ({
      userId: user._id,
      userType: user.type,
      title: 'Welcome to Notifications 🔔',
      body: `Hello ${user.name || user.fullName || 'User'}, the HR notification system is now active.`,
      data: {
        type: 'system',
        priority: 'medium',
        screen: '/notifications'
      },
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const result = await notificationsCollection.insertMany(testNotifs);

    console.log(`Successfully created ${result.insertedCount} test notifications.`);

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

createTestNotificationsForAllAdminAndHR();
