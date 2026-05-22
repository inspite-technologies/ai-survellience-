import Face from "../models/faceSchema.js";
import Manager from "../models/managerSchema.js";
import HR from "../models/hrSchema.js";
import Admin from "../models/adminSchema.js";
import Notification from "../models/notificationSchema.js";
import { sendPushNotification } from "../services/notificationService.js";

/**
 * Register or update an FCM token for an employee
 * POST /api/notifications/register-token
 */
export const registerFCMToken = async (req, res) => {
  try {
    const { userId, token, deviceType } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ 
        success: false, 
        message: "userId (Employee ID) and token are required" 
      });
    }

    // Look for user in all relevant collections
    let userModel = (await import("../models/faceSchema.js")).default;
    let user = await userModel.findById(userId);

    if (!user) {
      userModel = (await import("../models/hrSchema.js")).default;
      user = await userModel.findById(userId);
    }

    if (!user) {
      userModel = (await import("../models/managerSchema.js")).default;
      user = await userModel.findById(userId);
    }

    if (!user) {
      userModel = (await import("../models/adminSchema.js")).default;
      user = await userModel.findById(userId);
    }

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found in Employee, HR, Manager, or Admin collections" 
      });
    }

    // Ensure fcmTokens array exists (for legacy docs)
    if (!user.fcmTokens) user.fcmTokens = [];

    // Check if token already exists for this user
    const tokenIndex = user.fcmTokens.findIndex((t) => t.token === token);

    if (tokenIndex === -1) {
      // Add new token
      user.fcmTokens.push({
        token,
        deviceType: deviceType || 'web',
        lastUpdated: new Date()
      });
      user.fcmToken = token; // ✅ Update singular field
      await user.save();
      console.log(`📱 [Tokens] New token registered for ${user.role || 'user'}: ${user.name || user.fullName} (${userId})`);

      // ✅ Notify all HR users when an employee registers a new mobile/device
      if (userType === 'Face') {
        try {
          const hrUsers = await HR.find({});
          const hrTokens = hrUsers.reduce((acc, hr) => {
            if (hr.fcmToken) acc.push(hr.fcmToken);
            if (hr.fcmTokens) acc.push(...hr.fcmTokens.map(t => t.token));
            return acc;
          }, []);
          
          const uniqueHrTokens = [...new Set(hrTokens)];
          const title = "New Device Registered 📱";
          const body = `${user.name} has registered a new ${deviceType || 'device'} for the mobile app.`;
          
          // Save for each HR user in database
          for (const hr of hrUsers) {
            await sendPushNotification([], title, body, {
              type: 'device_registration',
              employeeId: userId,
              employeeName: user.name
            }, { userId: hr._id, userType: 'HR' });
          }

          // Send push to HRs
          if (uniqueHrTokens.length > 0) {
            await sendPushNotification(uniqueHrTokens, title, body, {
              type: 'device_registration',
              employeeId: userId,
              employeeName: user.name
            });
          }
        } catch (notifErr) {
          console.error("❌ [Notif] Error notifying HR of new device:", notifErr.message);
        }
      }
    } else {
      // Update existing token timestamp
      user.fcmTokens[tokenIndex].lastUpdated = new Date();
      if (deviceType) user.fcmTokens[tokenIndex].deviceType = deviceType;
      user.fcmToken = token; // ✅ Update singular field
      await user.save();
      console.log(`📱 [Tokens] Token timestamp updated for ${user.name || user.fullName}`);
    }

    res.status(200).json({ 
      success: true, 
      message: "FCM Token registered successfully",
      tokensActive: user.fcmTokens.length
    });
  } catch (error) {
    console.error("❌ [Tokens] Error registering token:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Remove an FCM token (e.g., on logout)
 * POST /api/notifications/remove-token
 */
export const removeFCMToken = async (req, res) => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ success: false, message: "userId and token required" });
    }

    await Face.findByIdAndUpdate(userId, {
      $pull: { fcmTokens: { token: token } }
    });

    res.status(200).json({ success: true, message: "Token removed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get notification history for an employee
 * GET /api/notifications/employee
 */
export const getEmployeeNotifications = async (req, res) => {
  try {
    const employeeId = req.employeeId;
    if (!employeeId) {
      return res.status(401).json({ success: false, message: "Unauthorized: Employee ID missing" });
    }

    const notifications = await Notification.find({ 
      userId: employeeId,
      userType: 'Face' 
    }).sort({ createdAt: -1 }).limit(50);

    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get notification history for a manager
 * GET /api/notifications/manager
 */
export const getManagerNotifications = async (req, res) => {
  try {
    const managerId = req.managerId;
    if (!managerId) {
      return res.status(401).json({ success: false, message: "Unauthorized: Manager ID missing" });
    }

    const notifications = await Notification.find({ 
      userId: managerId,
      userType: 'Manager' 
    }).sort({ createdAt: -1 }).limit(50);

    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get notification history for an HR user
 * GET /api/notifications/hr
 */
export const getHRNotifications = async (req, res) => {
  try {
    const hrId = req.hrId;
    if (!hrId) {
      return res.status(401).json({ success: false, message: "Unauthorized: HR ID missing" });
    }

    const notifications = await Notification.find({ 
      userId: hrId,
      userType: req.userType || 'HR' 
    }).sort({ createdAt: -1 }).limit(100);

    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


/**
 * Mark a notification as read
 * PATCH /api/notifications/:id/read
 */
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, { isRead: true });
    res.status(200).json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Send a manual push notification (Admin/HR use)
 * POST /api/notifications/send
 */
export const sendManualNotification = async (req, res) => {
  try {
    const { userId, userType, title, body, data } = req.body;

    if (!userId || !userType || !title || !body) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Find the user to get their tokens
    let user;
    if (userType === 'Face') user = await Face.findById(userId);
    else if (userType === 'Manager') user = await Manager.findById(userId);
    else if (userType === 'HR') user = await HR.findById(userId);
    else if (userType === 'Admin') user = await Admin.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const tokens = user.fcmTokens ? user.fcmTokens.map(t => t.token) : [];
    
    // Send and Save
    await sendPushNotification(tokens, title, body, data || {}, { userId, userType });

    res.status(200).json({ 
      success: true, 
      message: `Notification sent to ${tokens.length} devices and saved to history.` 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Test FCM connection for a specific user
 * POST /api/notifications/test-fcm
 */
export const testFCMConnection = async (req, res) => {
  try {
    const { userId, userType } = req.body;

    if (!userId || !userType) {
      return res.status(400).json({ success: false, message: "userId and userType required" });
    }

    // Find the user to get their tokens
    let user;
    if (userType === 'Face') user = await (await import("../models/faceSchema.js")).default.findById(userId);
    else if (userType === 'Manager') user = await (await import("../models/managerSchema.js")).default.findById(userId);
    else if (userType === 'HR') user = await (await import("../models/hrSchema.js")).default.findById(userId);
    else if (userType === 'Admin') user = await (await import("../models/adminSchema.js")).default.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const tokens = user.fcmTokens ? user.fcmTokens.map(t => t.token) : [];
    
    if (tokens.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "No FCM tokens found for this user. Please register a device first." 
      });
    }

    const title = "Test Notification 🧪";
    const body = `Hello ${user.name || user.fullName || 'User'}, your FCM integration is working!`;
    const data = { type: 'test_connection', timestamp: new Date().toISOString() };

    // Send only (don't save to history for tests)
    const response = await sendPushNotification(tokens, title, body, data);

    res.status(200).json({ 
      success: true, 
      message: `Test notification sent to ${tokens.length} devices.`,
      result: response
    });
  } catch (error) {
    console.error("❌ [TestFCM] Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
