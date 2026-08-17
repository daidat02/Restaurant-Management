import { describe, it, expect } from 'vitest';
import DB_Connection from '../models/DB_Connection.js';
import { SEED_IDS } from './seed.js';
import {
  applySubscriptionState,
  assertRestaurantUsable,
  TRIAL_DAYS,
} from '../services/subscription.service.js';

const day = 24 * 3600 * 1000;

async function makeRestaurant(overrides: Record<string, unknown>) {
  return DB_Connection.Restaurant.create({
    name: `Test ${Date.now()}`,
    email: `t${Date.now()}@nhamnhi.vn`,
    status: 'active',
    ownerId: SEED_IDS.adminX,
    subscription: 'trial',
    ...overrides,
  });
}

describe('T3 — State machine subscription', () => {
  it('trial còn nhiều ngày → không đổi trạng thái', async () => {
    const r = await makeRestaurant({ trialEndsAt: new Date(Date.now() + 20 * day) });
    const state = await applySubscriptionState(String(r._id));
    expect(state?.subscription).toBe('trial');
    expect(state?.changed).toBe(false);
  });

  it('trial còn 7 ngày → audit subscription.expiring + notification', async () => {
    const r = await makeRestaurant({ trialEndsAt: new Date(Date.now() + 7 * day) });
    await applySubscriptionState(String(r._id));
    const log = (await DB_Connection.AuditLog.findOne({ action: 'subscription.expiring' }).lean()) as any;
    expect(log).toBeTruthy();
    const noti = await DB_Connection.Notification.exists({
      restaurant: r._id,
      type: 'subscription',
      'data.event': 'subscription.expiring',
    });
    expect(noti).toBeTruthy();
    // Không lặp lại nhắc lần 2
    await applySubscriptionState(String(r._id));
    const count = await DB_Connection.Notification.countDocuments({
      restaurant: r._id,
      type: 'subscription',
      'data.event': 'subscription.expiring',
    });
    expect(count).toBe(1);
  });

  it('trial quá hạn → locked + audit + notification', async () => {
    const r = await makeRestaurant({ trialEndsAt: new Date(Date.now() - day) });
    const state = await applySubscriptionState(String(r._id));
    expect(state?.subscription).toBe('locked');
    expect(state?.changed).toBe(true);
    const log = (await DB_Connection.AuditLog.findOne({ action: 'subscription.locked' }).lean()) as any;
    expect(log).toBeTruthy();
    const fresh = await DB_Connection.Restaurant.findById(r._id).lean();
    expect((fresh as any).subscription).toBe('locked');
  });

  it('active quá paidUntil → locked', async () => {
    const r = await makeRestaurant({
      subscription: 'active',
      paidUntil: new Date(Date.now() - day),
    });
    const state = await applySubscriptionState(String(r._id));
    expect(state?.subscription).toBe('locked');
    expect(state?.changed).toBe(true);
  });

  it('assertRestaurantUsable ném RESTAURANT_LOCKED khi locked', async () => {
    const r = await makeRestaurant({ trialEndsAt: new Date(Date.now() - day) });
    await expect(assertRestaurantUsable(String(r._id))).rejects.toMatchObject({
      statusCode: 403,
      code: 'RESTAURANT_LOCKED',
    });
  });

  it('pending (chờ thanh toán) → applySubscriptionState giữ nguyên, không đổi trạng thái', async () => {
    const r = await makeRestaurant({ subscription: 'pending', trialEndsAt: new Date(Date.now() - day) });
    const state = await applySubscriptionState(String(r._id));
    expect(state?.subscription).toBe('pending');
    expect(state?.changed).toBe(false);
    const fresh = await DB_Connection.Restaurant.findById(r._id).lean();
    expect((fresh as any).subscription).toBe('pending');
  });

  it('assertRestaurantUsable ném RESTAURANT_LOCKED khi pending', async () => {
    const r = await makeRestaurant({ subscription: 'pending' });
    await expect(assertRestaurantUsable(String(r._id))).rejects.toMatchObject({
      statusCode: 403,
      code: 'RESTAURANT_LOCKED',
    });
  });

  it('assertRestaurantUsable trả restaurant khi còn dùng được', async () => {
    const r = await makeRestaurant({ trialEndsAt: new Date(Date.now() + 10 * day) });
    const rest = await assertRestaurantUsable(String(r._id));
    expect(String((rest as any)._id)).toBe(String(r._id));
    expect(TRIAL_DAYS).toBe(30);
  });
});
