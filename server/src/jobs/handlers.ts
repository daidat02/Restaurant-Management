import { isQueueRedisReady } from '../queues/connection.js';
import { getQueue, QUEUE_NAMES, type QueueName } from '../queues/queue.js';

/**
 * ==========================================
 * JOB HANDLER REGISTRY
 * ==========================================
 *
 * Mỗi job (payment / notification / order) đăng ký 1 handler DUY NHẤT qua
 * `registerJobHandler`. Handler được dùng ở 2 chỗ:
 *   - WORKER: jobs/workers.ts lấy handler theo job.name xử lý nền.
 *   - PRODUCER falback INLINE: khi Redis queue không ready / enqueue lỗi,
 *     producer chạy CÙNG handler này đồng bộ (graceful degradation Q4).
 * Nhờ registry này mà worker và inline fallback KHÔNG lệch logic.
 */

export type JobHandler<T = unknown> = (payload: T) => Promise<void> | void;

const handlers = new Map<string, JobHandler>();

export const registerJobHandler = <T = unknown>(jobName: string, handler: JobHandler<T>): void => {
  handlers.set(jobName, handler as JobHandler);
};

export const getJobHandler = (jobName: string): JobHandler | undefined => handlers.get(jobName);

/** Test helper: đặt lại toàn bộ registry (dùng trong unit test). */
export const clearJobHandlers = (): void => {
  handlers.clear();
};

/**
 * Fallback policy theo queue (Q4):
 *  - 'payment-webhook'  → INLINE lỗi → PROPAGATE (Controller bắt lỗi trả cho gateway).
 *  - 'notification'     → INLINE lỗi → SWALLOW + log (không hỏng luồng chính).
 *  - 'order-fanout'     → INLINE lỗi → SWALLOW + log.
 */
type FallbackPolicy = 'propagate' | 'swallow';

const FALLBACK_POLICY: Record<QueueName, FallbackPolicy> = {
  [QUEUE_NAMES.paymentWebhook]: 'propagate',
  [QUEUE_NAMES.notification]: 'swallow',
  [QUEUE_NAMES.orderFanOut]: 'swallow',
  [QUEUE_NAMES.email]: 'swallow',
};

const logDegraded = (context: string, jobName: string, error?: unknown): void => {
  const reason = error instanceof Error ? error.message : String(error);
  console.warn(`[Queue] ${context} "${jobName}" — chạy fallback inline: ${reason}`);
};

/**
 * Enqueue 1 job. Khi Redis queue không ready HOẶC enqueue thất bại:
 *  - Tìm handler đã đăng ký → chạy INLINE (cùng logic worker).
 *  - Handler chưa đăng ký: queue propagate → throw; queue swallow → log + bỏ qua.
 * Không bao giờ mã CRUD/route bị đợi chờ retry Redis.
 */
export const addJob = async (
  queueName: QueueName,
  jobName: string,
  payload: unknown,
): Promise<void> => {
  const runInline = async (): Promise<void> => {
    const handler = getJobHandler(jobName);
    if (!handler) {
      const message = `Không có handler đăng ký cho job "${jobName}"`;
      if (FALLBACK_POLICY[queueName] === 'propagate') {
        throw new Error(message);
      }
      console.warn(`[Queue] ${message} — bỏ qua (swallow).`);
      return;
    }
    try {
      await handler(payload);
    } catch (error) {
      if (FALLBACK_POLICY[queueName] === 'propagate') {
        throw error;
      }
      console.warn(`[Queue] Inline fallback thất bại "${jobName}" — swallow:`, error);
    }
  };

  if (!isQueueRedisReady()) {
    logDegraded('Redis queue không ready, skip enqueue', jobName);
    await runInline();
    return;
  }

  const queue = getQueue(queueName);
  if (!queue) {
    logDegraded('Không tạo được queue', jobName);
    await runInline();
    return;
  }

  try {
    await queue.add(jobName, payload);
  } catch (error) {
    logDegraded('Enqueue thất bại', jobName, error);
    await runInline();
  }
};