import { beforeAll, afterAll, vi } from 'vitest';
import mongoose from 'mongoose';
import { seedDatabase } from './seed.js';

// Chặn gửi email thật trong toàn bộ test suite (register-owner OTP, forgot-password,
// subscription email...) — không đụng SMTP ngoài đời. Test riêng (auth-otp) assert
// sendEmailAsync được gọi với payload đúng thay vì gửi thật.
vi.mock('../services/email.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/email.service.js')>();
  return {
    ...actual,
    sendEmailAsync: vi.fn().mockResolvedValue(undefined),
    sendEmailNow: vi.fn().mockResolvedValue(undefined),
  };
});

beforeAll(async () => {
  // Connect một lần cho mỗi test file (Mongo Memory Server dùng chung từ globalSetup)
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_MEMORY_URI || '');
  }
  await seedDatabase();
  // Chờ index build xong để tránh transient "catalog changes" khi transaction ghi ngay sau seed
  await mongoose.connection.syncIndexes();
});

afterAll(async () => {
  // Xoá toàn bộ DB để test file tiếp theo seed fresh
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
