// backend/server.js
import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';

import { app, server } from './socket/socket.js';

import authRoutes from './routes/auth.route.js';
import userRoutes from './routes/user.route.js';
import messageRoutes from './routes/message.route.js';
import { connectDB } from './lib/db.js';

dotenv.config();

const PORT = process.env.PORT || 8000;

// IMPORTANT: Must EXACTLY match Netlify domain
const CLIENT_URL = "https://yuti-chatapp.netlify.app";

// -----------------------------------------------------
// 🔐 SECURITY HEADERS (HELMET) — FIXED FOR SOCKET.IO
// -----------------------------------------------------
app.use(
    helmet({
        crossOriginResourcePolicy: false,
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                imgSrc: [
                    "'self'",
                    "data:",
                    "https://res.cloudinary.com",
                    "https://avatar.iran.liara.run"
                ],
                connectSrc: [
                    "'self'",
                    CLIENT_URL,
                    "https://api-node-chatapp.onrender.com",
                    "wss://api-node-chatapp.onrender.com"
                ],
            },
        },
    })
);

// -----------------------------------------------------
// 📝 REQUEST LOGGER
// -----------------------------------------------------
if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
}

// -----------------------------------------------------
// 🌍 CORS (MOST IMPORTANT PART)
// -----------------------------------------------------
app.use(
    cors({
        origin: CLIENT_URL, // must match EXACTLY
        credentials: true,  // allow cookies
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"]
    })
);

// -----------------------------------------------------
// 🧩 PARSERS
// -----------------------------------------------------
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// -----------------------------------------------------
// 🚀 ROUTES
// -----------------------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);

// -----------------------------------------------------
// 🟢 START SERVER
// -----------------------------------------------------
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    connectDB();
});
