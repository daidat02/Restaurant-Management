import { describe, it, expect } from 'vitest';
import { request, signToken } from './utils.js';
import DB_Connection from '../models/DB_Connection.js';
import { SEED_IDS } from './seed.js';

const day = 24 * 3600 * 1000;
const adminXToken = signToken(SEED_IDS.adminX.toString(), 'admin', SEED_IDS.tenantX.toString());

describe('T5 — Thanh toán mock + khoá đơn/món khi locked', () => {
  it('POST /api/subscriptions/pay — gia hạn từ active → active, paidUntil tăng theo chu kỳ', async () => {
    const res = await request
      .post('/api/subscriptions/pay')
      .set('Authorization', `Bearer ${adminXToken}`)
      .send({ restaurantId: SEED_IDS.tenantX.toString(), cycleMonths: 1 });
    expect(res.status).toBe(200);
    expect(res.body.data.restaurant.subscription).toBe('active');
    expect(res.body.data.transaction.amount).toBe(299000);
    const txLog = await DB_Connection.AuditLog.exists({ action: 'transaction.create' });
    expect(txLog).toBeTruthy();
  });

  it('POST /api/subscriptions/pay — mở lại từ locked → active + audit subscription.unlocked', async () => {
    // Khoá nhà hàng Y (đặt paidUntil quá khứ)
    await DB_Connection.Restaurant.findByIdAndUpdate(SEED_IDS.tenantY, {
      subscription: 'locked',
      paidUntil: new Date(Date.now() - day),
    });
    const res = await request
      .post('/api/subscriptions/pay')
      .set('Authorization', `Bearer ${adminXToken}`)
      .send({ restaurantId: SEED_IDS.tenantY.toString(), cycleMonths: 3 });
    expect(res.status).toBe(200);
    expect(res.body.data.restaurant.subscription).toBe('active');
    const unlockLog = await DB_Connection.AuditLog.exists({ action: 'subscription.unlocked' });
    expect(unlockLog).toBeTruthy();
  });

  it('POST /api/subscriptions/pay — không phải chủ sở hữu → 403', async () => {
    const otherToken = signToken(SEED_IDS.managerX.toString(), 'manager', SEED_IDS.tenantX.toString());
    const res = await request
      .post('/api/subscriptions/pay')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ restaurantId: SEED_IDS.tenantX.toString(), cycleMonths: 1 });
    expect(res.status).toBe(403);
  });

  it('GET /api/subscriptions/me — trả trạng thái các nhà hàng của chủ', async () => {
    const res = await request
      .get('/api/subscriptions/me')
      .set('Authorization', `Bearer ${adminXToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /api/subscriptions/transactions — chủ xem đúng lịch sử giao dịch của mình', async () => {
    const res = await request
      .get('/api/subscriptions/transactions')
      .set('Authorization', `Bearer ${adminXToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    // Mọi giao dịch đều thuộc chủ (adminX)
    expect(res.body.data.every((t: any) => t.ownerId === SEED_IDS.adminX.toString())).toBe(true);
  });

  it('Tạo đơn khi nhà hàng locked → 403 RESTAURANT_LOCKED', async () => {
    await DB_Connection.Restaurant.findByIdAndUpdate(SEED_IDS.tenantY, {
      subscription: 'locked',
      paidUntil: new Date(Date.now() - day),
    });
    const res = await request.post('/api/orders').send({
      restaurant: SEED_IDS.tenantY.toString(),
      table: SEED_IDS.tableY1.toString(),
      orderType: 'dine-in',
      items: [{ menuItem: SEED_IDS.menuItemY1.toString(), quantity: 1 }],
    });
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('RESTAURANT_LOCKED');
  });

  it('Tạo món khi nhà hàng locked → 403 RESTAURANT_LOCKED', async () => {
    const managerXToken = signToken(SEED_IDS.managerX.toString(), 'manager', SEED_IDS.tenantX.toString());
    await DB_Connection.Restaurant.findByIdAndUpdate(SEED_IDS.tenantX, {
      subscription: 'locked',
      paidUntil: new Date(Date.now() - day),
    });
    const res = await request
      .post('/api/menu/item')
      .set('Authorization', `Bearer ${managerXToken}`)
      .send({
        category: SEED_IDS.categoryX.toString(),
        restaurant: SEED_IDS.tenantX.toString(),
        name: 'Món bị chặn',
        price: 10000,
      });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('RESTAURANT_LOCKED');
    // Mở lại cho các test sau
    await DB_Connection.Restaurant.findByIdAndUpdate(SEED_IDS.tenantX, {
      subscription: 'active',
      paidUntil: new Date(Date.now() + 30 * day),
    });
  });
});
