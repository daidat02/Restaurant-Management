import { Queue, type JobsOptions } from 'bullmq';
import { getQueueRedis, isQueueRedisReady } from './connection.js';

/**
 * ==========================================
 * QUEUE REGISTRY
 * ==========================================
 * Khai báo tập trung TÊN queue + OPTIONS mặc định (bảng Q5) để
 * producer / worker / shutdown dùng chung một nguồn sự thật.
 *
 * Queue được khởi tạo LAZY: chỉ tạo BullMQ Queue thật khi được dùng,
 * tránh kết nối Redis lúc server boot khi ENABLE_REDIS=false.
 */

export const QUEUE_NAMES = {
  paymentWebhook: 'payment-webhook',
  notification: 'notification',
  orderFanOut: 'order-fanout',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/** Một nguồn sự thật: options job + concurrency của WORKER cho từng queue (Q5). */
export interface QueueSpec {
  defaultJobOptions: JobsOptions;
  /** Concurrency của Worker xử lý queue này (Q5). */
  concurrency: number;
}

const SECOND = 1;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const QUEUE_SPECS: Record<QueueName, QueueSpec> = {
  'payment-webhook': {
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2 * SECOND * 1000 },
      removeOnComplete: { age: 7 * DAY, count: 1000 },
      removeOnFail: { age: 7 * DAY, count: 200 },
    },
    concurrency: 1,
  },
  notification: {
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1 * SECOND * 1000 },
      removeOnComplete: { age: 1 * DAY, count: 2000 },
      removeOnFail: { age: 7 * DAY, count: 100 },
    },
    concurrency: 5,
  },
  'order-fanout': {
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1 * SECOND * 1000 },
      removeOnComplete: { age: 1 * DAY, count: 2000 },
      removeOnFail: { age: 7 * DAY, count: 100 },
    },
    concurrency: 5,
  },
};

/** Tên các queue (để worker loop). */
export const QUEUE_NAME_LIST = Object.values(QUEUE_NAMES);

const queueInstances = new Map<QueueName, Queue>();

/**
 * Lấy (hoặc lazy-tạo) instance BullMQ Queue.
 * Redis không ready / queue disabled → trả null (producer tự fallback inline).
 */
export const getQueue = (name: QueueName): Queue | null => {
  const cached = queueInstances.get(name);
  if (cached) return cached;

  const redis = getQueueRedis();
  if (!redis || !isQueueRedisReady()) return null;

  const queue = new Queue(name, {
    connection: redis,
    defaultJobOptions: QUEUE_SPECS[name].defaultJobOptions,
  });
  queueInstances.set(name, queue);
  return queue;
};

/** Đóng toàn bộ queue (gọi lúc shutdown). */
export const closeAllQueues = async (): Promise<void> => {
  await Promise.all([...queueInstances.values()].map((queue) => queue.close()));
  queueInstances.clear();
};