import { isRedisReady, getRedisClient } from '../configs/redis.js';

/**
 * ==========================================
 * CACHE WRAPPER GENERIC
 * ==========================================
 *
 * - getOrSetCache(key, fallbackAsyncFn, ttlSeconds):
 *   + Redis BẬT + READY: đọc Redis. Hit → trả parse JSON.
 *   + Cache Miss / Redis TẮT / LỖI: chạy fallbackAsyncFn (query Database chính).
 *     Nếu Redis đang ready và lấy được data từ DB → tự SET kèm TTL.
 *   + KHÔNG bao giờ throw lỗi Redis ra ngoài (app không crash, fallback DB).
 * - invalidateCache(keyOrPattern): xoá cache khi dữ liệu gốc thay đổi.
 *   Redis tắt → no-op, không báo lỗi. Pattern chứa '*' → SCAN (không dùng KEYS ở prod).
 */

/** Chuẩn hoá dữ liệu thành plain JSON để lưu cache (khử metadata Mongoose). */
export const toPlainJson = <T>(data: T): T => JSON.parse(JSON.stringify(data)) as T;

const logCacheError = (context: string, error: unknown): void => {
  console.error(`[Cache] ${context}:`, error instanceof Error ? error.message : String(error));
};

/**
 * Đọc cache thuần (không fallback). Không ready → null; GET lỗi/parse lỗi → null (miss).
 */
export const getCache = async <T>(key: string): Promise<T | null> => {
  if (!isRedisReady()) return null;
  const client = getRedisClient();
  if (!client) return null;
  try {
    const raw = await client.get(key);
    if (raw === null || raw === undefined || raw === '') return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    logCacheError(`getCache "${key}"`, error);
    return null;
  }
};

/**
 * Helper ghi cache (không throw — lỗi ghi không làm hỏng nghiệp vụ chính).
 */
const setCache = async <T>(key: string, data: T, ttlSeconds: number): Promise<void> => {
  if (!isRedisReady()) return;
  const client = getRedisClient();
  if (!client) return;
  try {
    const serialized = JSON.stringify(toPlainJson(data));
    if (ttlSeconds > 0) {
      await client.set(key, serialized, 'EX', ttlSeconds);
    } else {
      await client.set(key, serialized);
    }
  } catch (error) {
    logCacheError(`setCache "${key}"`, error);
  }
};

/**
 * Helper chính: đọc-có-fallback. Cache hit → trả dữ liệu parse.
 * Cache miss / Redis tắt / lỗi → chạy fallbackAsyncFn (DB), trả kết quả,
 * rồi cố gắng lưu cache kèm TTL nếu Redis đang ready (best-effort).
 */
export const getOrSetCache = async <T>(
  key: string,
  fallbackAsyncFn: () => Promise<T>,
  ttlSeconds: number,
): Promise<T> => {
  const cached = await getCache<T>(key);
  if (cached) {
    console.log(`[Cache Hit] Key: ${key}`);
  }
  if (cached !== null) return cached;
  const data = await fallbackAsyncFn();
  await setCache(key, data, ttlSeconds);
  return data;
};

/**
 * Xoá cache theo key hoặc pattern (chứa '*'). Redis tắt → bỏ qua không lỗi.
 * Pattern → SCAN + DEL (cấm KEYS ở production).
 */
export const invalidateCache = async (keyOrPattern: string): Promise<void> => {
  if (!isRedisReady()) return;
  const client = getRedisClient();
  if (!client) return;
  try {
    if (keyOrPattern.includes('*')) {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await client.scan(cursor, 'MATCH', keyOrPattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await client.del(...keys);
        }
      } while (cursor !== '0');
      return;
    }
    await client.del(keyOrPattern);
  } catch (error) {
    logCacheError(`invalidateCache "${keyOrPattern}"`, error);
  }
};
