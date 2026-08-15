import { Redis } from 'ioredis';

/**
 * ==========================================
 * BULLMQ CONNECTION CONFIG (message queue)
 * ==========================================
 *
 * - RIÊNG BIỆT với connection cache (configs/redis.ts): BullMQ yêu cầu
 *   `maxRetriesPerRequest: null` (worker phải chờ vô hạn trên lệnh blocking) —
 *   KHÔNG được dùng chung client cache (đang set maxRetriesPerRequest: 3).
 * - Feature toggle dùng CHUNG ENABLE_REDIS / REDIS_URL với cache.
 * - Graceful degradation: Redis không ready → producer KHÔNG cố add.
 *   Người gọi (producer) tự fallback inline theo policy từng queue.
 */

const ENABLE_REDIS = process.env.ENABLE_REDIS?.trim().toLowerCase() === 'true';
const REDIS_URL = (process.env.REDIS_URL ?? '').trim();

const MAX_RETRY_ATTEMPTS = 3;
const CONNECT_TIMEOUT_MS = 2_000;

let queueRedis: Redis | null = null;
let queueDisabled = false;

export const isQueueRedisReady = (): boolean => {
  return !!queueRedis && queueRedis.status === 'ready';
};

export const getQueueRedis = (): Redis | null => (queueDisabled ? null : queueRedis);

/**
 * Tạo connection mới (dùng cho WORKER side — mỗi Worker có connection riêng).
 * - maxRetriesPerRequest: null — bắt buộc cho BullMQ worker.
 * - Trả null khi ENABLE_REDIS=false / thiếu REDIS_URL (worker không khởi động).
 */
export const createWorkerConnection = (): Redis | null => {
  if (!ENABLE_REDIS) return null;
  if (!REDIS_URL) return null;

  const workerRedis = new Redis(REDIS_URL, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: null,
    connectTimeout: CONNECT_TIMEOUT_MS,
    retryStrategy: (times: number) => {
      if (times > MAX_RETRY_ATTEMPTS) return null;
      return Math.min(times * 200, 1000);
    },
  });

  workerRedis.on('error', (error: Error) => {
    console.error('[Worker] Redis error:', error.message);
  });

  workerRedis.connect().catch((error: Error) => {
    console.error('[Worker] Lỗi connect ban đầu:', error.message);
  });

  return workerRedis;
};

/**
 * Khởi tạo connection dùng chung cho các QUQUE (producer side).
 * - ENABLE_REDIS=false / thiếu REDIS_URL → không connect, trả null (inline fallback).
 * - Luôn gắn error handler để 'error' không crash process.
 */
export const initQueueRedis = (): Redis | null => {
  if (queueRedis || queueDisabled) return queueRedis;

  if (!ENABLE_REDIS) {
    console.log('[Queue] ENABLE_REDIS=false — queue tắt, chạy hoàn toàn inline (fallback)');
    return null;
  }
  if (!REDIS_URL) {
    console.warn('[Queue] ENABLE_REDIS=true nhưng thiếu REDIS_URL — disabled (inline fallback)');
    queueDisabled = true;
    return null;
  }

  try {
    queueRedis = createWorkerConnection();
    if (!queueRedis) {
      queueDisabled = true;
      return null;
    }
  } catch (error) {
    console.error('[Queue] Khởi tạo connection thất bại:', error);
    queueRedis = null;
    queueDisabled = true;
    return null;
  }

  queueRedis.on('connect', () => console.log('[Queue] connect'));
  queueRedis.on('ready', () => console.log('[Queue] ready — bật BullMQ'));
  queueRedis.on('reconnecting', () => console.log('[Queue] reconnect'));
  queueRedis.on('close', () => console.log('[Queue] close'));
  queueRedis.on('end', () => console.log('[Queue] end — dừng retry, fallback inline'));

  return queueRedis;
};

/**
 * Chờ connection queue trở thành 'ready' (Redis connect là ASYNC — kẻo startWorkers
 * chạy ngay khi connection mới đang 'connecting' rồi bỏ qua worker một cách oan uổng).
 * - Đã ready ngay → resolve true.
 * - Chưa ready nhưng trở thành ready trong thời hạn → resolve true.
 * - Không kết nối được (down/mất mạng) → resolve false sau timeout, không crash.
 */
export const whenQueueRedisReady = (timeoutMs = 5_000): Promise<boolean> => {
  if (!queueRedis) return Promise.resolve(false);
  const conn = queueRedis;
  if (conn.status === 'ready') return Promise.resolve(true);

  return new Promise((resolve) => {
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      conn.off('ready', onReady);
      conn.off('end', onEnd);
      clearTimeout(timer);
      resolve(ok);
    };
    const onReady = () => done(true);
    const onEnd = () => done(false);
    const timer = setTimeout(() => done(false), timeoutMs);
    conn.once('ready', onReady);
    conn.once('end', onEnd);
  });
};

/**
 * Đóng producer connection (gọi lúc shutdown).
 */
export const shutdownQueueRedis = (): void => {
  if (queueRedis) {
    queueRedis.disconnect();
    queueRedis = null;
  }
  queueDisabled = true;
};
