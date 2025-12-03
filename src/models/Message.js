// backend/src/models/Message.js

import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        message: { // Text content of the message
            type: String,
        },
        fileUrl: { // URL for any attached file (image, audio, doc)
            type: String, 
        },
        fileType: { // e.g., 'image', 'audio', 'video', 'document'
            type: String,
        },
        fileName: { // Original name of the file, e.g., 'contract.pdf'
            type: String,
        },
        status: {
            type: String,
            enum: ['sent', 'delivered', 'read'],
            default: 'sent',
        },
    },
    { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;