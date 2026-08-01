import { MongoMemoryReplSet } from 'mongodb-memory-server';
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

// E2E không nên bị rate limit chặn
if (process.env.RATE_LIMIT_ENABLED === undefined) process.env.RATE_LIMIT_ENABLED = 'false';

const port = Number(process.env.PORT || 8000);

// E2E dùng Mongo Memory Server (replica set — OrderService dùng transaction) + seed dữ liệu chuẩn — KHÔNG đụng DB thật
const mongod = await MongoMemoryReplSet.create({
  replSet: { count: 1 },
  instanceOpts: [
    {
      args: [
        '--setParameter',
        'maxTransactionLockRequestTimeoutMillis=5000',
        '--setParameter',
        'transactionLifetimeLimitSeconds=60',
      ],
    },
  ],
});
await mongoose.connect(mongod.getUri());
await seedDatabase();
await mongoose.connection.syncIndexes();

const app = createApp();
const server = http.createServer(app);
initSocket(server);

server.listen(port, () => {
  console.log(`E2E server (Memory Server) running on :${port}`);
});
