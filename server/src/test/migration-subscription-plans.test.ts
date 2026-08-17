import { describe, it, expect } from 'vitest';
import DB_Connection from '../models/DB_Connection.js';
import { SEED_IDS } from './seed.js';
import { migrateSubscriptionPlans } from '../scripts/migrate-subscription-plans.js';

const day = 24 * 3600 * 1000;

async function makeRestaurant(overrides: Record<string, unknown>) {
  return DB_Connection.Restaurant.create({
    name: `Migrate ${Date.now()}`,
    email: `migrate${Date.now()}@nhamnhi.vn`,
    status: 'active',
    ownerId: SEED_IDS.adminX,
    ...overrides,
  });
}

describe('T04 — Migration dữ liệu sang mô hình 4 gói', () => {
  it('trial → active + free, xoá trialEndsAt/paidUntil', async () => {
    const r = await makeRestaurant({
      subscription: 'trial',
      trialEndsAt: new Date(Date.now() + 10 * day),
      currentPlanKey: 'basic',
    });
    await migrateSubscriptionPlans();
    const fresh = (await DB_Connection.Restaurant.findById(r._id).lean()) as any;
    expect(fresh.subscription).toBe('active');
    expect(fresh.currentPlanKey).toBe('free');
    expect(fresh.trialEndsAt).toBeUndefined();
    expect(fresh.paidUntil).toBeUndefined();
  });

  it('active + gói trả phí → GIỮ NGUYÊN (grandfather)', async () => {
    const paidUntil = new Date(Date.now() + 30 * day);
    const r = await makeRestaurant({
      subscription: 'active',
      paidUntil,
      currentPlanKey: 'pro',
    });
    await migrateSubscriptionPlans();
    const fresh = (await DB_Connection.Restaurant.findById(r._id).lean()) as any;
    expect(fresh.subscription).toBe('active');
    expect(fresh.currentPlanKey).toBe('pro');
    expect(fresh.paidUntil).toBeInstanceOf(Date);
    expect(fresh.paidUntil.getTime()).toBe(paidUntil.getTime());
  });

  it('active + thiếu currentPlanKey → gán free', async () => {
    const r = await makeRestaurant({
      subscription: 'active',
      paidUntil: new Date(Date.now() + 30 * day),
    });
    await migrateSubscriptionPlans();
    const fresh = (await DB_Connection.Restaurant.findById(r._id).lean()) as any;
    expect(fresh.subscription).toBe('active');
    expect(fresh.currentPlanKey).toBe('free');
  });

  it('locked (hết hạn legacy) → active + free, xoá paidUntil', async () => {
    const r = await makeRestaurant({
      subscription: 'locked',
      paidUntil: new Date(Date.now() - 5 * day),
      currentPlanKey: 'pro',
    });
    await migrateSubscriptionPlans();
    const fresh = (await DB_Connection.Restaurant.findById(r._id).lean()) as any;
    expect(fresh.subscription).toBe('active');
    expect(fresh.currentPlanKey).toBe('free');
    expect(fresh.paidUntil).toBeUndefined();
  });

  it('pending → giữ nguyên', async () => {
    const r = await makeRestaurant({ subscription: 'pending', currentPlanKey: 'basic' });
    await migrateSubscriptionPlans();
    const fresh = (await DB_Connection.Restaurant.findById(r._id).lean()) as any;
    expect(fresh.subscription).toBe('pending');
    expect(fresh.currentPlanKey).toBe('basic');
  });

  it('Idempotent: chạy 2 lần → không thay đổi gì thêm', async () => {
    await makeRestaurant({
      subscription: 'trial',
      trialEndsAt: new Date(Date.now() + 10 * day),
      currentPlanKey: 'basic',
    });
    await makeRestaurant({ subscription: 'locked', paidUntil: new Date(Date.now() - day) });

    const first = await migrateSubscriptionPlans();
    expect(first.total).toBeGreaterThan(0);

    const second = await migrateSubscriptionPlans();
    expect(second.total).toBe(0);

    const trialCount = await DB_Connection.Restaurant.countDocuments({ subscription: 'trial' });
    const lockedCount = await DB_Connection.Restaurant.countDocuments({ subscription: 'locked' });
    expect(trialCount).toBe(0);
    expect(lockedCount).toBe(0);
  });
});
