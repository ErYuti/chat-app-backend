import mongoose from 'mongoose'; // Corrected typo from 'moogoose'

// Function to connect to MongoDB
export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URL); 
        console.log(`MongoDB connected successfully: ${conn.connection.host}`);
    } catch (error) {
        console.error('MongoDB connection error:', error.message); 
        process.exit(1); 
    }
};