import { describe, it, expect } from 'vitest';
import DB_Connection from '../models/DB_Connection.js';
import { SEED_IDS } from './seed.js';
import { applySubscriptionState, assertRestaurantUsable } from '../services/subscription.service.js';

const day = 24 * 3600 * 1000;

async function makeRestaurant(overrides: Record<string, unknown>) {
  return DB_Connection.Restaurant.create({
    name: `Test ${Date.now()}`,
    email: `t${Date.now()}@nhamnhi.vn`,
    status: 'active',
    ownerId: SEED_IDS.adminX,
    subscription: 'active',
    ...overrides,
  });
}

describe('T3 — State machine subscription', () => {
  it('active + gói Miễn Phí (không paidUntil) → không đổi trạng thái', async () => {
    const r = await makeRestaurant({ currentPlanKey: 'free' });
    const state = await applySubscriptionState(String(r._id));
    expect(state?.subscription).toBe('active');
    expect(state?.changed).toBe(false);
    const fresh = await DB_Connection.Restaurant.findById(r._id).lean();
    expect((fresh as any).currentPlanKey).toBe('free');
    expect((fresh as any).paidUntil).toBeUndefined();
  });

  it('active + gói trả phí hết paidUntil → hạ về Miễn Phí (KHÔNG khoá) + audit + notification', async () => {
    const r = await makeRestaurant({
      currentPlanKey: 'basic',
      paidUntil: new Date(Date.now() - day),
    });
    const state = await applySubscriptionState(String(r._id));
    expect(state?.subscription).toBe('active');
    expect(state?.changed).toBe(true);
    const fresh = (await DB_Connection.Restaurant.findById(r._id).lean()) as any;
    expect(fresh.subscription).toBe('active');
    expect(fresh.currentPlanKey).toBe('free');
    expect(fresh.paidUntil).toBeUndefined();
    const log = (await DB_Connection.AuditLog.findOne({
      action: 'subscription.downgrade',
      'meta.reason': 'paid-expired',
    }).lean()) as any;
    expect(log).toBeTruthy();
    const noti = await DB_Connection.Notification.exists({
      restaurant: r._id,
      type: 'subscription',
      'data.event': 'subscription.downgrade',
    });
    expect(noti).toBeTruthy();
  });

  it('active + paidUntil hết hạn + có pendingPlanKey → áp dụng gói đã lên lịch hạ cấp + tính paidUntil theo chu kỳ', async () => {
    const r = await makeRestaurant({
      currentPlanKey: 'pro',
      paidUntil: new Date(Date.now() - day),
      pendingPlanKey: 'basic',
      pendingCycleMonths: 3,
    });
    const state = await applySubscriptionState(String(r._id));
    expect(state?.changed).toBe(true);
    expect(state?.subscription).toBe('active');
    const fresh = (await DB_Connection.Restaurant.findById(r._id).lean()) as any;
    expect(fresh.currentPlanKey).toBe('basic');
    expect(fresh.pendingPlanKey).toBeUndefined();
    expect(fresh.pendingCycleMonths).toBeUndefined();
    // paidUntil mới = now + 3 tháng
    const expected = Date.now() + 3 * 30 * day;
    expect((fresh.paidUntil as any).getTime()).toBeGreaterThan(expected - 1000);
    expect((fresh.paidUntil as any).getTime()).toBeLessThanOrEqual(expected + 1000);
    const log = (await DB_Connection.AuditLog.findOne({
      action: 'subscription.downgrade',
      'meta.reason': 'pending-downgrade-applied',
    }).lean()) as any;
    expect(log).toBeTruthy();
  });

  it('active + paidUntil hết hạn + pendingPlanKey nhưng thiếu pendingCycleMonths → mặc định 1 tháng', async () => {
    const r = await makeRestaurant({
      currentPlanKey: 'pro',
      paidUntil: new Date(Date.now() - day),
      pendingPlanKey: 'basic',
    });
    await applySubscriptionState(String(r._id));
    const fresh = (await DB_Connection.Restaurant.findById(r._id).lean()) as any;
    const expected = Date.now() + 30 * day;
    expect((fresh.paidUntil as any).getTime()).toBeGreaterThan(expected - 1000);
    expect((fresh.paidUntil as any).getTime()).toBeLessThanOrEqual(expected + 1000);
  });

  it('pending (chờ thanh toán) → applySubscriptionState giữ nguyên, không đổi trạng thái', async () => {
    const r = await makeRestaurant({ subscription: 'pending', currentPlanKey: 'basic' });
    const state = await applySubscriptionState(String(r._id));
    expect(state?.subscription).toBe('pending');
    expect(state?.changed).toBe(false);
    const fresh = await DB_Connection.Restaurant.findById(r._id).lean();
    expect((fresh as any).subscription).toBe('pending');
  });

  it('locked → applySubscriptionState giữ nguyên', async () => {
    const r = await makeRestaurant({
      subscription: 'locked',
      currentPlanKey: 'basic',
      paidUntil: new Date(Date.now() - day),
    });
    const state = await applySubscriptionState(String(r._id));
    expect(state?.subscription).toBe('locked');
    expect(state?.changed).toBe(false);
  });

  it('assertRestaurantUsable ném RESTAURANT_LOCKED khi locked', async () => {
    const r = await makeRestaurant({ subscription: 'locked' });
    await expect(assertRestaurantUsable(String(r._id))).rejects.toMatchObject({
      statusCode: 403,
      code: 'RESTAURANT_LOCKED',
    });
  });

  it('assertRestaurantUsable ném RESTAURANT_LOCKED khi pending', async () => {
    const r = await makeRestaurant({ subscription: 'pending' });
    await expect(assertRestaurantUsable(String(r._id))).rejects.toMatchObject({
      statusCode: 403,
      code: 'RESTAURANT_LOCKED',
    });
  });

  it('assertRestaurantUsable trả restaurant khi active (Miễn Phí hoặc trả phí còn hạn)', async () => {
    const r = await makeRestaurant({ currentPlanKey: 'free' });
    const rest = await assertRestaurantUsable(String(r._id));
    expect(String((rest as any)._id)).toBe(String(r._id));

    const r2 = await makeRestaurant({
      currentPlanKey: 'basic',
      paidUntil: new Date(Date.now() + 10 * day),
    });
    const rest2 = await assertRestaurantUsable(String(r2._id));
    expect(String((rest2 as any)._id)).toBe(String(r2._id));
  });
});
