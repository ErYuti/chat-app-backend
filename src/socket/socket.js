import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/Message.js";

const app = express();
const server = http.createServer(app);

// ✅ Make this dynamic
const CLIENT_URL = process.env.NODE_ENV === "production"
    ? "https://yuti-chatapp.netlify.app"
    : "http://localhost:5173";

const io = new Server(server, {
    cors: {
        origin: CLIENT_URL, // Specific URL here too
        methods: ["GET", "POST"],
        credentials: true
    },
});

export const getReceiverSocketId = (receiverId) => {
    return userSocketMap[receiverId];
};

const userSocketMap = {}; // { userId: socketId }

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;

    if (userId && userId !== "undefined") {
        userSocketMap[userId] = socket.id;
    }

    // Broadcast online users to everyone
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    socket.on("typing", ({ recipientId }) => {
        const receiverSocketId = getReceiverSocketId(recipientId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("typing", { senderId: userId });
        }
    });

    socket.on("stopTyping", ({ recipientId }) => {
        const receiverSocketId = getReceiverSocketId(recipientId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("stopTyping", { senderId: userId });
        }
    });

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
            const senderSocketId = getReceiverSocketId(senderId);
            if (senderSocketId) {
                io.to(senderSocketId).emit("messagesRead", { messageIds });
            }
        } catch (error) {
            console.error("Error marking messages as read:", error);
        }
    });

    // Call Logic
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

    socket.on("disconnect", () => {
        if (userId) delete userSocketMap[userId];
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
});

export { app, io, server };