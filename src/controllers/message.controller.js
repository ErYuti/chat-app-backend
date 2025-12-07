// backend/src/controllers/message.controller.js
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { getReceiverSocketId, io } from "../socket/socket.js";
import { v2 as cloudinary } from "cloudinary"; 

export const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const { id: recipientId } = req.params;
    const senderId = req.user._id;
    const file = req.file;

    if (!message && !file) {
      return res.status(400).json({ error: "Message content or file is required" });
    }

    let fileUrl = null;
    let fileType = null;
    let fileName = null;

    // Determine file type from MimeType (More Secure)
    if (file) {
      fileUrl = file.path;
      fileName = file.originalname;
      const mime = file.mimetype;

      if (mime.startsWith("image/")) fileType = "image";
      else if (mime.startsWith("video/")) fileType = "video";
      else if (mime.startsWith("audio/")) fileType = "audio";
      else fileType = "document"; // Default for PDFs, etc.
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
      fileUrl,
      fileType, // Derived from server, not req.body
      fileName,
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

    await Message.deleteMany({ _id: { $in: conversation.messages } });

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

    if (message.senderId.toString() !== currentUserId.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await Conversation.findOneAndUpdate(
      { messages: messageId },
      { $pull: { messages: messageId } }
    );

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

    // Safely extract public_id based on your folder structure
    // Assumes URL format: .../upload/v1234/folder/filename.ext
    const urlParts = message.fileUrl.split("/");
    // Get the part after the version number and folder
    const publicIdWithFolder = urlParts.slice(urlParts.length - 2).join("/").split(".")[0];

    const url = cloudinary.utils.sign_url(publicIdWithFolder, {
      resource_type: "raw", 
      expires_at: Math.round(new Date().getTime() / 1000) + 3600, 
      attachment: true, 
    });

    res.status(200).json({ downloadUrl: url });
  } catch (error) {
    console.error("Error generating download URL:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};