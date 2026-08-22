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

// Endpoint test-only: đọc mã OTP xác thực email từ Memory Server.
// Lý do: E2E không có SMTP/Redis thật nên spec không thể nhận email —
// route nằm ngoài /api và chỉ tồn tại trong binary e2e (dist/test/server.js).
app.get('/__e2e__/otp', async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ message: 'Thiếu email' });
  const user = await mongoose.connection.collection('users').findOne({ email });
  if (!user || !user.emailOtp) return res.status(404).json({ message: 'Không tìm thấy OTP' });
  return res.json({ data: { otp: user.emailOtp } });
});

const server = http.createServer(app);
initSocket(server);

server.listen(port, () => {
  console.log(`E2E server (Memory Server) running on :${port}`);
});
