import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ScratchCard from './models/scratchCardSchema.js';

dotenv.config();

async function checkDb() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const cards = await ScratchCard.find().sort({ createdAt: -1 }).limit(10);
    console.log(`Found ${cards.length} cards`);

    cards.forEach(card => {
      console.log('--- Card ---');
      console.log('ID:', card._id);
      console.log('Title:', card.title);
      console.log('BatchID:', card.batchId);
      console.log('Images:', card.images);
      console.log('RewardType:', card.rewardType);
      console.log('----------------');
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkDb();
