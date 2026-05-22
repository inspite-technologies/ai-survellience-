import { API_INSTANCE } from "./axiosClient";

/**
 * #r API Wrapper for scratch card operations
 */

export const getAllScratchCards = async () => {
    try {
        const response = await API_INSTANCE.get(`/scratchcards`);
        return response.data;
    } catch (error) {
        console.error("Error fetching scratch cards:", error);
        throw error;
    }
};

/**
 * #r POST request to create multiple cards
 */
export const createScratchCards = async (cardData) => {
    try {
        const response = await API_INSTANCE.post(`/scratchcards`, cardData);
        return response.data;
    } catch (error) {
        console.error("Error creating scratch cards:", error);
        throw error;
    }
};

/**
 * #r PUT request to update card state (scratch/redeem)
 */
export const updateScratchCardStatus = async (id, status) => {
    try {
        const response = await API_INSTANCE.put(`/scratchcards/${id}`, { status });
        return response.data;
    } catch (error) {
        console.error("Error updating scratch card status:", error);
        throw error;
    }
};

/**
 * #r HR update for general card fields
 */
export const adminUpdateScratchCard = async (id, cardData) => {
    try {
        const response = await API_INSTANCE.put(`/scratchcards/${id}`, cardData);
        return response.data;
    } catch (error) {
        console.error("Error updating scratch card:", error);
        throw error;
    }
};


/**
 * #r DELETE request to remove a card
 */
export const deleteScratchCard = async (id) => {
    try {
        const response = await API_INSTANCE.delete(`/scratchcards/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error deleting scratch card:", error);
        throw error;
    }
};
/**
 * #r GET redeemed cards for HR
 */
export const getRedeemedCards = async () => {
    try {
        const response = await API_INSTANCE.get(`/scratchcards/redeemed`);
        return response.data;
    } catch (error) {
        console.error("Error fetching redeemed cards:", error);
        throw error;
    }
};
