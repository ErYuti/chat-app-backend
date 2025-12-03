import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "streamify_chat_files", // Changed folder name for clarity
    // --- FIX: Let Cloudinary automatically detect the file type ---
    // This allows images, audio, videos, and raw files (like PDFs) to be uploaded.
    resource_type: "auto",
  },
});

export const upload = multer({ storage: storage });
