// backend/controllers/auth.controller.js
import User from "../models/User.js";
import Otp from "../models/Otp.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "../lib/email.js";

// 🔐 Helper: send JWT cookie (correct settings for Netlify → Render)
const sendTokenCookie = (res, token) => {
    res.cookie("jwt", token, {
        httpOnly: true,
        secure: true,          // Required for HTTPS (Render)
        sameSite: "none",      // Required for cross-domain cookies (Netlify)
        path: "/",             // Allow all routes
        maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
    });
};

// =========================
// 1. SEND OTP
// =========================
export const sendOtp = async (req, res) => {
    const { email } = req.body;

    try {
        if (!email)
            return res.status(400).json({ message: "Email is required" });

        const exists = await User.findOne({ email });
        if (exists)
            return res.status(400).json({ message: "Email already registered" });

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        await Otp.deleteMany({ email });
        await Otp.create({ email, otp: otpCode });

        await sendEmail(
            email,
            "Your OTP Code",
            `<h2>Verification Code</h2><h1>${otpCode}</h1><p>Valid for 5 minutes.</p>`
        );

        res.json({ message: "OTP sent to email" });
    } catch (error) {
        console.error("OTP Error:", error);
        res.status(500).json({ message: "Failed to send OTP" });
    }
};

// =========================
// 2. SIGNUP
// =========================
export const signup = async (req, res) => {
    const { fullname, email, password, otp } = req.body;

    try {
        if (!fullname || !email || !password || !otp)
            return res.status(400).json({ message: "All fields required" });

        const isOtpValid = await Otp.findOne({ email, otp });
        if (!isOtpValid)
            return res.status(400).json({ message: "Invalid OTP" });

        if (await User.findOne({ email }))
            return res.status(400).json({ message: "Email already registered" });

        const avatarIndex = Math.floor(Math.random() * 100) + 1;
        const avatar = `https://avatar.iran.liara.run/public/${avatarIndex}.png`;

        const user = await User.create({
            fullname,
            email,
            password,
            profilePic: avatar,
        });

        await Otp.deleteMany({ email });

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: "15d",
        });

        sendTokenCookie(res, token);

        res.status(201).json({
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            profilePic: user.profilePic,
        });
    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// =========================
// 3. LOGIN
// =========================
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user)
            return res.status(400).json({ message: "Invalid credentials" });

        const valid = await user.comparePassword(password);
        if (!valid)
            return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: "15d",
        });

        sendTokenCookie(res, token);

        res.json({
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            profilePic: user.profilePic,
            isOnBoarded: user.isOnBoarded,
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// =========================
// 4. LOGOUT
// =========================
export const logout = (req, res) => {
    res.cookie("jwt", "", {
        maxAge: 0,
        secure: true,
        sameSite: "none",
        path: "/",
    });

    res.json({ message: "Logout successful" });
};

// =========================
// 5. GET LOGGED-IN USER
// =========================
export const getMe = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: "Unauthorized" });

        const user = await User.findById(req.user._id).select("-password");
        if (!user)
            return res.status(404).json({ message: "User not found" });

        res.json(user);
    } catch (error) {
        console.error("GetMe Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
