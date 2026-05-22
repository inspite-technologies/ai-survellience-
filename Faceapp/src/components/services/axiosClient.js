// axiosInstance.js (No change needed in the setupInterceptors function)

import axios from "axios";

export const baseURL = import.meta.env.VITE_API_URL;

if (!baseURL) {
    console.error("❌ FATAL: VITE_API_URL is not defined in environment variables!");
} else {
    console.log("🔥 TARGETING BACKEND AT:", baseURL);
}


const createAxiosInstance = (baseURL, defaultHeaders = {}) => {
    return axios.create({
        baseURL,
        headers: {
            // Remove hardcoded Content-Type to allow Axios/browser to set it automatically
            // especially important for multipart/form-data (file uploads)
            ...defaultHeaders,
        },
        withCredentials: true,
    });
};

// Function to setup interceptors
const setupInterceptors = (instance) => {
    instance.interceptors.request.use(
        (config) => {
            const token = localStorage.getItem("token");
            if (token) {
                config.headers.token = `${token}`;
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    instance.interceptors.response.use(
        (response) => {
            return response;
        },
        (error) => {
            if (error.response && error.response.status === 401) {
                console.log("Unauthorized, dispatching auth:unauthorized event...");
                authEvents.dispatchEvent(new Event('auth:unauthorized'));
            }
            return Promise.reject(error);
        }
    );
};

export const authEvents = new EventTarget();

export const AUTH_INSTANCE = createAxiosInstance(`${baseURL}/auth/`);
setupInterceptors(AUTH_INSTANCE);

export const API_INSTANCE = createAxiosInstance(baseURL);
setupInterceptors(API_INSTANCE);