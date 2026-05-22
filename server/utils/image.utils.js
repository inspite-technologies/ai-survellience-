import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use uploads/unknown instead of uploads/unknown_faces
export const uploadsDir = path.join(__dirname, "../uploads", "unknown");

// Ensure the directory structure exists on server start
if (!fs.existsSync(uploadsDir)) {
  console.log("✅ Creating uploads/unknown directory...");
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Saves a Base64 string as a .jpg file
 * @param {string} base64 - The image data from the canvas
 * @param {string} id - The unique Unknown ID (e.g., UNKNOWN_1)
 * @returns {object|null} - Paths for DB and internal use
 */
export function saveBase64Image(base64, id) {
  try {
    if (!base64) {
      console.error("❌ No base64 image provided");
      return null;
    }

    // Remove the Base64 header (e.g., "data:image/jpeg;base64,")
    const data = base64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(data, "base64");
    
    const fileName = `${id}_${Date.now()}.jpg`;  // Added timestamp for uniqueness
    const fullDiskPath = path.join(uploadsDir, fileName);

    // Write the file to the physical disk
    fs.writeFileSync(fullDiskPath, buffer);
    
    console.log(`✅ Saved face image: /uploads/unknown/${fileName}`);

    // Return an object that matches your Controller's logic
    return {
      filepath: fullDiskPath,                     // Full path on the server hardware
      url: `/uploads/unknown/${fileName}`         // Public URL path for the browser
    };
  } catch (err) {
    console.error("❌ Error saving image to disk:", err);
    return null;
  }
}

/**
 * Deletes an image file from the disk
 * @param {string} relativeOrFullPath - The path stored in the DB
 */
export function deleteImageFile(relativeOrFullPath) {
  try {
    let absolutePath;
    
    // If it's a relative URL path like "/uploads/unknown/..."
    if (relativeOrFullPath.startsWith("/uploads")) {
      const filename = path.basename(relativeOrFullPath);
      absolutePath = path.join(uploadsDir, filename);
    } else {
      // It's already an absolute path
      absolutePath = relativeOrFullPath;
    }

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
      console.log("🗑️ Deleted image file:", absolutePath);
      return true;
    } else {
      console.log("⚠️ Image file not found:", absolutePath);
      return false;
    }
  } catch (err) {
    console.error("❌ Error deleting image file:", err);
    return false;
  }
}