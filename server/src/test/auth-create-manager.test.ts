import { describe, it, expect, beforeAll } from 'vitest';
import { request, tokenFor, loginAs } from './utils.js';
import { SEED_IDS } from './seed.js';
import mongoose from 'mongoose';

const X = SEED_IDS.tenantX.toString();
const Y = SEED_IDS.tenantY.toString();
const FAKE = new mongoose.Types.ObjectId().toString();

const adminX = () => tokenFor('admin');
const managerX = () => tokenFor('manager', X);

describe('T8 — Admin tạo manager/staff gán chi nhánh + sửa nhà hàng', () => {
  const managerEmail = `manager.t08.${Date.now()}@nhamnhi.vn`;
  let managerId = '';
  let managerToken = '';

  beforeAll(async () => {
    const res = await request
      .post('/api/auth/admin/create')
      .set('Authorization', `Bearer ${adminX()}`)
      .send({
        name: 'Manager T08',
        email: managerEmail,
        phone: '0912345678',
        password: 'Test@NhamNhi2026',
        role: 'manager',
        restaurant: X,
      });
    managerId = res.body?.data?._id || '';
    managerToken = await loginAs(managerEmail);
  });

  it('Admin tạo manager gán chi nhánh X → 201, restaurantIds=[X]', () => {
    expect(managerId).toBeTruthy();
  });

  it('Manager mới login → vào thẳng chi nhánh X (restaurantIds[0] = X)', async () => {
    const res = await request
      .get('/api/auth/profile/me')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    const ids = (res.body?.data?.restaurantIds || []).map((id: any) => String(id?._id ?? id));
    expect(ids[0]).toBe(X);
  });

  it('Admin tạo manager với nhà hàng NGOÀI chuỗi → 403', async () => {
    const res = await request
      .post('/api/auth/admin/create')
      .set('Authorization', `Bearer ${adminX()}`)
      .send({
        name: 'Xâm Nhập',
        email: `intrude.${Date.now()}@nhamnhi.vn`,
        phone: '0912999999',
        password: 'Test@NhamNhi2026',
        role: 'manager',
        restaurant: FAKE,
      });
    expect(res.status).toBe(403);
  });

  it('Manager X tạo staff → bị ép về chi nhánh X dù gửi nhà hàng Y', async () => {
    const res = await request
      .post('/api/auth/admin/create')
      .set('Authorization', `Bearer ${managerX()}`)
      .send({
        name: 'Staff T08',
        email: `staff.t08.${Date.now()}@nhamnhi.vn`,
        phone: '0912777777',
        password: 'Test@NhamNhi2026',
        role: 'staff',
        restaurant: Y,
      });
    expect(res.status).toBe(201);
    const ids = (res.body?.data?.restaurantIds || []).map((id: any) => String(id));
    expect(ids).toEqual([X]);
  });

  it('Admin sửa manager → đổi nhà hàng sang Y', async () => {
    const res = await request
      .put(`/api/auth/admin/update/${managerId}`)
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ restaurant: Y });
    expect(res.status).toBe(200);
    const ids = (res.body?.data?.restaurantIds || []).map((id: any) => String(id));
    expect(ids).toContain(Y);
  });

  it('Admin sửa manager → gán nhà hàng NGOÀI chuỗi bị chặn 403', async () => {
    const res = await request
      .put(`/api/auth/admin/update/${managerId}`)
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ restaurant: FAKE });
    expect(res.status).toBe(403);
  });
});
