// backend/src/server.js
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

// IMPORTANT: MUST MATCH EXACT NETLIFY URL (NO SLASH)
const CLIENT_URL = "https://yuti-chatapp.netlify.app";


// -----------------------------------------------
// 🔐 HELMET (SECURITY HEADERS) — FIXED FOR SOCKET.IO
// -----------------------------------------------
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


// -----------------------------------------------
// 📋 MORGAN (LOGGING IN DEV)
// -----------------------------------------------
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}


// -----------------------------------------------
// 🌍 CORS — COMPLETELY FIXED FOR COOKIES
// -----------------------------------------------
app.use(
  cors({
    origin: CLIENT_URL,     // exact domain!
    credentials: true,      // allow cookies
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


// -----------------------------------------------
// 🧩 BODY PARSER + COOKIE PARSER
// -----------------------------------------------
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


// -----------------------------------------------
// 🚀 API ROUTES
// -----------------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);


// -----------------------------------------------
// 🟢 START SERVER
// -----------------------------------------------
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectDB();
});
