import http from 'http';
import dotenv from 'dotenv';
import { connectDB } from './configs/db.js';
import { initSocket } from './configs/socketsConfig.js';
import { initRedis, shutdownRedis } from './configs/redis.js';
import { initQueueRedis, shutdownQueueRedis } from './queues/connection.js';
import { startWorkers, closeWorkers } from './queues/workers.js';
import { closeAllQueues } from './queues/queue.js';
import './jobs/index.js';
import createApp from './app.js';

dotenv.config();

const app = createApp();
const server = http.createServer(app);
//Khởi tạo server socketIO
initSocket(server);

// Kết nối cơ sở dữ liệu MongoDB
connectDB();

// Kết nối Redis cache (opt-in; thất bại → fallback DB, không crash)
initRedis();

// Kết nối Redis queue (BullMQ) — riêng client, cùng ENABLE_REDIS/REDIS_URL
initQueueRedis();

// Khởi động worker xử lý job nền (không bật khi Redis tắt — producer tự fallback inline)
await startWorkers();

app.get('/healthz', (req, res) => res.status(200).send('OK'));

server.listen(process.env.PORT, () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});

// Đóng worker + Redis sạch sẽ khi shutdown (đợi job active ≤5s)
const gracefulShutdown = async () => {
  console.log('Shutdown: closing workers...');
  await closeWorkers();
  await closeAllQueues();
  shutdownQueueRedis();
  shutdownRedis();
  process.exit(0);
};
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
