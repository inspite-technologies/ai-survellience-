import mongoose from 'mongoose';
import Notification from '../models/notificationSchema.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/facescan';

async function checkNotifications() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const count = await Notification.countDocuments();
    console.log(`Total notifications in DB: ${count}`);

    const latest = await Notification.find().sort({ createdAt: -1 }).limit(5);
    console.log('Latest 5 notifications:');
    console.log(JSON.stringify(latest, null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkNotifications();
