import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Notification from '../models/notificationSchema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.resolve(__dirname, '../config/serviceAccountKey.json');

if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin initialized');
  } catch (err) {
    console.error('❌ Error parsing serviceAccountKey.json:', err.message);
  }
} else {
  console.warn('⚠️ Firebase serviceAccountKey.json not found in server/config/. Notifications will not be sent until this file is added.');
}

/**
 * Send push notifications to multiple tokens and optionally save to history
 * @param {string[]} tokens - Array of FCM tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Optional data payload
 * @param {object} saveOptions - Optional { userId, userType } to save to history
 */
export const sendPushNotification = async (tokens, title, body, data = {}, saveOptions = null) => {
  // 1. Save to database history if userId and userType are provided
  if (saveOptions && saveOptions.userId && saveOptions.userType) {
    try {
      await Notification.create({
        userId: saveOptions.userId,
        userType: saveOptions.userType,
        title,
        body,
        data
      });
      console.log(`💾 [Notif] Saved to history for ${saveOptions.userType}: ${saveOptions.userId}`);
    } catch (dbErr) {
      console.error('❌ [Notif] Error saving to history:', dbErr.message);
    }
  }

  // 2. Send via FCM if tokens are provided
  if (!admin.apps.length || !tokens || tokens.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  // Ensure data has click_action and all values are strings for Flutter SDK consistency
  const processedData = { 
    ...data, 
    click_action: "FLUTTER_NOTIFICATION_CLICK" 
  };
  
  Object.keys(processedData).forEach(key => {
    if (processedData[key] !== null && processedData[key] !== undefined) {
      processedData[key] = String(processedData[key]);
    }
  });

  const message = {
    notification: { title, body },
    data: processedData,
    tokens: tokens,
  };

  try {
    console.log(`📡 [FCM] Preparing to send to ${tokens.length} tokens. Title: "${title}"`);
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`📡 [FCM] Result: ${response.successCount} success, ${response.failureCount} failure`);
    return response;
  } catch (error) {
    console.error('❌ [FCM] Error sending messages:', error);
    throw error;
  }
};

export default admin;
