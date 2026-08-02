import { describe, it, expect } from 'vitest';
import { request, tokenFor, idOf } from './utils.js';
import DB_Connection from '../models/DB_Connection.js';
import { SEED_IDS } from './seed.js';

const X = SEED_IDS.tenantX.toString();
const Y = SEED_IDS.tenantY.toString();

const adminX = () => tokenFor('admin', X);
const staffY = () => tokenFor('staffY', Y);

describe('T01 — Admin (chủ chuỗi): bypass currentRestaurantId + ownership + guard locked', () => {
  // ============ ADMIN TRUY CẬP MỌI CHI NHÁNH CỦA MÌNH → 200 ============

  it('GET /tables/restaurant/X — admin X truy cập chi nhánh X → 200', async () => {
    const res = await request
      .get(`/api/tables/restaurant/${X}`)
      .set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(200);
  });

  it('GET /tables/restaurant/Y — admin X (sở hữu cả Y) truy cập chi nhánh Y → 200', async () => {
    const res = await request
      .get(`/api/tables/restaurant/${Y}`)
      .set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(200);
  });

  // ============ ADMIN KHÔNG SỞ HỮU → 403 ============

  it('GET /tables/restaurant/Y — admin khác (ownerSub không sở hữu Y) → 403', async () => {
    const res = await request
      .get(`/api/tables/restaurant/${Y}`)
      .set('Authorization', `Bearer ${tokenFor('owner-sub')}`);
    expect(res.status).toBe(403);
  });

  it('GET /tables/restaurant/abc — admin X chỉ định tenant không tồn tại trong chuỗi → 403', async () => {
    const res = await request
      .get(`/api/tables/restaurant/${idOf(SEED_IDS.tenantSubTrial)}`)
      .set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(403);
  });

  // ============ GUARD LOCKED: admin không bị chặn, staff/manager bị chặn ============

  it('staff Y gọi route khi chi nhánh Y locked → 403 RESTAURANT_LOCKED', async () => {
    await DB_Connection.Restaurant.findByIdAndUpdate(SEED_IDS.tenantY, {
      subscription: 'locked',
      paidUntil: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    });
    const res = await request
      .get(`/api/tables/restaurant/${Y}`)
      .set('Authorization', `Bearer ${staffY()}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('RESTAURANT_LOCKED');
  });

  it('admin X gọi route chi nhánh Y locked → 200 (admin không bị chặn để xử lý thanh toán)', async () => {
    const res = await request
      .get(`/api/tables/restaurant/${Y}`)
      .set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(200);
    // Mở lại cho các test sau
    await DB_Connection.Restaurant.findByIdAndUpdate(SEED_IDS.tenantY, {
      subscription: 'active',
      paidUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    });
  });
});
