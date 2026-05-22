import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/facescan';

async function createTestNotificationsForAll() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const hrCollection = mongoose.connection.db.collection('hrs');
    const hrs = await hrCollection.find().toArray();
    
    if (hrs.length === 0) {
      console.log('No HR users found in DB.');
      await mongoose.disconnect();
      return;
    }

    console.log(`Creating test notifications for ${hrs.length} HR users...`);

    const notificationsCollection = mongoose.connection.db.collection('notifications');
    const testNotifs = hrs.map(hr => ({
      userId: hr._id,
      userType: 'HR',
      title: 'System Online 📡',
      body: `Hello ${hr.name || hr.fullName || 'HR'}, the notification system is now connected to the database.`,
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

createTestNotificationsForAll();
