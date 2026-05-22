import fs from "fs";
import path from "path";

export function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function deleteFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export const uploadsDir = path.join(process.cwd(), "uploads");
ensureDirExists(uploadsDir);
