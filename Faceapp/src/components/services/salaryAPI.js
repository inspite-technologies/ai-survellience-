import { API_INSTANCE } from "./axiosClient";

/**
 * #r Fetch all salary records for a specific month
 */
export const getMonthlySalaries = async (month) => {
    try {
        const response = await API_INSTANCE.get("/salary", { params: { month } });
        return response.data;
    } catch (error) {
        console.error("Error fetching salaries:", error);
        throw error;
    }
};

/**
 * #r Process salary for an employee
 */
export const processSalary = async (salaryData) => {
    try {
        const response = await API_INSTANCE.post("/salary/process", salaryData);
        return response.data;
    } catch (error) {
        console.error("Error processing salary:", error);
        throw error;
    }
};

/**
 * #r Mark salary as paid
 */
export const markAsPaid = async (id) => {
    try {
        const response = await API_INSTANCE.put(`/salary/pay/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error marking salary as paid:", error);
        throw error;
    }
};

/**
 * #r Request salary change
 */
export const requestSalaryChange = async (changeData) => {
    try {
        const response = await API_INSTANCE.post("/salary/change", changeData);
        return response.data;
    } catch (error) {
        console.error("Error requesting salary change:", error);
        throw error;
    }
};
/**
 * #r Fetch all pending and historical salary change requests
 */
export const getAllSalaryRequests = async () => {
    try {
        const response = await API_INSTANCE.get("/salary/requests");
        return response.data;
    } catch (error) {
        console.error("Error fetching salary requests:", error);
        throw error;
    }
};

/**
 * #r Admin approve salary change
 */
export const approveSalary = async (id) => {
    try {
        const response = await API_INSTANCE.put(`/salary/approve/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error approving salary:", error);
        throw error;
    }
};

/**
 * #r Admin reject salary change
 */
export const rejectSalary = async (id) => {
    try {
        const response = await API_INSTANCE.put(`/salary/reject/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error rejecting salary:", error);
        throw error;
    }
};
