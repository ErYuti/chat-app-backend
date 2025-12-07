import User from "../models/User.js";
import { io, getReceiverSocketId } from "../socket/socket.js";

export const uploadChatWallpaper = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No wallpaper file uploaded." });
    }
    const userId = req.user._id;
    const wallpaperUrl = req.file.path; // URL from Cloudinary

    // Find user and update their chatWallpaper field
    const user = await User.findByIdAndUpdate(
      userId,
      { chatWallpaper: wallpaperUrl },
      { new: true } // Return the updated document
    );

    res.status(200).json({
      message: "Wallpaper updated successfully",
      chatWallpaper: user.chatWallpaper,
    });
  } catch (error) {
    console.error("Error in uploadChatWallpaper:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateUserSettings = async (req, res) => {
  try {
    const { theme, chatWallpaper, fontSize } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (theme) user.theme = theme;
    if (chatWallpaper !== undefined) user.chatWallpaper = chatWallpaper;
    if (fontSize) user.fontSize = fontSize;

    const updatedUser = await user.save();

    res.status(200).json({
      theme: updatedUser.theme,
      chatWallpaper: updatedUser.chatWallpaper,
      fontSize: updatedUser.fontSize,
      message: "Settings updated successfully",
    });
  } catch (error) {
    console.error("Error in updateUserSettings:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const getRecommendedUsers = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const friends = currentUser.friends;
    const sentRequests = currentUser.friendRequestsSent;
    const receivedRequests = currentUser.friendRequestsReceived;

    const excludedIds = [
      ...friends,
      ...sentRequests,
      ...receivedRequests,
      req.user._id,
    ];

    const users = await User.find({ _id: { $nin: excludedIds } }).select(
      "-password"
    );
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const sendFriendRequest = async (req, res) => {
  try {
    const { id: recipientId } = req.params;
    const senderId = req.user._id;

    const recipient = await User.findById(recipientId);
    const sender = await User.findById(senderId);

    if (!recipient) return res.status(404).json({ message: "User not found" });

    if (
      recipient.friendRequestsReceived.includes(senderId) ||
      sender.friendRequestsSent.includes(recipientId)
    ) {
      return res.status(400).json({ message: "Friend request already sent." });
    }

    recipient.friendRequestsReceived.push(senderId);
    sender.friendRequestsSent.push(recipientId);

    await recipient.save();
    await sender.save();

    const recipientSocketId = getReceiverSocketId(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("newFriendRequest", sender);
    }

    res.status(200).json({ message: "Friend request sent" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const acceptFriendRequest = async (req, res) => {
  try {
    const { id: requesterId } = req.params;
    const recipientId = req.user._id;

    const requester = await User.findById(requesterId);
    const recipient = await User.findById(recipientId);

    recipient.friends.push(requesterId);
    requester.friends.push(recipientId);

    recipient.friendRequestsReceived = recipient.friendRequestsReceived.filter(
      (id) => !id.equals(requesterId)
    );
    requester.friendRequestsSent = requester.friendRequestsSent.filter(
      (id) => !id.equals(recipientId)
    );

    await recipient.save();
    await requester.save();

    const requesterSocketId = getReceiverSocketId(requesterId);
    if (requesterSocketId) {
      io.to(requesterSocketId).emit("friendRequestAccepted", recipient);
    }

    res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getMyFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "friends",
      "-password"
    );
    res.status(200).json(user.friends);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getFriendRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "friendRequestsReceived",
      "-password"
    );
    res.status(200).json(user.friendRequestsReceived);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("Error in getUserProfile:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const getSentFriendRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("friendRequestsSent", "-password")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user.friendRequestsSent);
  } catch (error) {
    console.error("Error in getSentFriendRequests:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const blockUser = async (req, res) => {
  try {
    const { id: userToBlockId } = req.params;
    const currentUserId = req.user._id;

    // Update Current User: Add to block, remove friend, remove pending requests
    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { blockedUsers: userToBlockId },
      $pull: { 
        friends: userToBlockId,
        friendRequestsSent: userToBlockId,
        friendRequestsReceived: userToBlockId
      },
    });

    // Update Blocked User: Add to block (optional, usually one-way block is enough, but two-way ensures separation), remove friend/requests
    await User.findByIdAndUpdate(userToBlockId, {
      $addToSet: { blockedUsers: currentUserId },
      $pull: { 
        friends: currentUserId,
        friendRequestsSent: currentUserId,
        friendRequestsReceived: currentUserId
      },
    });

    res.status(200).json({ message: "User blocked successfully" });
  } catch (error) {
    console.error("Error in blockUser controller:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};
