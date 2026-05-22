import Settings from "../models/settingsSchema.js";

// GET all settings
export const getSettings = async (req, res) => {
    try {
        const allSettings = await Settings.find({});
        const settingsMap = {};
        allSettings.forEach(s => {
            settingsMap[s.key] = s.value;
        });

        res.status(200).json({
            success: true,
            settings: settingsMap
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Bulk update settings
export const bulkUpdateSettings = async (req, res) => {
    try {
        const { settings } = req.body;
        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({
                success: false,
                message: "Settings object is required"
            });
        }

        const updatePromises = Object.entries(settings).map(([key, value]) => {
            return Settings.findOneAndUpdate(
                { key },
                { value },
                { upsert: true, new: true }
            );
        });

        await Promise.all(updatePromises);

        res.status(200).json({
            success: true,
            message: "Settings updated successfully"
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Initialize default settings
export const initSettings = async (req, res) => {
    try {
        const defaults = {
            companyName: 'Tech Solutions Inc.',
            timezone: 'Asia/Kolkata',
            defaultStore: 'All Stores',
            'notifications.email': true,
            'notifications.salary': true,
            'notifications.reports': false,
            'camera_out_roi': { x_min: 0.1, y_min: 0.1, x_max: 0.9, y_max: 0.9 }, // Default 80% center zone
            'hr.general': JSON.stringify({
                companyName: 'Tech Solutions Inc.',
                companyEmail: 'contact@techsolutions.com',
                companyPhone: '+1 555-0123',
                timezone: 'Asia/Kolkata',
                dateFormat: 'MM/DD/YYYY',
                timeFormat: '12h',
                language: 'en',
                currency: 'INR'
            })
        };

        const initPromises = Object.entries(defaults).map(([key, value]) => {
            return Settings.findOneAndUpdate(
                { key },
                { value },
                { upsert: true, new: true }
            );
        });

        await Promise.all(initPromises);

        res.status(200).json({
            success: true,
            message: "Settings initialized with defaults"
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};
