import mongoose, { connect } from 'mongoose';
import { seedSuperAdmin, seedPlatformSetting } from '../scripts/seedAdmin.js';
export const connectDB = async () => {
  try {
    (await connect(process.env.MONGODB_URL || ''),
      console.log(`MongoDB connected ${mongoose.connection.name} successfully`));
    await seedSuperAdmin(); // Gọi hàm seedSuperAdmin sau khi kết nối thành công
    await seedPlatformSetting(); // Đảm bảo bản ghi cấu hình gateway nền tảng tồn tại
  } catch (error) {
    console.error('MongoDB connection failed:', error);
  }
};
