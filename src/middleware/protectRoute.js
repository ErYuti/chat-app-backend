// backend/middleware/protectRoute.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protectRoute = async (req, res, next) => {
    try {
        const token = req.cookies.jwt; // MUST match cookie name

        if (!token) {
            return res.status(401).json({ message: "Unauthorized - No token provided" });
        }

        // Validate token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find user
        const user = await User.findById(decoded.userId).select("-password");

        if (!user) {
            return res.status(401).json({ message: "Unauthorized - User not found" });
        }

        // Attach user to request
        req.user = user;

        next();
    } catch (error) {
        console.error("ProtectRoute Error:", error.message);
        return res.status(401).json({ message: "Unauthorized" });
    }
};
