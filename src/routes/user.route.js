import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import { upload } from "../lib/cloudinary.js";
import {
  getRecommendedUsers,
  sendFriendRequest,
  acceptFriendRequest,
  getMyFriends,
  getFriendRequests,
  getSentFriendRequests,
  blockUser,
  getUserProfile,
  updateUserSettings,
  uploadChatWallpaper,
} from "../controllers/user.controller.js";

const router = express.Router();

router.use(protectRoute);

router.post(
  "/settings/wallpaper",
  upload.single("wallpaper"),
  uploadChatWallpaper
);

router.put("/settings", updateUserSettings);
router.get("/recommendations", getRecommendedUsers);
router.get("/friends", getMyFriends);
router.get("/friend-requests", getFriendRequests);
router.get("/friend-requests/sent", getSentFriendRequests);
router.post("/send-request/:id", sendFriendRequest);
router.post("/accept-request/:id", acceptFriendRequest);
router.get("/:id", getUserProfile);
router.post("/block/:id", blockUser);

export default router;
