import http from 'http';
import dotenv from 'dotenv';
import { connectDB } from './configs/db.js';
import { initSocket } from './configs/socketsConfig.js';
import { initRedis, shutdownRedis } from './configs/redis.js';
import {
  initQueueRedis,
  isQueueRedisReady,
  shutdownQueueRedis,
  whenQueueRedisReady,
} from './queues/connection.js';
import { startWorkers, closeWorkers } from './queues/workers.js';
import { closeAllQueues, getQueue, QUEUE_NAMES } from './queues/queue.js';
import './jobs/index.js';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import createApp from './app.js';
import type { Queue } from 'bullmq/dist/esm/classes/index.js';

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

// Bull Board mount ở /api/queues — setBasePath PHẢI khớp với nơi mount router
// (khác nhau → bull-board redirect root về path sai → 404).
const setupBullBoard = async (): Promise<void> => {
  // Redis connect là ASYNC: đợi 'ready' trước khi tạo Queue, nếu không getQueue()
  // trả null → queuesToRegister rỗng → board không bao giờ được mount (404).
  if (!(await whenQueueRedisReady()) || !isQueueRedisReady()) {
    console.warn('[BullBoard] Redis queue không ready — bỏ qua mount /api/queues.');
    return;
  }

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/api/queues');

  const queuesToRegister = [
    getQueue(QUEUE_NAMES.notification),
    getQueue(QUEUE_NAMES.orderFanOut),
    getQueue(QUEUE_NAMES.paymentWebhook),
  ]
    .filter((q): q is Queue => Boolean(q))
    .map((q) => new BullMQAdapter(q));

  if (queuesToRegister.length > 0) {
    createBullBoard({
      queues: queuesToRegister,
      serverAdapter: serverAdapter,
    });
    app.use('/api/queues', serverAdapter.getRouter());
    console.log('[BullBoard] Mounted at /api/queues');
  }
};
await setupBullBoard();

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
