import { API_INSTANCE } from './axiosClient';

/**
 * Fetch notifications for the current HR user
 */
export const getHRNotifications = async () => {
    try {
        const response = await API_INSTANCE.get('/notifications/hr');
        return response.data.data;
    } catch (error) {
        console.error("Error fetching HR notifications:", error);
        throw error;
    }
};

/**
 * Mark a notification as read
 */
export const markAsRead = async (id) => {
    try {
        const response = await API_INSTANCE.patch(`/notifications/${id}/read`);
        return response.data;
    } catch (error) {
        console.error("Error marking notification as read:", error);
        throw error;
    }
};

/**
 * Register FCM token (if needed from web)
 */
export const registerFCMToken = async (userId, token, deviceType = 'web') => {
    try {
        const response = await API_INSTANCE.post('/notifications/register-token', {
            userId,
            token,
            deviceType
        });
        return response.data;
    } catch (error) {
        console.error("Error registering FCM token:", error);
        throw error;
    }
};
