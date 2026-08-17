import { describe, it, expect, beforeAll } from 'vitest';
import { request, signToken } from './utils.js';
import DB_Connection from '../models/DB_Connection.js';
import { SEED_IDS } from './seed.js';

const ADMIN_TOKEN = signToken(SEED_IDS.adminX.toString(), 'admin', SEED_IDS.tenantX.toString());

/** adminX có 2 nhà hàng (seed) → mọi chi nhánh tạo mới đều là nhà hàng 2+. */
describe('T1 — Tạo nhà hàng chờ thanh toán (activation=pending)', () => {
  it('activation="pending" → subscription=pending, không paidUntil, không Transaction', async () => {
    const res = await request
      .post('/api/restaurants')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        name: 'Chi nhánh chờ thanh toán',
        email: 'pending@nhamnhi.vn',
        operatingHours: '8-22',
        cycleMonths: 3,
        planId: 'pro',
        activation: 'pending',
      });
    expect(res.status).toBe(201);
    const r = res.body.result.data;
    expect(r.subscription).toBe('pending');
    expect(r.paidUntil).toBeUndefined();
    expect(r.trialEndsAt).toBeUndefined();
    expect(res.body.result.transaction).toBeUndefined();

    const tx = await DB_Connection.Transaction.exists({ restaurant: r._id });
    expect(tx).toBeFalsy();
  });

  it('activation="pending" → nhà hàng được thêm vào restaurantIds của chủ', async () => {
    const res = await request
      .post('/api/restaurants')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        name: 'Pending gắn chủ',
        email: 'pending2@nhamnhi.vn',
        operatingHours: '8-22',
        cycleMonths: 1,
        activation: 'pending',
      });
    expect(res.status).toBe(201);
    const newId = res.body.result.data._id;

    const owner = await DB_Connection.User.findById(SEED_IDS.adminX).lean();
    const ids = ((owner as any).restaurantIds || []).map((id: any) => id.toString());
    expect(ids).toContain(String(newId));
  });

  it('activation="pending" với chu kỳ không hợp lệ → 400', async () => {
    const res = await request
      .post('/api/restaurants')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        name: 'Sai chu kỳ pending',
        email: 'pending-bad@nhamnhi.vn',
        cycleMonths: 2,
        activation: 'pending',
      });
    expect(res.status).toBe(400);
  });

  it('activation="paid" (mặc định) → giữ nguyên hành vi cũ: active + Transaction (regression)', async () => {
    const res = await request
      .post('/api/restaurants')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        name: 'Chi nhánh trả ngay',
        email: 'paid-regression@nhamnhi.vn',
        operatingHours: '8-22',
        cycleMonths: 1,
      });
    expect(res.status).toBe(201);
    const r = res.body.result.data;
    expect(r.subscription).toBe('active');
    expect(r.paidUntil).toBeTruthy();
    expect(res.body.result.transaction).toBeTruthy();
  });

  it('Nhà hàng đầu tiên vẫn là trial dù activation="pending" (không áp dụng cho chi nhánh đầu)', async () => {
    const reg = await request.post('/api/auth/register-owner').send({
      name: 'Chủ Pending Đầu',
      email: 'owner.pending.first@nhamnhi.vn',
      password: 'Test@NhamNhi2026',
    });
    const token = signToken(reg.body.data._id, 'admin');
    const res = await request
      .post('/api/restaurants')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Nhà hàng đầu pending',
        email: 'first-pending@nhamnhi.vn',
        operatingHours: '8-22',
        activation: 'pending',
      });
    expect(res.status).toBe(201);
    expect(res.body.result.data.subscription).toBe('trial');
    expect(res.body.result.data.trialEndsAt).toBeTruthy();
  });
});

describe('T1 — Chặn vận hành nhà hàng pending', () => {
  let pendingId: string;
  let managerToken: string;

  beforeAll(async () => {
    // Tạo nhà hàng pending cho adminX và một manager thuộc nhà hàng đó
    const res = await request
      .post('/api/restaurants')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        name: 'Pending vận hành',
        email: 'pending-ops@nhamnhi.vn',
        operatingHours: '8-22',
        cycleMonths: 1,
        activation: 'pending',
      });
    pendingId = res.body.result.data._id;

    // manager của nhà hàng pending — tạo thẳng trong DB (admin không tạo được staff
    // cho tenant pending vì verifyTenant chặn; test này kiểm tra lớp phòng thủ của middleware)
    const mgr = await DB_Connection.User.create({
      name: 'Mgr Pending',
      email: 'mgr.pending@nhamnhi.vn',
      password: 'hash-not-used',
      role: 'manager',
      isActive: true,
      restaurantIds: [pendingId],
    });
    managerToken = signToken(String(mgr._id), 'manager', pendingId);
  });

  it('admin chỉ định vận hành nhà hàng pending → 403 RESTAURANT_LOCKED', async () => {
    const res = await request
      .get(`/api/tables/restaurant/${pendingId}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('RESTAURANT_LOCKED');
  });

  it('manager/staff của nhà hàng pending bị chặn bởi assertRestaurantActive', async () => {
    const res = await request
      .get(`/api/orders/restaurant/${pendingId}`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('RESTAURANT_LOCKED');
  });
});
