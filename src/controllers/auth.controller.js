import User from "../models/User.js";
import Otp from "../models/Otp.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "../lib/email.js";

// -----------------------------------------------------
// 🍪 HELPER: COOKIE CONFIGURATION (CRITICAL)
// -----------------------------------------------------
const sendTokenCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("jwt", token, {
    maxAge: 15 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    // CRITICAL FOR LOCAL TESTING:
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction, // This will be false on localhost
    path: "/",
  });
};

// =============================
// 1. SEND OTP
// =============================
export const sendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) return res.status(400).json({ message: "Email is required" });

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ message: "Email already in use" });

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.deleteMany({ email });
    await Otp.create({ email, otp: otpCode });

    // Check if email actually sends
    const emailSent = await sendEmail(
      email,
      "Your OTP Code",
      `<h1>Your Code</h1><h2>${otpCode}</h2><p>Valid for 5 minutes.</p>`,
    );

    if (emailSent) {
      return res.status(200).json({ message: "OTP sent to email" });
    } else {
      return res
        .status(500)
        .json({ message: "Failed to send email. Check server logs." });
    }
  } catch (err) {
    console.error("OTP Error:", err);
    res.status(500).json({ message: "Server error during OTP process" });
  }
};

// =============================
// 2. SIGNUP
// =============================
export const signup = async (req, res) => {
  const { fullname, email, password, otp } = req.body;

  try {
    if (!fullname || !email || !password || !otp)
      return res.status(400).json({ message: "All fields required" });

    const isOtpValid = await Otp.findOne({ email, otp });
    if (!isOtpValid)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    if (await User.findOne({ email }))
      return res.status(400).json({ message: "Email already registered" });

    if (password.length < 8)
      return res
        .status(400)
        .json({ message: "Password must be ≥ 8 characters" });

    const avatarIndex = Math.floor(Math.random() * 100) + 1;
    const avatar = `https://avatar.iran.liara.run/public/${avatarIndex}.png`;

    const user = await User.create({
      fullname,
      email,
      password,
      profilePic: avatar,
    });

    await Otp.deleteMany({ email });

    // Generate Token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "15d",
    });

    // Send Cookie
    sendTokenCookie(res, token);

    res.status(201).json({
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// =============================
// 3. LOGIN
// =============================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(400).json({ message: "Invalid credentials" });

    // Generate Token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "15d",
    });

    // Send Cookie
    sendTokenCookie(res, token);

    res.status(200).json({
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      profilePic: user.profilePic,
      isOnBoarded: user.isOnBoarded,
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// =============================
// 4. LOGOUT
// =============================
export const logout = (req, res) => {
  // Clear the cookie by setting age to 0
  res.cookie("jwt", "", {
    maxAge: 0,
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
  });

  res.status(200).json({ message: "Logged out" });
};

// =============================
// 5. UPDATE USER PROFILE
// =============================
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const {
      fullname,
      bio,
      nativeLanguage,
      learningLanguage,
      location,
      dob,
      phone,
      profilePic: generatedProfilePicUrl,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.fullname = fullname || user.fullname;
    user.bio = bio || user.bio;
    user.nativeLanguage = nativeLanguage || user.nativeLanguage;
    user.learningLanguage = learningLanguage || user.learningLanguage;
    user.location = location || user.location;
    user.dob = dob || user.dob;
    user.phone = phone || user.phone;
    user.isOnBoarded = true;

    if (req.file) {
      user.profilePic = req.file.path;
    } else if (generatedProfilePicUrl) {
      user.profilePic = generatedProfilePicUrl;
    }

    await user.save();

    res.status(200).json({
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      profilePic: user.profilePic,
      isOnBoarded: user.isOnBoarded,
      message: "Profile updated successfully",
    });
  } catch (err) {
    console.error("UpdateProfile Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// =============================
// 6. GET CURRENT USER (/me)
// =============================
export const getMe = async (req, res) => {
  try {
    // req.user is set by the protectRoute middleware
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(req.user._id).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (err) {
    console.error("GetMe Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
