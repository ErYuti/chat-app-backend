import express from "express";
import {
  getMessages,
  sendMessage,
  clearChat,
  deleteMessage,
  generateDownloadUrl, // <-- IMPORT THE NEW CONTROLLER
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/protectRoute.js";
import { upload } from "../lib/cloudinary.js";

const router = express.Router();

router.get("/:id", protectRoute, getMessages);
router.post("/send/:id", protectRoute, upload.single("file"), sendMessage);
router.delete("/clear/:id", protectRoute, clearChat);
router.delete("/:id", protectRoute, deleteMessage);

// --- NEW: ROUTE FOR SECURELY DOWNLOADING FILES ---
router.get("/download/:messageId", protectRoute, generateDownloadUrl);

export default router;
