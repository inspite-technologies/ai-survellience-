import { API_INSTANCE } from "./axiosClient";

/**
 * Fetches all managers from the backend
 * @returns {Promise<Object>} API response containing manager list
 */
export const getAllManagers = async () => {
    try {
        const response = await API_INSTANCE.get("/manager");
        return response.data;
    } catch (error) {
        console.error("Error fetching managers:", error);
        throw error;
    }
};

/**
 * Updates manager scores and feedback
 * @param {string} id - Manager's unique ID
 * @param {Object} scoreData - Object containing updated scores and notes
 * @returns {Promise<Object>} API response containing updated manager
 */
export const updateManagerScore = async (id, scoreData) => {
    try {
        const response = await API_INSTANCE.put(`/manager/${id}`, scoreData);
        return response.data;
    } catch (error) {
        console.error("Error updating manager score:", error);
        throw error;
    }
};

/**
 * Fetches specific manager details by ID
 * @param {string} id - Manager's unique ID
 * @returns {Promise<Object>} API response containing manager details
 */
export const getManagerById = async (id) => {
    try {
        const response = await API_INSTANCE.get(`/manager/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching manager by id:", error);
        throw error;
    }
};
