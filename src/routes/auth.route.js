// backend/routes/auth.route.js
import express from "express";
import { upload } from "../lib/cloudinary.js";

import {
    sendOtp,
    signup,
    login,
    logout,
    updateUserProfile,
    getMe,
} from "../controllers/auth.controller.js";

import { protectRoute } from "../middleware/protectRoute.js";

const router = express.Router();

// 🔹 Send OTP
router.post("/send-otp", sendOtp);

// 🔹 Signup
router.post("/signup", signup);

// 🔹 Login
router.post("/login", login);

// 🔹 Logout
router.post("/logout", logout);

// 🔹 Update profile (protected + file upload)
router.post(
    "/update-profile",
    protectRoute,
    upload.single("profilePic"),
    updateUserProfile
);

// 🔹 Get logged-in user
router.get("/me", protectRoute, getMe);

export default router;
