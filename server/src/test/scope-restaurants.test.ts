import { describe, it, expect } from 'vitest';
import { request, tokenFor, signToken, idOf } from './utils.js';
import { SEED_IDS, TEST_PASSWORD } from './seed.js';

const X = SEED_IDS.tenantX.toString();
const Y = SEED_IDS.tenantY.toString();

const adminX = () => tokenFor('admin', X);
const managerX = () => tokenFor('manager', X);
const customer = () => tokenFor('customer');
const superAdmin = () => tokenFor('super-admin');

describe('T17 — Scope danh sách nhà hàng của Admin/Manager (GET /restaurants/my)', () => {
  it('admin X → chỉ trả 2 nhà hàng thuộc chuỗi (X, Y), không có nhà hàng của chủ khác', async () => {
    const res = await request
      .get('/api/restaurants/my')
      .set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(200);
    const ids = (res.body.data as any[]).map((r) => idOf(r._id));
    expect(ids).toEqual(expect.arrayContaining([X, Y]));
    // Không rò rỉ nhà hàng của ownerSub
    expect(ids).not.toContain(idOf(SEED_IDS.tenantSubTrial));
  });

  it('manager X → chỉ trả chi nhánh X của mình', async () => {
    const res = await request
      .get('/api/restaurants/my')
      .set('Authorization', `Bearer ${managerX()}`);
    expect(res.status).toBe(200);
    const ids = (res.body.data as any[]).map((r) => idOf(r._id));
    expect(ids).toEqual([X]);
  });

  it('admin vừa đăng ký (chưa có nhà hàng) → trả mảng rỗng, không lỗi', async () => {
    const reg = await request.post('/api/auth/register-owner').send({
      name: 'Chủ Mới',
      email: `fresh.${Date.now()}@nhamnhi.vn`,
      phone: '0900000017',
      password: TEST_PASSWORD,
    });
    expect(reg.status).toBe(201);
    const freshToken = signToken(idOf(reg.body.data._id), 'admin');
    const res = await request
      .get('/api/restaurants/my')
      .set('Authorization', `Bearer ${freshToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('không có token → 401', async () => {
    const res = await request.get('/api/restaurants/my');
    expect(res.status).toBe(401);
  });

  it('customer → 403 (không thuộc danh sách role cho phép)', async () => {
    const cus = await request.get('/api/restaurants/my').set('Authorization', `Bearer ${customer()}`);
    expect(cus.status).toBe(403);
  });

  it('super-admin (không sở hữu nhà hàng) → 200 mảng rỗng (verifyRole bypass nhất quán codebase)', async () => {
    const sa = await request.get('/api/restaurants/my').set('Authorization', `Bearer ${superAdmin()}`);
    expect(sa.status).toBe(200);
    expect(sa.body.data).toEqual([]);
  });
});

describe('T17 — List users theo chuỗi (GET /auth/): union "Tất cả" + 1 chi nhánh + từ chối', () => {
  it('admin X, roles=staff, không truyền nhà hàng → union toàn chuỗi (staff X + staff Y)', async () => {
    const res = await request
      .get('/api/auth/')
      .query({ roles: 'staff' })
      .set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(200);
    const ids = (res.body.data as any[]).map((u) => idOf(u._id));
    expect(ids).toContain(idOf(SEED_IDS.staffX));
    expect(ids).toContain(idOf(SEED_IDS.staffY));
  });

  it('admin X, roles=staff, restaurantId=X → chỉ staff X', async () => {
    const res = await request
      .get('/api/auth/')
      .query({ roles: 'staff', restaurantId: X })
      .set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(200);
    const ids = (res.body.data as any[]).map((u) => idOf(u._id));
    expect(ids).toContain(idOf(SEED_IDS.staffX));
    expect(ids).not.toContain(idOf(SEED_IDS.staffY));
  });

  it('admin X, roles=staff, restaurantIds=Y → chỉ staff Y', async () => {
    const res = await request
      .get('/api/auth/')
      .query({ roles: 'staff', restaurantIds: Y })
      .set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(200);
    const ids = (res.body.data as any[]).map((u) => idOf(u._id));
    expect(ids).not.toContain(idOf(SEED_IDS.staffX));
    expect(ids).toContain(idOf(SEED_IDS.staffY));
  });

  it('manager X, roles=staff → chỉ staff X (không lẫn staff Y)', async () => {
    const res = await request
      .get('/api/auth/')
      .query({ roles: 'staff' })
      .set('Authorization', `Bearer ${managerX()}`);
    expect(res.status).toBe(200);
    const ids = (res.body.data as any[]).map((u) => idOf(u._id));
    expect(ids).toContain(idOf(SEED_IDS.staffX));
    expect(ids).not.toContain(idOf(SEED_IDS.staffY));
  });

  it('admin X truyền nhà hàng không thuộc chuỗi (tenantSubTrial) → 403', async () => {
    const res = await request
      .get('/api/auth/')
      .query({ roles: 'staff', restaurantId: idOf(SEED_IDS.tenantSubTrial) })
      .set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(403);
  });
});

describe('T17 — Endpoint public /restaurants giữ nguyên (khách duyệt)', () => {
  it('GET /api/restaurants (không token) → 200, vẫn trả danh sách nhà hàng', async () => {
    const res = await request.get('/api/restaurants');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect((res.body.data as any[]).length).toBeGreaterThanOrEqual(2);
  });
});
