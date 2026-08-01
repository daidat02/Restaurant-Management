import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { request, tokenFor } from './utils.js';
import { SEED_IDS } from './seed.js';
import DB_Connection from '../models/DB_Connection.js';

const X = SEED_IDS.tenantX.toString();

const adminToken = () => tokenFor('admin', X);

describe('T14 — Wizard onboarding: tạo tenant mới hoạt động (nhà hàng → setting → user → bàn)', () => {
  let newTenantId = '';

  it('POST /restaurants — admin tạo cơ sở mới, được gắn tự động vào restaurantIds', async () => {
    const res = await request
      .post('/api/restaurants')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        name: 'NhamNhi Cơ Sở Wizard',
        email: 'wizard@nhamnhi.vn',
        phone: '0900000099',
        address: '123 Test Street',
        capacity: 50,
        operatingHours: '08:00 - 22:00',
      });

    expect(res.status).toBe(201);
    expect(res.body.result.data._id).toBeTruthy();
    newTenantId = res.body.result.data._id.toString();

    // Creator (adminX) tự động thuộc cơ sở mới → switch-tenant được
    const creator = await DB_Connection.User.findById(SEED_IDS.adminX);
    const ids = (creator?.restaurantIds || []).map((id: any) => id.toString());
    expect(ids).toContain(newTenantId);
  });

  it('POST /auth/switch-tenant — chuyển token sang cơ sở mới', async () => {
    expect(newTenantId).toBeTruthy();
    const res = await request
      .post('/api/auth/switch-tenant')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ restaurantId: newTenantId });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    const token = res.body.data.accessToken as string;

    // Token mới hoạt động trên tenant mới: tạo user
    const createUser = await request
      .post('/api/auth/admin/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Manager Wizard', email: 'manager.wizard@nhamnhi.vn', phone: '0900000000', password: 'Test@NhamNhi2026', role: 'manager' });

    expect(createUser.status).toBe(201);
    const user = createUser.body.data;
    expect(user.role).toBe('manager');
    const userTenants = (user.restaurantIds || []).map((id: any) => id.toString());
    expect(userTenants).toContain(newTenantId);
  });

  it('POST /auth/admin/create — ép đúng tenant đang xác thực (không nhận restaurantIds tuỳ ý)', async () => {
    const res = await request
      .post('/api/auth/switch-tenant')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ restaurantId: newTenantId });

    const token = res.body.data.accessToken as string;
    // Cố tình gửi restaurantIds = tenant khác → vẫn phải bị ép về newTenantId
    const createUser = await request
      .post('/api/auth/admin/create')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Staff Wizard',
        email: 'staff.wizard@nhamnhi.vn',
        password: 'Test@NhamNhi2026',
        role: 'staff',
        restaurantIds: [X],
      });

    expect(createUser.status).toBe(201);
    const userTenants = (createUser.body.data.restaurantIds || []).map((id: any) => id.toString());
    expect(userTenants).toEqual([newTenantId]);
  });

  it('GET /settings/get-or-create — setting mặc định tồn tại cho tenant mới', async () => {
    const res = await request
      .post('/api/auth/switch-tenant')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ restaurantId: newTenantId });
    const token = res.body.data.accessToken as string;

    const setting = await request
      .get(`/api/settings/get-or-create/restaurant/Restaurant/${newTenantId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(setting.status).toBe(200);
    expect(setting.body.data._id).toBeTruthy();
    expect(setting.body.data.scope).toBe('restaurant');
    expect(setting.body.data.targetId?.toString()).toBe(newTenantId);

    // Sinh mã nhà bếp
    const kds = await request
      .post(`/api/settings/${setting.body.data._id}/kds-code`)
      .set('Authorization', `Bearer ${token}`);
    expect(kds.status).toBe(200);
    expect(String(kds.body.data.kitchenCode)).toMatch(/^\d{6}$/);
  });

  it('POST /tables/create — tạo bàn cho tenant mới (verify tenant đúng)', async () => {
    const res = await request
      .post('/api/auth/switch-tenant')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ restaurantId: newTenantId });
    const token = res.body.data.accessToken as string;

    const table = await request
      .post('/api/tables/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ tableData: { restaurant: newTenantId, tableNumber: 1, status: 'available' } });

    expect(table.status).toBe(201);
    expect(table.body.data.restaurant?.toString()).toBe(newTenantId);
    expect(table.body.data._id).toBeTruthy();
  });
});
