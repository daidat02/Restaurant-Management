import { describe, it, expect } from 'vitest';
import { request, tokenFor } from './utils.js';
import DB_Connection from '../models/DB_Connection.js';
import { SEED_IDS } from './seed.js';

const day = 24 * 3600 * 1000;
const superAdmin = () => tokenFor('super-admin');
const adminX = () => tokenFor('admin', SEED_IDS.tenantX.toString());

describe('T6 — Super-admin backend: dashboard, tenants, transactions, block', () => {
  it('GET /api/admin/dashboard — super-admin → 200, đủ 4 KPI + biểu đồ + sắp hết hạn', async () => {
    const res = await request
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${superAdmin()}`);
    expect(res.status).toBe(200);
    const { kpis, revenueByMonth, recentOwners, expiringRestaurants } = res.body.data;
    expect(kpis).toHaveProperty('activeRestaurants');
    expect(kpis.activeRestaurants).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(revenueByMonth)).toBe(true);
    expect(revenueByMonth.length).toBe(6);
    expect(Array.isArray(recentOwners)).toBe(true);
    expect(Array.isArray(expiringRestaurants)).toBe(true);
  });

  it('GET /api/admin/dashboard — admin X → 403', async () => {
    const res = await request
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(403);
  });

  it('GET /api/admin/tenants — trả danh sách chủ kèm trạng thái + tổng đã trả', async () => {
    const res = await request
      .get('/api/admin/tenants')
      .set('Authorization', `Bearer ${superAdmin()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const owner = res.body.data.find((t: any) => String(t._id) === String(SEED_IDS.adminX));
    expect(owner).toBeTruthy();
    expect(owner).toHaveProperty('restaurantCount');
    expect(owner).toHaveProperty('totalPaid');
  });

  it('GET /api/admin/tenants?id= — chi tiết chủ: nhà hàng + giao dịch', async () => {
    const res = await request
      .get(`/api/admin/tenants?id=${SEED_IDS.adminX}`)
      .set('Authorization', `Bearer ${superAdmin()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.owner).toBeTruthy();
    expect(Array.isArray(res.body.data.restaurants)).toBe(true);
    expect(Array.isArray(res.body.data.transactions)).toBe(true);
  });

  it('GET /api/admin/transactions — có dữ liệu transaction seed (tạo qua pay)', async () => {
    // Tạo 1 transaction cho tenantX bằng thanh toán
    await request
      .post('/api/subscriptions/pay')
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ restaurantId: SEED_IDS.tenantX.toString(), cycleMonths: 1 });
    const res = await request
      .get('/api/admin/transactions')
      .set('Authorization', `Bearer ${superAdmin()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('PATCH /api/admin/users/:id/block (blocked=true) — khoá toàn bộ user của chủ + audit', async () => {
    const res = await request
      .patch(`/api/admin/users/${SEED_IDS.adminX}/block`)
      .set('Authorization', `Bearer ${superAdmin()}`)
      .send({ blocked: true });
    expect(res.status).toBe(200);
    expect(res.body.data.affectedUsers).toBeGreaterThanOrEqual(1);
    const log = await DB_Connection.AuditLog.exists({ action: 'user.block' });
    expect(log).toBeTruthy();

    // managerX thuộc tenantX cũng bị khoá (vì cùng nhà hàng với chủ)
    const manager = await DB_Connection.User.findById(SEED_IDS.managerX).lean();
    expect((manager as any).isActive).toBe(false);

    // Mở lại để không ảnh hưởng test khác
    await request
      .patch(`/api/admin/users/${SEED_IDS.adminX}/block`)
      .set('Authorization', `Bearer ${superAdmin()}`)
      .send({ blocked: false });
    const manager2 = await DB_Connection.User.findById(SEED_IDS.managerX).lean();
    expect((manager2 as any).isActive).toBe(true);
  });

  it('PATCH block — admin X không được phép → 403', async () => {
    const res = await request
      .patch(`/api/admin/users/${SEED_IDS.adminX}/block`)
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ blocked: true });
    expect(res.status).toBe(403);
  });

  it('PATCH block không phải admin (customer) → 400', async () => {
    const res = await request
      .patch(`/api/admin/users/${SEED_IDS.customer}/block`)
      .set('Authorization', `Bearer ${superAdmin()}`)
      .send({ blocked: true });
    expect(res.status).toBe(400);
  });

  it('PATCH block thiếu blocked → 400', async () => {
    const res = await request
      .patch(`/api/admin/users/${SEED_IDS.adminX}/block`)
      .set('Authorization', `Bearer ${superAdmin()}`)
      .send({});
    expect(res.status).toBe(400);
  });
});
