// backend/src/server.js
import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import morgan from 'morgan';   // <--- IMPORT MORGAN
import helmet from 'helmet';   // <--- IMPORT HELMET
import { app, server } from './socket/socket.js';

import authRoutes from './routes/auth.route.js';
import userRoutes from './routes/user.route.js'
import messageRoutes from './routes/message.route.js';
import { connectDB } from './lib/db.js';

dotenv.config();
const PORT = process.env.PORT || 8000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// --- MIDDLEWARES ---

// 1. HELMET: Sets various HTTP headers for security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Allow images from Cloudinary and the Avatar API
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://avatar.iran.liara.run"],
      // Allow connections to your backend/socket
      connectSrc: ["'self'", CLIENT_URL], 
    },
  },
}));

// 2. MORGAN: Logs requests to the console (only in development)
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// 3. CORS: Allows your frontend to talk to this backend
app.use(cors({
    origin: CLIENT_URL,
    credentials: true, // Allows cookies (JWT) to be sent
}));

// 4. Body Parsers
app.use(express.json({ limit: "4mb" })); // Limit payload size
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

// --- SERVER START ---
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    connectDB();
});