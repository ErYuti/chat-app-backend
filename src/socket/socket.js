import { Server } from "socket.io";
import http from "http";
import express from "express";
// --- FIX 1: Added the mandatory '.js' file extension ---
import Message from "../models/Message.js"; 

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173"], // Your frontend URL
        methods: ["GET", "POST"],
    },
});

// Renamed for consistency with frontend/backend controllers
export const getReceiverSocketId = (receiverId) => {
    return userSocketMap[receiverId];
};

const userSocketMap = {}; // { userId: socketId }

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    const userId = socket.handshake.query.userId;
    if (userId && userId !== "undefined") {
        userSocketMap[userId] = socket.id;
    }

    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // --- HANDLE TYPING INDICATORS ---
    socket.on("typing", ({ recipientId }) => {
        const receiverSocketId = getReceiverSocketId(recipientId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("typing");
        }
    });
    socket.on("stopTyping", ({ recipientId }) => {
        const receiverSocketId = getReceiverSocketId(recipientId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("stopTyping");
        }
    });

    // --- HANDLE MESSAGE DELIVERY & READ STATUS ---
    socket.on("markAsDelivered", ({ messageId, senderId }) => {
        const senderSocketId = getReceiverSocketId(senderId);
        if (senderSocketId) {
            io.to(senderSocketId).emit("messageDelivered", { messageId });
        }
    });

    socket.on("markAsRead", async ({ messageIds, senderId }) => {
        try {
            await Message.updateMany(
                { _id: { $in: messageIds } },
                { $set: { status: 'read' } }
            );
            const senderSocketId = getReceiverSocketId(senderId); // The original sender
            if (senderSocketId) {
                io.to(senderSocketId).emit("messagesRead", { messageIds });
            }
        } catch (error) {
            console.error("Error marking messages as read:", error);
        }
    });

    // --- FIX 2: ADDED COMPLETE VIDEO/AUDIO CALL LOGIC ---
    socket.on("callUser", ({ userToCall, signalData, from, name }) => {
        const userToCallSocketId = getReceiverSocketId(userToCall);
        if (userToCallSocketId) {
            io.to(userToCallSocketId).emit("callIncoming", { signal: signalData, from, name });
        }
    });

    socket.on("acceptCall", (data) => {
        const callerSocketId = getReceiverSocketId(data.to);
        if (callerSocketId) {
            io.to(callerSocketId).emit("callAccepted", data.signal);
        }
    });

    socket.on("callEnded", ({ to }) => {
        const recipientSocketId = getReceiverSocketId(to);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit("callEnded");
        }
    });

    // --- HANDLE DISCONNECT ---
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        delete userSocketMap[userId];
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
});

export { app, io, server };