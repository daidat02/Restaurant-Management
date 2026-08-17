import { describe, it, expect } from 'vitest';
import { request, tokenFor, signToken, idOf } from './utils.js';
import DB_Connection from '../models/DB_Connection.js';
import { SEED_IDS } from './seed.js';

const day = 24 * 3600 * 1000;

/** Tạo chi nhánh với gói chỉ định (chủ động chèn thẳng DB như seed). */
async function makeRestaurant(planKey: string, extra: Record<string, unknown> = {}) {
  const now = new Date();
  return DB_Connection.Restaurant.create({
    name: `NH Plan ${planKey} ${Date.now()}`,
    email: `plan.${planKey}.${Date.now()}@nhamnhi.vn`,
    status: 'active',
    ownerId: SEED_IDS.adminX,
    subscription: 'active',
    paidUntil: new Date(now.getTime() + 30 * day),
    currentPlanKey: planKey,
    ...extra,
  });
}

/** Token admin (chủ chuỗi) cho tenant cụ thể — dùng cho tenant gói basic (ownerSub sở hữu). */
const ownerSubAdmin = (tenantId: string) =>
  signToken(SEED_IDS.ownerSub.toString(), 'admin', tenantId);

const TRIAL = idOf(SEED_IDS.tenantSubTrial); // basic
const X = idOf(SEED_IDS.tenantX); // pro

/**
 * T02 — Gate giới hạn theo gói (assertLimit/countResource) + gate tính năng (assertFeature).
 * Free: 5 bàn / 30 món / 2 nhân viên. Pro: 100 bàn.
 */
describe('T02 — Plan gate (giới hạn số lượng)', () => {
  it('Free: tạo bàn thứ 6 → 403 PLAN_LIMIT_REACHED (bàn 1-5 OK)', async () => {
    const free = await makeRestaurant('free');
    const freeId = idOf(free._id);

    for (let i = 1; i <= 5; i += 1) {
      const ok = await request
        .post('/api/tables/create')
        .set('Authorization', `Bearer ${tokenFor('manager', X)}`)
        .send({ tableData: { restaurant: freeId, tableNumber: String(i), status: 'available' } });
      expect(ok.status).toBe(201);
    }

    const blocked = await request
      .post('/api/tables/create')
      .set('Authorization', `Bearer ${tokenFor('manager', X)}`)
      .send({ tableData: { restaurant: freeId, tableNumber: '6', status: 'available' } });
    expect(blocked.status).toBe(403);
    expect(blocked.body.errorCode).toBe('PLAN_LIMIT_REACHED');
    expect(blocked.body.meta).toMatchObject({ resource: 'tables', limit: 5, used: 5, planKey: 'free' });
  });

  it('Pro: tạo bàn thứ 3 vẫn OK (giới hạn 100)', async () => {
    const pro = await makeRestaurant('pro');
    const proId = idOf(pro._id);
    const ok = await request
      .post('/api/tables/create')
      .set('Authorization', `Bearer ${tokenFor('manager', X)}`)
      .send({ tableData: { restaurant: proId, tableNumber: '1', status: 'available' } });
    expect(ok.status).toBe(201);
  });

  it('Enterprise: giới hạn 0 (không giới hạn) → tạo bàn OK', async () => {
    const ent = await makeRestaurant('enterprise');
    const entId = idOf(ent._id);
    const ok = await request
      .post('/api/tables/create')
      .set('Authorization', `Bearer ${tokenFor('manager', X)}`)
      .send({ tableData: { restaurant: entId, tableNumber: '1', status: 'available' } });
    expect(ok.status).toBe(201);
  });

  it('Free: tạo nhân viên thứ 3 → 403 PLAN_LIMIT_REACHED (giới hạn 2)', async () => {
    const free = await makeRestaurant('free');
    const freeId = idOf(free._id);
    await DB_Connection.User.findByIdAndUpdate(SEED_IDS.adminX, {
      $addToSet: { restaurantIds: free._id },
    });

    const makeStaff = (n: number) =>
      request
        .post('/api/auth/admin/create')
        .set('Authorization', `Bearer ${tokenFor('admin', freeId)}`)
        .send({ name: `NV${n}`, email: `nv${n}.${Date.now()}@nhamnhi.vn`, password: 'Test@NhamNhi2026', role: 'staff', restaurant: freeId });

    const s1 = await makeStaff(1);
    expect(s1.status).toBe(201);
    const s2 = await makeStaff(2);
    expect(s2.status).toBe(201);

    const s3 = await makeStaff(3);
    expect(s3.status).toBe(403);
    expect(s3.body.errorCode).toBe('PLAN_LIMIT_REACHED');
    expect(s3.body.meta).toMatchObject({ resource: 'staff', limit: 2, planKey: 'free' });
  });
});

/**
 * T02 — Gate tính năng theo gói (assertFeature middleware).
 * basic: KHÔNG có KDS/advanced_report. pro: CÓ KDS. super-admin: bypass.
 */
describe('T02 — Plan gate (tính năng theo gói)', () => {
  it('basic: xem màn hình KDS (đơn bếp) → 403 PLAN_LIMIT_REACHED', async () => {
    const res = await request
      .get(`/api/orders/kds/${idOf(SEED_IDS.tenantSubTrial)}`)
      .set('Authorization', `Bearer ${ownerSubAdmin(TRIAL)}`);
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('PLAN_LIMIT_REACHED');
    expect(res.body.meta).toMatchObject({ feature: 'kds', planKey: 'basic' });
  });

  it('pro: xem màn hình KDS OK', async () => {
    const res = await request
      .get(`/api/orders/kds/${idOf(SEED_IDS.tenantX)}`)
      .set('Authorization', `Bearer ${tokenFor('manager', X)}`);
    expect(res.status).toBe(200);
  });

  it('super-admin: bypass gate tính năng', async () => {
    const res = await request
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${tokenFor('super-admin')}`)
      .query({ restaurantId: TRIAL });
    expect(res.status).not.toBe(403);
    expect(res.body.errorCode).not.toBe('PLAN_LIMIT_REACHED');
  });

  it('basic: báo cáo nâng cao → 403 PLAN_LIMIT_REACHED', async () => {
    const res = await request
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${ownerSubAdmin(TRIAL)}`)
      .query({ restaurantId: TRIAL });
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('PLAN_LIMIT_REACHED');
    expect(res.body.meta).toMatchObject({ feature: 'advanced_report', planKey: 'basic' });
  });

  it('pro: báo cáo nâng cao OK', async () => {
    const res = await request
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${tokenFor('manager', X)}`)
      .query({ restaurantId: X, startDate: '2026-01-01', endDate: '2026-01-31' });
    expect(res.status).toBe(200);
  });

  it('basic: tạo hội thoại nhóm → 403 PLAN_LIMIT_REACHED; 1-1 vẫn mở', async () => {
    const base = { restaurantId: TRIAL, name: 'Group test' };
    const group = await request
      .post('/api/conversations')
      .set('Authorization', `Bearer ${ownerSubAdmin(TRIAL)}`)
      .send({ ...base, type: 'group' });
    expect(group.status).toBe(403);
    expect(group.body.errorCode).toBe('PLAN_LIMIT_REACHED');
    expect(group.body.meta).toMatchObject({ feature: 'messaging_group', planKey: 'basic' });

    const direct = await request
      .post('/api/conversations')
      .set('Authorization', `Bearer ${ownerSubAdmin(TRIAL)}`)
      .send({ ...base, type: 'direct', memberIds: [idOf(SEED_IDS.staffX)] });
    expect(direct.body.errorCode).not.toBe('PLAN_LIMIT_REACHED');
  });

  it('pro: tạo hội thoại nhóm OK', async () => {
    const res = await request
      .post('/api/conversations')
      .set('Authorization', `Bearer ${tokenFor('manager', X)}`)
      .send({ type: 'group', restaurantId: X, name: 'Group pro' });
    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('group');
  });
});
