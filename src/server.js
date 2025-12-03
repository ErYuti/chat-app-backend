// backend/server.js
import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser'; 
import { app, server } from './socket/socket.js';

import authRoutes from './routes/auth.route.js';
import userRoutes from './routes/user.route.js'
import messageRoutes from './routes/message.route.js';
import { connectDB } from './lib/db.js';

dotenv.config();
const PORT = process.env.PORT || 8000; 

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

//  Use the server from socket.js to listen
server.listen(PORT,  () => { console.log(`Server is running on http://localhost:${PORT}`);
  connectDB();
});