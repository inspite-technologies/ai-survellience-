import { API_INSTANCE } from "./axiosClient";

const BASE_URL = "/attendance";

/**
 * Get today's attendance summaries
 * @param {string} [date] - Optional date string (YYYY-MM-DD)
 */
export const getTodayAttendance = async (date) => {
    try {
        const url = date ? `${BASE_URL}/today?date=${date}` : `${BASE_URL}/today`;
        const response = await API_INSTANCE.get(url);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Manual check-in
 * @param {string} userId 
 * @param {string} employeeName 
 */
export const manualCheckIn = async (userId, employeeName) => {
    try {
        const response = await API_INSTANCE.post(`${BASE_URL}/in`, { userId, employeeName });
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Manual check-out
 * @param {string} userId 
 * @param {string} employeeName 
 */
export const manualCheckOut = async (userId, employeeName) => {
    try {
        const response = await API_INSTANCE.post(`${BASE_URL}/out`, { userId, employeeName });
        return response.data;
    } catch (error) {
        throw error;
    }
};
