import { API_INSTANCE } from "./axiosClient";

export const getAllBreaks = async () => {
    try {
        const response = await API_INSTANCE.get("/break");
        return response.data;
    } catch (error) {
        console.error("Error fetching breaks:", error);
        throw error;
    }
};

export const createBreak = async (breakData) => {
    try {
        const response = await API_INSTANCE.post("/break", breakData);
        return response.data;
    } catch (error) {
        console.error("Error creating break:", error);
        throw error;
    }
};

export const updateBreak = async (id, breakData) => {
    try {
        const response = await API_INSTANCE.put(`/break/${id}`, breakData);
        return response.data;
    } catch (error) {
        console.error("Error updating break:", error);
        throw error;
    }
};

export const deleteBreak = async (id) => {
    try {
        const response = await API_INSTANCE.delete(`/break/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error deleting break:", error);
        throw error;
    }
};

export const toggleBreakStatus = async (id) => {
    try {
        const response = await API_INSTANCE.patch(`/break/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error toggling break status:", error);
        throw error;
    }
};

export const getBreakSettings = async () => {
    try {
        const response = await API_INSTANCE.get("/break/settings");
        return response.data;
    } catch (error) {
        console.error("Error fetching break settings:", error);
        throw error;
    }
};

export const updateBreakSettings = async (settings) => {
    try {
        const response = await API_INSTANCE.put("/break/settings", settings);
        return response.data;
    } catch (error) {
        console.error("Error updating break settings:", error);
        throw error;
    }
};
