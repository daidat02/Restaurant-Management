import { Redis } from 'ioredis';

/**
 * ==========================================
 * REDIS CACHE CONFIG
 * ==========================================
 *
 * - Feature toggle: ENABLE_REDIS=true mới bật (mặc định TẮT → chạy thuần DB).
 * - Nếu kết nối Redis thất bại: KHÔNG được làm sập app — tự fallback về gọi DB.
 * - Retry ngắn tối đa 3 lần (tránh treo ứng dụng), sau đó dừng hẳn và
 *   chờ recovery nền 30s tự connect lại khi Redis sống (self-heal).
 */

const ENABLE_REDIS = process.env.ENABLE_REDIS?.trim().toLowerCase() === 'true';
const REDIS_URL = (process.env.REDIS_URL ?? '').trim();

const RECOVERY_INTERVAL_MS = 30_000;
const MAX_RETRY_ATTEMPTS = 3;
const CONNECT_TIMEOUT_MS = 2_000;

let redisClient: Redis | null = null;
let recoveryTimer: NodeJS.Timeout | null = null;
let redisDisabled = false;

export const isRedisReady = (): boolean => {
  return !!redisClient && redisClient.status === 'ready';
};

export const getRedisClient = (): Redis | null => (redisDisabled ? null : redisClient);

const scheduleRecovery = (): void => {
  if (recoveryTimer) return;
  recoveryTimer = setInterval(() => {
    if (!redisClient || isRedisReady()) return;
    const { status } = redisClient;
    if (status === 'end' || status === 'close' || status === 'wait') {
      redisClient.connect().catch((error: Error) => {
        console.error('[Redis] Recovery connect thất bại:', error.message);
      });
    }
  }, RECOVERY_INTERVAL_MS);
};

/**
 * Khởi tạo Redis client (gọi 1 lần từ index.ts).
 * - ENABLE_REDIS=false hoặc thiếu REDIS_URL → không connect, trả null (fallback DB).
 * - Luôn gắn error handler để sự kiện 'error' không làm crash process.
 */
export const initRedis = (): Redis | null => {
  if (redisClient || redisDisabled) return redisClient;

  if (!ENABLE_REDIS) {
    console.log('[Redis] ENABLE_REDIS=false — chạy fallback toàn bộ qua Database');
    return null;
  }
  if (!REDIS_URL) {
    console.warn('[Redis] ENABLE_REDIS=true nhưng thiếu REDIS_URL — disabled (fallback DB)');
    redisDisabled = true;
    return null;
  }

  try {
    redisClient = new Redis(REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: MAX_RETRY_ATTEMPTS,
      connectTimeout: CONNECT_TIMEOUT_MS,
      retryStrategy: (times: number) => {
        // Retry ngắn tối đa 3 lần, sau đó dừng hẳn (chờ recovery nền 30s)
        if (times > MAX_RETRY_ATTEMPTS) return null;
        return Math.min(times * 200, 1000);
      },
    });
  } catch (error) {
    console.error('[Redis] Khởi tạo client thất bại:', error);
    redisClient = null;
    redisDisabled = true;
    return null;
  }

  redisClient.on('error', (error: Error) => {
    console.error('[Redis] error:', error.message);
  });
  redisClient.on('connect', () => console.log('[Redis] connect'));
  redisClient.on('ready', () => console.log('[Redis] ready — bật cache'));
  redisClient.on('reconnecting', () => console.log('[Redis] reconnect'));
  redisClient.on('close', () => console.log('[Redis] close'));
  redisClient.on('end', () => {
    console.log('[Redis] end — dừng retry, chờ recovery nền');
  });

  redisClient.connect().catch((error: Error) => {
    console.error('[Redis] Lỗi connect ban đầu:', error.message);
  });

  scheduleRecovery();
  return redisClient;
};

/**
 * Đóng Redis client + dừng recovery (gọi khi app shutdown).
 */
export const shutdownRedis = (): void => {
  if (recoveryTimer) {
    clearInterval(recoveryTimer);
    recoveryTimer = null;
  }
  if (redisClient) {
    redisClient.disconnect();
    redisClient = null;
  }
  redisDisabled = true;
};