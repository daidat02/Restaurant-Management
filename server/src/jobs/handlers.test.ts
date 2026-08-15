import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QUEUE_NAMES } from '../queues/queue.js';

const { mockState, mockAdd } = vi.hoisted(() => {
  const mockAdd = vi.fn();
  const mockState = { ready: true };
  return { mockState, mockAdd };
});

vi.mock('../queues/connection.js', () => ({
  isQueueRedisReady: vi.fn(() => mockState.ready),
}));

vi.mock('../queues/queue.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../queues/queue.js')>();
  return {
    ...original,
    getQueue: vi.fn(() => ({ add: mockAdd })),
  };
});

import { addJob, clearJobHandlers, registerJobHandler } from './handlers.js';

describe('addJob — producer + graceful degradation', () => {
  beforeEach(() => {
    mockState.ready = true;
    mockAdd.mockReset();
    mockAdd.mockResolvedValue({});
    clearJobHandlers();
  });

  // ============ enqueue thành công ============
  it('Redis ready: enqueue thành công — KHÔNG chạy inline handler', async () => {
    const handler = vi.fn(async () => {});
    registerJobHandler('complete-payment', handler);

    await addJob(QUEUE_NAMES.paymentWebhook, 'complete-payment', { orderCode: 1001 });

    expect(mockAdd).toHaveBeenCalledWith('complete-payment', { orderCode: 1001 });
    expect(handler).not.toHaveBeenCalled();
  });

  // ============ Redis down → inline ============
  it('Redis không ready: BỎ enqueue, chạy inline handler đúng payload', async () => {
    mockState.ready = false;
    const handler = vi.fn(async () => {});
    registerJobHandler('complete-payment', handler);

    await addJob(QUEUE_NAMES.paymentWebhook, 'complete-payment', { orderCode: 1001 });

    expect(mockAdd).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith({ orderCode: 1001 });
  });

  it('Enqueue THẤT BẠI (Redis lỗi giữa chừng): chạy inline handler', async () => {
    mockAdd.mockRejectedValue(new Error('ECONNREFUSED'));
    const handler = vi.fn(async () => {});
    registerJobHandler('create-notification', handler);

    await addJob(QUEUE_NAMES.notification, 'create-notification', { targetRoom: 'r1' });

    expect(handler).toHaveBeenCalledWith({ targetRoom: 'r1' });
  });

  // ============ payment: inline lỗi → propagate ============
  it('payment-webhook: inline handler LỖI → lan truyền lỗi (propagate)', async () => {
    mockState.ready = false;
    registerJobHandler('complete-payment', async () => {
      throw new Error('payment inline fail');
    });

    await expect(addJob(QUEUE_NAMES.paymentWebhook, 'complete-payment', {})).rejects.toThrow(
      'payment inline fail',
    );
  });

  // ============ notification/order: inline lỗi → swallow ============
  it('notification: inline handler LỖI → NUỐT lỗi, không throw', async () => {
    mockState.ready = false;
    registerJobHandler('create-notification', async () => {
      throw new Error('notification inline fail');
    });

    await expect(
      addJob(QUEUE_NAMES.notification, 'create-notification', {}),
    ).resolves.toBeUndefined();
  });

  it('order-fanout: inline handler LỖI → NUỐT lỗi, không throw', async () => {
    mockState.ready = false;
    registerJobHandler('new-order', async () => {
      throw new Error('order inline fail');
    });

    await expect(addJob(QUEUE_NAMES.orderFanOut, 'new-order', {})).resolves.toBeUndefined();
  });

  // ============ handler chưa đăng ký ============
  it('Redis down + handler CHƯA đăng ký + payment → throw (propagate)', async () => {
    mockState.ready = false;
    await expect(addJob(QUEUE_NAMES.paymentWebhook, 'complete-payment', {})).rejects.toThrow(
      'Không có handler',
    );
  });

  it('Redis down + handler CHƯA đăng ký + notification → swallow (không throw)', async () => {
    mockState.ready = false;
    await expect(
      addJob(QUEUE_NAMES.notification, 'create-notification', {}),
    ).resolves.toBeUndefined();
  });
});