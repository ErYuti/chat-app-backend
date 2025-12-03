import express from 'express';
import { upload } from '../lib/cloudinary.js';
import { login, logout, signup, updateUserProfile, getMe } from '../controllers/auth.controller.js';
import { protectRoute } from '../middleware/protectRoute.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.post('/update-profile', protectRoute, upload.single('profilePic'), updateUserProfile);
router.get('/me', protectRoute, getMe);

export default router;