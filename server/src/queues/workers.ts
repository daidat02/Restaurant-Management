import { Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { createWorkerConnection, isQueueRedisReady, whenQueueRedisReady } from './connection.js';
import { QUEUE_NAME_LIST, QUEUE_SPECS, type QueueName } from './queue.js';
import { getJobHandler } from '../jobs/handlers.js';

/**
 * ==========================================
 * WORKER LIFECYCLE
 * ==========================================
 * startWorkers() — tạo 1 Worker/queue (Q9):
 *   - concurrency theo bảng Q5 (payment:1, notification:5, order-fanout:5).
 *   - processor lấy handler theo job.name từ registry (CÙNG handler với inline fallback).
 *   - log 'completed' (job OK + ms) / 'failed' (attempt + stack).
 *   - Worker có connection RIÊNG (không dùng chung producer connection).
 * Chỉ gọi trong index.ts — KHÔNG gọi trong createApp() (test không bật worker).
 */

interface QueueWorker {
  worker: Worker;
  connection: Redis;
}

let startedWorkers: QueueWorker[] = [];

export const startWorkers = async (): Promise<number> => {
  // Redis connect là ASYNC — đợi connection 'ready' (tối đa 5s) trước khi tạo worker,
  // tránh bỏ qua worker oan uổng vì chưa kịp ready. Redis down thật → resolve false, không crash.
  if (!(await whenQueueRedisReady())) {
    console.warn('[Worker] Redis queue không ready (timeout) — BỎ qua startWorkers (chạy fallback inline tạm thời).');
    return 0;
  }
  if (!isQueueRedisReady()) {
    console.warn('[Worker] Redis queue không ready — BỎ qua startWorkers (chạy fallback inline tạm thời).');
    return 0;
  }

  let activeCount = 0;
  for (const queueName of QUEUE_NAME_LIST) {
    const connection = createWorkerConnection();
    if (!connection) continue;

    const worker = new Worker(
      queueName,
      async (job) => {
        const handler = getJobHandler(job.name);
        if (!handler) {
          throw new Error(`[Worker] Không có handler đăng ký cho job "${job.name}"`);
        }
        await handler(job.data);
      },
      {
        connection,
        concurrency: QUEUE_SPECS[queueName as QueueName].concurrency,
      },
    );

    worker.on('completed', (job) => {
      const durationMs = job.finishedOn && job.processedOn ? job.finishedOn - job.processedOn : 0;
      console.log(`[Worker] ${queueName}:${job.name} OK (${durationMs}ms)`);
    });

    worker.on('failed', (job, error) => {
      const attempt = job ? job.attemptsMade + 1 : 0;
      console.error(`[Worker] ${queueName}:${job?.name ?? 'unknown'} FAIL attempt=${attempt}:`, error.message);
      if (error.stack) console.error('[Worker] stack:', error.stack);
    });

    startedWorkers.push({ worker, connection });
    activeCount += 1;
  }

  console.log(`[Worker] Đã khởi động ${activeCount}/${QUEUE_NAME_LIST.length} worker cho queue: ${QUEUE_NAME_LIST.join(', ')}`);
  return activeCount;
};

/** Đóng toàn bộ worker (đợi job active ≤5s rồi ngắt connection). Gọi lúc shutdown. */
export const closeWorkers = async (): Promise<void> => {
  const done = startedWorkers.map(async ({ worker, connection }) => {
    const closePromise = worker.close().finally(() => connection.disconnect());
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 5000));
    await Promise.race([closePromise, timeout]);
  });
  await Promise.all(done);
  startedWorkers = [];
};