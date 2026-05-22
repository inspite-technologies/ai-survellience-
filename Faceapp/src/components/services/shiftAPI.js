import { API_INSTANCE } from "./axiosClient";

const BASE_URL = "/shifts";

/**
 * Fetch all shifts from the backend.
 * @returns {Promise<Array>} List of shifts.
 */
export const getAllShifts = async () => {
    try {
        const response = await API_INSTANCE.get(`${BASE_URL}/`);
        return response.data;
    } catch (error) {
        console.error("Error fetching all shifts:", error);
        throw error;
    }
};

/**
 * Create a new shift.
 * @param {Object} shiftData - The shift data to create.
 * @returns {Promise<Object>} The created shift.
 */
export const createShift = async (shiftData) => {
    try {
        const response = await API_INSTANCE.post(`${BASE_URL}/`, shiftData);
        return response.data;
    } catch (error) {
        console.error("Error creating shift:", error);
        throw error;
    }
};

/**
 * Update an existing shift.
 * @param {string} id - The ID of the shift to update.
 * @param {Object} shiftData - The updated shift data.
 * @returns {Promise<Object>} The updated shift.
 */
export const updateShift = async (id, shiftData) => {
    try {
        const response = await API_INSTANCE.put(`${BASE_URL}/${id}`, shiftData);
        return response.data;
    } catch (error) {
        console.error("Error updating shift:", error);
        throw error;
    }
};

/**
 * Delete a shift.
 * @param {string} id - The ID of the shift to delete.
 * @returns {Promise<Object>} The response data.
 */
export const deleteShift = async (id) => {
    try {
        const response = await API_INSTANCE.delete(`${BASE_URL}/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error deleting shift:", error);
        throw error;
    }
};

/**
 * Assign employees to a shift.
 * @param {string} id - The ID of the shift.
 * @param {Array<string>} employeeIds - List of employee IDs to assign.
 * @returns {Promise<Object>} The updated shift with assigned employees.
 */
export const assignEmployeesToShift = async (id, employeeIds) => {
    try {
        const response = await API_INSTANCE.put(`${BASE_URL}/${id}/assign`, { employeeIds });
        return response.data;
    } catch (error) {
        console.error("Error assigning employees to shift:", error);
        throw error;
    }
};
