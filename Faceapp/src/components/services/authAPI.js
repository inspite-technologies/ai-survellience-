import { AUTH_INSTANCE } from "./axiosClient";

export const login = async (data) => {
    try {
        console.log(data)
        const response = await AUTH_INSTANCE.post("/login", data);
        console.log(response.data)
        return response.data;
    } catch (error) {
        console.error("Error during login:", error);
        throw error;
    }
};

export const register = async (data) => {
    try {
        console.log("Registering HR user:", data);
        const response = await AUTH_INSTANCE.post("/register", data);
        console.log("Registration response:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error during registration:", error);
        throw error;
    }
};