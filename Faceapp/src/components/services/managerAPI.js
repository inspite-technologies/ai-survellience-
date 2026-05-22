// Manager API Service - handles all manager-related backend communication
import { API_INSTANCE } from "./axiosClient";

const BASE_URL = "/manager";

/**
 * Fetches all managers from the database
 * @returns {Promise<Array>} Array of manager objects
 */
export const getAllManagers = async () => {
    try {
        const response = await API_INSTANCE.get(`${BASE_URL}/`);
        // Backend returns { msg, data: [...] }, extract the data array
        return response.data.data || response.data;
    } catch (error) {
        console.error("Error fetching managers:", error);
        throw error;
    }
};

/**
 * Creates a new manager
 * @param {Object} managerData - Manager details
 * @returns {Promise<Object>} Created manager object
 */
export const createManager = async (managerData) => {
    try {
        const response = await API_INSTANCE.post(`${BASE_URL}/`, managerData);
        return response.data;
    } catch (error) {
        console.error("Error creating manager:", error);
        throw error;
    }
};

/**
 * Updates an existing manager
 * @param {string} id - Manager ID
 * @param {Object} managerData - Updated manager details
 * @returns {Promise<Object>} Updated manager object
 */
export const updateManager = async (id, managerData) => {
    try {
        const response = await API_INSTANCE.put(`${BASE_URL}/${id}`, managerData);
        return response.data;
    } catch (error) {
        console.error("Error updating manager:", error);
        throw error;
    }
};

/**
 * Deletes a manager
 * @param {string} id - Manager ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export const deleteManager = async (id) => {
    try {
        const response = await API_INSTANCE.delete(`${BASE_URL}/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error deleting manager:", error);
        throw error;
    }
};
