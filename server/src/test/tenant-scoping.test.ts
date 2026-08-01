import { describe, it, expect } from 'vitest';
import { request, tokenFor, idOf } from './utils.js';
import { SEED_IDS } from './seed.js';

const X = SEED_IDS.tenantX.toString();
const Y = SEED_IDS.tenantY.toString();


const adminX = () => tokenFor('admin', X);
const staffX = () => tokenFor('staff', X);
const managerX = () => tokenFor('manager', X);
const superAdmin = () => tokenFor('super-admin');

describe('T3 — Tenant scoping: route có verifyTenant phải cô lập theo tenant', () => {
  // ============ ĐÚNG TENANT → 200 ============

  it('GET /tables/restaurant/:restaurantId — admin X lấy bàn X → 200, chỉ bàn X', async () => {
    const res = await request
      .get(`/api/tables/restaurant/${X}`)
      .set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(200);
    const tables = res.body.data as any[];
    expect(tables.length).toBeGreaterThan(0);
    for (const t of tables) {
      expect(t.restaurant?.toString?.() ?? t.restaurant).toBe(X);
    }
  });

  it('GET /orders/restaurant/:id — staff X lấy đơn X → 200, chỉ đơn X', async () => {
    const res = await request
      .get(`/api/orders/restaurant/${X}`)
      .set('Authorization', `Bearer ${staffX()}`);
    expect(res.status).toBe(200);
    const orders = res.body.data as any[];
    expect(orders.length).toBeGreaterThan(0);
    for (const o of orders) {
      expect(o.restaurant?.toString?.() ?? o.restaurant).toBe(X);
    }
  });

  it('GET /orders/active/:restaurantId — staff X lấy đơn đang active của X → 200', async () => {
    const res = await request
      .get(`/api/orders/active/${X}`)
      .set('Authorization', `Bearer ${staffX()}`);
    expect(res.status).toBe(200);
    const orders = (res.body.data ?? res.body) as any[];
    expect(Array.isArray(orders)).toBe(true);
    for (const o of orders) {
      expect(o.restaurant?.toString?.() ?? o.restaurant).toBe(X);
    }
  });

  it('GET /notifications/:restaurantId — manager X lấy thông báo X → 200', async () => {
    const res = await request
      .get(`/api/notifications/${X}`)
      .set('Authorization', `Bearer ${managerX()}`);
    expect(res.status).toBe(200);
    const list = res.body.data as any[];
    expect(Array.isArray(list)).toBe(true);
    for (const n of list) {
      expect(n.restaurant?.toString?.() ?? n.restaurant).toBe(X);
    }
  });

  it('GET /auth/ — manager X lấy danh sách user X → 200, không lẫn user Y', async () => {
    const res = await request.get('/api/auth/').set('Authorization', `Bearer ${managerX()}`);
    expect(res.status).toBe(200);
    const users = res.body.data as any[];
    const yIds = new Set([idOf(SEED_IDS.staffY)]);
    for (const u of users) {
      expect(yIds.has(idOf(u._id))).toBe(false);
    }
  });

  // ============ GIẢ MẠO PARAM → KHÔNG LEAK (data vẫn của token tenant) ============

  it('GET /tables/restaurant/Y — token admin X → 200 nhưng KHÔNG trả bàn Y', async () => {
    const res = await request
      .get(`/api/tables/restaurant/${Y}`)
      .set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(200);
    const tables = res.body.data as any[];
    for (const t of tables) {
      expect(t.restaurant?.toString?.() ?? t.restaurant).toBe(X);
    }
  });

  it('GET /orders/restaurant/Y — token staff X → 200 nhưng KHÔNG trả đơn Y', async () => {
    const res = await request
      .get(`/api/orders/restaurant/${Y}`)
      .set('Authorization', `Bearer ${staffX()}`);
    expect(res.status).toBe(200);
    const orders = res.body.data as any[];
    for (const o of orders) {
      expect(o.restaurant?.toString?.() ?? o.restaurant).toBe(X);
    }
  });

  it('GET /notifications/Y — token manager X → 200 nhưng KHÔNG trả thông báo Y', async () => {
    const res = await request
      .get(`/api/notifications/${Y}`)
      .set('Authorization', `Bearer ${managerX()}`);
    expect(res.status).toBe(200);
    const list = res.body.data as any[];
    for (const n of list) {
      expect(n.restaurant?.toString?.() ?? n.restaurant).toBe(X);
    }
  });

  it('GET /settings/get-or-create/:scope/:model/:targetId — token admin X với targetId Y → vẫn tạo cho X', async () => {
    const res = await request
      .get(`/api/settings/get-or-create/restaurant/Restaurant/${Y}`)
      .set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(200);
    expect(String(res.body.data.targetId)).toBe(X);
  });

  // ============ SUPER-ADMIN BYPASS → 200 (quyền nền tảng) ============

  it('GET /tables/restaurant/Y — super-admin với params Y → 200, trả bàn Y', async () => {
    const res = await request
      .get(`/api/tables/restaurant/${Y}`)
      .set('Authorization', `Bearer ${superAdmin()}`);
    expect(res.status).toBe(200);
    const tables = res.body.data as any[];
    expect(tables.length).toBeGreaterThan(0);
    for (const t of tables) {
      expect(t.restaurant?.toString?.() ?? t.restaurant).toBe(Y);
    }
  });

  it('GET /orders/restaurant/Y — super-admin với params Y → 200, trả đơn Y', async () => {
    const res = await request
      .get(`/api/orders/restaurant/${Y}`)
      .set('Authorization', `Bearer ${superAdmin()}`);
    expect(res.status).toBe(200);
    const orders = res.body.data as any[];
    expect(orders.length).toBeGreaterThan(0);
    for (const o of orders) {
      expect(o.restaurant?.toString?.() ?? o.restaurant).toBe(Y);
    }
  });
});
