import { API_INSTANCE } from "./axiosClient";

const BASE_URL = "/faces";

export const getAllEmployees = async () => {
    try {
        const response = await API_INSTANCE.get(`${BASE_URL}/`);
        return response.data;
    } catch (error) {
        console.error("Error fetching employees:", error);
        throw error;
    }
};

export const createEmployee = async (employeeData) => {
    try {
        const response = await API_INSTANCE.post(`${BASE_URL}/save`, employeeData);
        return response.data;
    } catch (error) {
        console.error("Error creating employee:", error);
        throw error;
    }
};

export const updateEmployee = async (id, employeeData) => {
    try {
        const response = await API_INSTANCE.put(`${BASE_URL}/${id}`, employeeData);
        return response.data;
    } catch (error) {
        console.error("Error updating employee:", error);
        throw error;
    }
};

export const deleteEmployee = async (id) => {
    try {
        const response = await API_INSTANCE.delete(`${BASE_URL}/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error deleting employee:", error);
        throw error;
    }
};

export const getUnverifiedEmployees = async () => {
    try {
        const response = await API_INSTANCE.get(`${BASE_URL}/unverified`);
        return response.data;
    } catch (error) {
        console.error("Error fetching unverified employees:", error);
        throw error;
    }
};

export const verifyEmployee = async (id) => {
    try {
        const response = await API_INSTANCE.patch(`${BASE_URL}/verify/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error verifying employee:", error);
        throw error;
    }
};

export const rejectEmployee = async (id) => {
    try {
        const response = await API_INSTANCE.delete(`${BASE_URL}/reject/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error rejecting employee:", error);
        throw error;
    }
};
