import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/attendance_system';

const roiConfig = { 
    x_min: 0.05,  // Top-left corner
    y_min: 0.0,   
    x_max: 0.4,   // Narrow width for doorway
    y_max: 0.25   // Top 25% only - excludes desks
};

async function updateROI() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        
        const Settings = mongoose.model('Settings', new mongoose.Schema({
            key: String,
            value: mongoose.Schema.Types.Mixed
        }), 'settings');

        const keys = ['camera_out_roi', 'camera_room_camera_roi']; // Room camera and Out camera

        console.log('🎯 Updating Geofencing ROI to recommended 60%x70% zone...');
        
        for (const key of keys) {
            const result = await Settings.findOneAndUpdate(
                { key },
                { value: roiConfig },
                { upsert: true, new: true }
            );
            console.log(`✅ Updated ${key}:`, result.value);
        }

        console.log('\n🚀 ALL ROIs updated successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Update failed:', err.message);
        process.exit(1);
    }
}

updateROI();
