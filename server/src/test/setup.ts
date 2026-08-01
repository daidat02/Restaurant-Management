import { beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { seedDatabase } from './seed.js';

beforeAll(async () => {
  // Connect một lần cho mỗi test file (Mongo Memory Server dùng chung từ globalSetup)
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_MEMORY_URI || '');
  }
  await seedDatabase();
});

afterAll(async () => {
  // Xoá toàn bộ DB để test file tiếp theo seed fresh
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
