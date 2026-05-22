import { API_INSTANCE } from "./axiosClient";

const BASE_URL = "/bonus";

/**
 * Award or deduct points
 * @param {Object} data - { employeeId, transactionType, category, points, reason, date }
 */
export const createBonusPoints = async (data) => {
    try {
        const response = await API_INSTANCE.post(BASE_URL, data);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Get all bonus transactions
 */
export const getAllBonusPoints = async () => {
    try {
        const response = await API_INSTANCE.get(BASE_URL);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Get leaderboard (top employees)
 */
export const getLeaderboard = async () => {
    try {
        const response = await API_INSTANCE.get(`${BASE_URL}/leaderboard`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Get individual history
 * @param {string} employeeId 
 */
export const getEmployeeBonusHistory = async (employeeId) => {
    try {
        const response = await API_INSTANCE.get(`${BASE_URL}/history/${employeeId}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Delete a bonus transaction
 * @param {string} id 
 */
export const deleteBonusPoints = async (id) => {
    try {
        const response = await API_INSTANCE.delete(`${BASE_URL}/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};
