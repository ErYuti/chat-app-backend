// backend/src/controllers/message.controller.js

import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { getReceiverSocketId, io } from "../socket/socket.js";
import { v2 as cloudinary } from "cloudinary"; // <-- IMPORT CLOUDINARY

export const sendMessage = async (req, res) => {
  try {
    const { message, fileType } = req.body; // fileType is now sent from frontend
    const file = req.file;
    const { id: recipientId } = req.params;
    const senderId = req.user._id;

    if (!message && !file) {
      return res
        .status(400)
        .json({ error: "Message content or file is required" });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, recipientId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, recipientId],
      });
    }

    const newMessage = new Message({
      senderId,
      receiverId: recipientId,
      message: message || "",
      fileUrl: file ? file.path : null,
      fileType: file ? fileType : null,
      fileName: file ? file.originalname : null,
    });

    if (newMessage) {
      conversation.messages.push(newMessage._id);
    }

    await Promise.all([conversation.save(), newMessage.save()]);

    const recipientSocketId = getReceiverSocketId(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const senderId = req.user._id;

    const conversation = await Conversation.findOne({
      participants: { $all: [senderId, userToChatId] },
    }).populate("messages");

    if (!conversation) return res.status(200).json([]);

    res.status(200).json(conversation.messages);
  } catch (error) {
    console.error("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const clearChat = async (req, res) => {
  try {
    const { id: otherUserId } = req.params;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, otherUserId] },
    });

    if (!conversation) {
      return res.status(200).json({ message: "No conversation to clear." });
    }

    // Delete all messages associated with the conversation
    await Message.deleteMany({ _id: { $in: conversation.messages } });

    // Clear the messages array in the conversation
    conversation.messages = [];
    await conversation.save();

    res.status(200).json({ message: "Chat cleared successfully" });
  } catch (error) {
    console.error("Error in clearChat controller:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const currentUserId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Only the sender can delete the message
    if (message.senderId.toString() !== currentUserId.toString()) {
      return res
        .status(403)
        .json({ error: "You are not authorized to delete this message" });
    }

    // Find the conversation and pull the message ID from its array
    await Conversation.findOneAndUpdate(
      { messages: messageId },
      { $pull: { messages: messageId } }
    );

    // Delete the message document itself
    await Message.findByIdAndDelete(messageId);

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error in deleteMessage controller:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};
export const generateDownloadUrl = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);

    if (!message || !message.fileUrl) {
      return res.status(404).json({ error: "File not found." });
    }

    // Extract the public_id from the full Cloudinary URL
    const publicIdWithFolder = message.fileUrl
      .split("/")
      .slice(-2)
      .join("/")
      .split(".")[0];

    // Generate a signed URL that is valid for 1 hour
    const url = cloudinary.utils.sign_url(publicIdWithFolder, {
      resource_type: "raw", // Use "raw" for non-image/video files like PDFs
      expires_at: Math.round(new Date().getTime() / 1000) + 3600, // Expires in 1 hour
      attachment: true, // Tells the browser to download instead of displaying
    });

    res.status(200).json({ downloadUrl: url });
  } catch (error) {
    console.error("Error generating download URL:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
