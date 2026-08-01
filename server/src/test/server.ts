import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import http from 'http';
import dotenv from 'dotenv';
import createApp from '../app.js';
import { initSocket } from '../configs/socketsConfig.js';
import { seedDatabase } from './seed.js';

dotenv.config();

// Đảm bảo secret luôn tồn tại khi chạy E2E (không phụ thuộc .env)
if (!process.env.JWT_ACCESS_SECRET) process.env.JWT_ACCESS_SECRET = 'e2e-access-secret';
if (!process.env.JWT_REFRESH_SECRET) process.env.JWT_REFRESH_SECRET = 'e2e-refresh-secret';

const port = Number(process.env.PORT || 8000);

// E2E dùng Mongo Memory Server + seed dữ liệu chuẩn — KHÔNG đụng DB thật
const mongod = await MongoMemoryServer.create();
await mongoose.connect(mongod.getUri());
await seedDatabase();

const app = createApp();
const server = http.createServer(app);
initSocket(server);

server.listen(port, () => {
  console.log(`E2E server (Memory Server) running on :${port}`);
});
