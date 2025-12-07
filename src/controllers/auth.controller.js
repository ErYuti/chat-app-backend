import User from '../models/User.js';
import Otp from '../models/Otp.js'; // Import OTP model
import jwt from 'jsonwebtoken';
import { sendEmail } from '../lib/email.js'; // Import email helper

// 1. Generate and Send OTP
export const sendOtp = async (req, res) => {
    const { email } = req.body;
    try {
        if (!email) return res.status(400).json({ message: "Email is required" });
        
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "Email already in use" });

        // Generate 6 digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Save to DB (hashed or plain - for simplicity we do plain here, but hashing is better for prod)
        // Delete old OTPs for this email first
        await Otp.deleteMany({ email });
        await Otp.create({ email, otp: otpCode });

        // Send Email
        const emailContent = `
            <h1>Verify your Email</h1>
            <p>Your verification code for Streamify is:</p>
            <h2 style="color: #4F46E5;">${otpCode}</h2>
            <p>This code expires in 5 minutes.</p>
        `;
        
        await sendEmail(email, "Streamify Verification Code", emailContent);

        res.status(200).json({ message: "OTP sent to your email" });

    } catch (error) {
        console.error("Error sending OTP:", error);
        res.status(500).json({ message: "Failed to send OTP" });
    }
};

// 2. Signup (Verifies OTP + Creates User)
export const signup = async (req, res) => {
   const { fullname, email, password, otp } = req.body;

   try {
    if (!fullname || !email || !password || !otp) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    // Verify OTP
    const validOtp = await Otp.findOne({ email, otp });
    if (!validOtp) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (password.length < 8) { // Stronger password requirement
        return res.status(400).json({ message: 'Password must be at least 8 characters' });
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

    // Delete used OTP
    await Otp.deleteMany({ email });

    if (newUser) {
        const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        res.cookie('jwt', token, {
            maxAge: 7 * 24 * 60 * 60 * 1000, 
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV !== 'development', // Corrected logic
        });

        // Send Welcome Email
        const welcomeContent = `
            <h1>Welcome to Streamify, ${fullname}!</h1>
            <p>Your account has been successfully created.</p>
            <p>Please complete your profile to start chatting.</p>
        `;
        sendEmail(email, "Welcome to Streamify!", welcomeContent);

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

// 3. Login (Unchanged, just ensuring export)
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

// 4. Logout (Unchanged)
export const logout = (req, res) => {
    res.cookie('jwt', '', { maxAge: 0 }); // Properly clear cookie
    res.status(200).json({ message: 'Logout successful' });
};

// 5. Update Profile (Updated to send email)
export const updateUserProfile = async (req, res) => {
   const { fullname, bio, nativeLanguage, learningLanguage, location, dob, phone, profilePic: generatedProfilePicUrl } = req.body;
    const userId = req.user._id;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if this is the first time onboarding
        const isFirstTime = !user.isOnBoarded;

        user.fullname = fullname || user.fullname;
        user.bio = bio || user.bio;
        user.nativeLanguage = nativeLanguage || user.nativeLanguage;
        user.learningLanguage = learningLanguage || user.learningLanguage;
        user.location = location || user.location;
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

        // Send Profile Completion Email if first time
        if (isFirstTime) {
             const completionContent = `
                <h1>Profile Completed!</h1>
                <p>Great job, ${updatedUser.fullname}!</p>
                <p>Your profile is now set up. Go find some friends!</p>
            `;
            sendEmail(updatedUser.email, "Profile Setup Complete", completionContent);
        }

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