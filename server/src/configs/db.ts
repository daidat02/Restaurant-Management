import mongoose,{connect}  from "mongoose";

export const connectDB = async () => {
    try {
        await connect(process.env.MONGODB_URL || ''),
        console.log(`MongoDB connected ${mongoose.connection.name} successfully`);
    } catch (error) {
        console.error('MongoDB connection failed:', error);
    }
}