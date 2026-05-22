import { v2 as cloudinary } from "cloudinary";

// Automatically reads CLOUDINARY_URL from process.env
cloudinary.config();

export default cloudinary;
