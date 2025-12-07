// backend/middleware/auth.middleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
    try {
        const token = req.cookies.jwt;

        if (!token)
            return res.status(401).json({ message: "No token, unauthorized" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = await User.findById(decoded.userId).select("-password");

        next();
    } catch (err) {
        console.error("Auth Middleware Error:", err);
        res.status(401).json({ message: "Unauthorized" });
    }
};
