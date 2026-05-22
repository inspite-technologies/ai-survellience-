import { API_INSTANCE } from "./axiosClient";

const BASE_URL = "/leave";

/**
 * Fetches all leave requests
 * @returns {Promise<Array>} Array of leave requests
 */
export const getAllLeaves = async () => {
    try {
        const response = await API_INSTANCE.get(`${BASE_URL}/`);
        // Backend returns array directly or inside data property
        return response.data.data || response.data;
    } catch (error) {
        console.error("Error fetching leaves:", error);
        throw error;
    }
};

/**
 * Creates a new leave request
 * @param {Object} leaveData - Leave application details
 * @returns {Promise<Object>} Created leave object
 */
export const applyLeave = async (leaveData) => {
    try {
        const response = await API_INSTANCE.post(`${BASE_URL}/`, leaveData);
        return response.data;
    } catch (error) {
        console.error("Error applying for leave:", error);
        throw error;
    }
};

/**
 * Approves a leave request
 * @param {string} id - Leave Identifier
 * @returns {Promise<Object>} Updated leave object
 */
export const approveLeave = async (id) => {
    try {
        const response = await API_INSTANCE.put(`${BASE_URL}/accept/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error approving leave:", error);
        throw error;
    }
};

/**
 * Rejects a leave request
 * @param {string} id - Leave Identifier
 * @param {string} reason - Rejection reason (optional if backend supports it)
 * @returns {Promise<Object>} Updated leave object
 */
export const rejectLeave = async (id, reason) => {
    try {
        const response = await API_INSTANCE.put(`${BASE_URL}/reject/${id}`, { rejectionReason: reason });
        return response.data;
    } catch (error) {
        console.error("Error rejecting leave:", error);
        throw error;
    }
};
