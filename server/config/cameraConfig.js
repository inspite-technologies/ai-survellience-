import Settings from "../models/settingsSchema.js";

/**
 * Camera ROI Management
 * 
 * ROIs are stored in the 'Settings' collection under the key 'camera_out_roi'.
 * Format: { x_min, y_min, x_max, y_max } - values as percentage (0-1) or absolute pixels.
 * We'll use 0-1 percentage for responsiveness.
 */

const DEFAULT_OUT_ROI = {
    x_min: 0.0,
    y_min: 0.0,
    x_max: 1.0,
    y_max: 1.0
}; // Default to full frame if not set

/**
 * Get the current ROI for a camera.
 * @param {string} cameraId 
 * @returns {Promise<Object>} ROI coordinates
 */
export async function getCameraROI(cameraId) {
    try {
        const key = `camera_${cameraId}_roi`;
        const setting = await Settings.findOne({ key });

        if (setting && setting.value) {
            return setting.value;
        }

        return DEFAULT_OUT_ROI;
    } catch (err) {
        console.error(`❌ Error fetching ROI for ${cameraId}:`, err.message);
        return DEFAULT_OUT_ROI;
    }
}

/**
 * Check if a bounding box intersects with an ROI.
 * @param {number[]} bbox [x1, y1, x2, y2]
 * @param {Object} roi { x_min, y_min, x_max, y_max }
 * @param {number} imgWidth - Width of the image the bbox was detected in
 * @param {number} imgHeight - Height of the image the bbox was detected in
 * @returns {boolean}
 */
export function isInsideROI(bbox, roi, imgWidth = 1024, imgHeight = 576) {
    if (!bbox || !roi) return true; // Fail safe to true if data missing

    const [x1, y1, x2, y2] = bbox;

    // Normalized coordinates of the person center
    const cx = ((x1 + x2) / 2) / imgWidth;
    const cy = ((y1 + y2) / 2) / imgHeight;

    const inX = cx >= roi.x_min && cx <= roi.x_max;
    const inY = cy >= roi.y_min && cy <= roi.y_max;

    return inX && inY;
}
