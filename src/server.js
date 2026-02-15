// backend/server.js
import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import { app, server } from "./socket/socket.js";
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import messageRoutes from "./routes/message.route.js";
import { connectDB } from "./lib/db.js";

dotenv.config();

const PORT = process.env.PORT || 8000;
// CHANGE: Use the ENV variable with a fallback to localhost for testing
// ✅ REPLACE WITH THIS:
const CLIENT_URL =
  process.env.NODE_ENV === "production"
    ? "https://yuti-chatapp.netlify.app"
    : "http://localhost:5173";

// 🔐 Update Helmet connectSrc
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
          "https://avatar.iran.liara.run",
        ],
        connectSrc: [
          "'self'",
          CLIENT_URL,
          "http://localhost:8000",
          "ws://localhost:8000",
          "wss://api-node-chatapp.onrender.com",
        ],
      },
    },
  }),
);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// 🌍 CORS: Now dynamically uses CLIENT_URL (localhost:5173)
// 🌍 Update CORS
app.use(
  cors({
    origin: CLIENT_URL, // Must be http://localhost:5173, NOT *
    credentials: true, // Required for cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  }),
);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  connectDB();
});
