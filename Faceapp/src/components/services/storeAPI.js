import { API_INSTANCE } from "./axiosClient"; // using generic api instance

// Base path for store routes - assuming /api/store based on app.js
const BASE_URL = "/store";

export const getAllStores = async () => {
    try {
        const response = await API_INSTANCE.get(`${BASE_URL}/`);
        // Backend returns { msg, data: [...] }, extract the data array
        return response.data.data || response.data;
    } catch (error) {
        console.error("Error fetching stores:", error);
        throw error;
    }
};

export const createStore = async (storeData) => {
    try {
        const response = await API_INSTANCE.post(`${BASE_URL}/`, storeData);
        return response.data;
    } catch (error) {
        console.error("Error creating store:", error);
        throw error;
    }
};

export const updateStore = async (id, storeData) => {
    try {
        const response = await API_INSTANCE.put(`${BASE_URL}/${id}`, storeData);
        return response.data;
    } catch (error) {
        console.error("Error updating store:", error);
        throw error;
    }
};

export const deleteStore = async (id) => {
    try {
        const response = await API_INSTANCE.delete(`${BASE_URL}/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error deleting store:", error);
        throw error;
    }
};
