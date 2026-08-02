import { describe, it, expect } from 'vitest';
import { request, tokenFor } from './utils.js';
import { SEED_IDS } from './seed.js';

const X = SEED_IDS.tenantX.toString();
const Y = SEED_IDS.tenantY.toString();

const superAdmin = () => tokenFor('super-admin');
const adminX = () => tokenFor('admin', X);

describe('T4 — Super-admin: quyền nền tảng chỉ cho super-admin', () => {
  it('GET /analytics/system-overview — super-admin → 200, thống kê toàn hệ thống', async () => {
    const res = await request
      .get('/api/analytics/system-overview')
      .set('Authorization', `Bearer ${superAdmin()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Hệ thống có 2 nhà hàng seed (X, Y) + ít nhất 1 khách hàng
    expect(res.body.data.totalRestaurants).toBeGreaterThanOrEqual(2);
    expect(res.body.data.totalCustomers).toBeGreaterThanOrEqual(1);
  });

  it('GET /analytics/system-overview — admin X → 403', async () => {
    const res = await request
      .get('/api/analytics/system-overview')
      .set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(403);
  });

  it('GET /orders/:id — super-admin đọc được đơn của bất kỳ tenant → 200', async () => {
    const res = await request
      .get(`/api/orders/${SEED_IDS.orderYActive.toString()}`)
      .set('Authorization', `Bearer ${superAdmin()}`);
    expect(res.status).toBe(200);
  });

  it('GET /orders/:id — admin khác (không sở hữu Y) không đọc được đơn của Y → 403 (bổ sung T2)', async () => {
    const res = await request
      .get(`/api/orders/${SEED_IDS.orderYActive.toString()}`)
      .set('Authorization', `Bearer ${tokenFor('owner-sub')}`);
    expect(res.status).toBe(403);
  });

  it('GET /restaurants/:id — super-admin xem được nhà hàng Y → 200', async () => {
    const res = await request
      .get(`/api/restaurants/${Y}`)
      .set('Authorization', `Bearer ${superAdmin()}`);
    expect(res.status).toBe(200);
  });
});
