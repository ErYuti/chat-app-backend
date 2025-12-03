import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const signup = async (req, res) => {
   const { fullname, email, password } = req.body;

   try {
    if (!fullname || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
    }

    const idx = Math.floor(Math.random() * 100) + 1;
    const randomPic = `https://avatar.iran.liara.run/public/${idx}.png`;
    
    const newUser = new User({
        fullname, 
        email, 
        password, 
        profilePic: randomPic 
    });

    await newUser.save();

    if (newUser) {
        const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' }); // Corrected 'uerId' and used '_id'
        
        res.cookie('jwt', token, {
            maxAge: 7 * 24 * 60 * 60 * 1000, 
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV === 'production',
        });

        res.status(201).json({
            _id: newUser._id,
            fullname: newUser.fullname,
            email: newUser.email,
            profilePic: newUser.profilePic,
            message: 'User registered successfully'
        });
    } else {
        res.status(400).json({ message: "Invalid user data" });
    }

   } catch (error) {
    console.error("Error in signup controller:", error.message);
    res.status(500).json({ message: 'Server error' });
   }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        const isPasswordCorrect = await user?.comparePassword(password) || false;

        if (!user || !isPasswordCorrect) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: '15d',
        });

        res.cookie("jwt", token, {
            maxAge: 15 * 24 * 60 * 60 * 1000, 
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV !== "development",
        });

        res.status(200).json({
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            profilePic: user.profilePic,
            isOnBoarded: user.isOnBoarded, 
        });

    } catch (error) {
        console.error("Error in login controller:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const logout = (req, res) => {
    res.cookie('jwt');
    res.status(200).json({ message: 'Logout successful' });
    
};

export const updateUserProfile = async (req, res) => {
   const { fullname, bio, nativeLanguage, learningLanguage, location, dob, phone, profilePic: generatedProfilePicUrl } = req.body;
    const userId = req.user._id;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.fullname = fullname || user.fullname;
        user.bio = bio || user.bio;
        user.nativeLanguage = nativeLanguage || user.nativeLanguage;
        user.learningLanguage = learningLanguage || user.learningLanguage;
        user.location = location || user.location;
        // user.profilePic = profilePic || user.profilePic;
        user.dob = dob || user.dob;
        user.phone = phone || user.phone;
        user.isOnBoarded = true; 

         if (req.file) {
            user.profilePic = req.file.path; 
        } 
        else if (generatedProfilePicUrl) {
            user.profilePic = generatedProfilePicUrl;
        }
        const updatedUser = await user.save();

        res.status(200).json({
            _id: updatedUser._id,
            fullname: updatedUser.fullname,
            email: updatedUser.email,
            profilePic: updatedUser.profilePic,
            isOnBoarded: updatedUser.isOnBoarded,
            message: "Profile updated successfully",
        });

    } catch (error) {
        console.error("Error in updateUserProfile controller:", error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getMe = async (req, res) => {
    try {
        // req.user is attached by the protectRoute middleware
        const user = await User.findById(req.user._id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error("Error in getMe controller:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
};