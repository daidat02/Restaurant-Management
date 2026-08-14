import { describe, it, expect, beforeAll } from 'vitest';
import { request, tokenFor, loginAs } from './utils.js';
import { SEED_IDS } from './seed.js';

const X = SEED_IDS.tenantX.toString();
const adminX = () => tokenFor('admin');
const managerX = () => tokenFor('manager', X);
const staffX = () => tokenFor('staff', X);
const adminOther = () => tokenFor('owner-sub');

describe('T9 — Block/Unblock + chặn manager đụng admin', () => {
  let staffEmail = '';
  let staffId = '';
  let manager2Id = '';

  beforeAll(async () => {
    staffEmail = `staff.block.${Date.now()}@nhamnhi.vn`;
    const staffRes = await request
      .post('/api/auth/admin/create')
      .set('Authorization', `Bearer ${adminX()}`)
      .send({
        name: 'Staff Block',
        email: staffEmail,
        phone: '0922111222',
        password: 'Test@NhamNhi2026',
        role: 'staff',
        restaurant: X,
      });
    staffId = staffRes.body?.data?._id || '';

    const managerRes = await request
      .post('/api/auth/admin/create')
      .set('Authorization', `Bearer ${adminX()}`)
      .send({
        name: 'Manager Khác',
        email: `manager.block.${Date.now()}@nhamnhi.vn`,
        phone: '0922333444',
        password: 'Test@NhamNhi2026',
        role: 'manager',
        restaurant: X,
      });
    manager2Id = managerRes.body?.data?._id || '';
  });

  it('Admin tạo staff → 201 (chuẩn bị data)', () => {
    expect(staffId).toBeTruthy();
  });

  it('Manager block staff → 200, isActive=false', async () => {
    const res = await request
      .patch(`/api/auth/admin/${staffId}/block`)
      .set('Authorization', `Bearer ${managerX()}`)
      .send({ blocked: true });
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it('Staff bị block → login bị chặn 400', async () => {
    const res = await request.post('/api/auth/login').send({
      email: staffEmail,
      password: 'Test@NhamNhi2026',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('khóa');
  });

  it('Manager unblock staff → 200, isActive=true', async () => {
    const res = await request
      .patch(`/api/auth/admin/${staffId}/block`)
      .set('Authorization', `Bearer ${managerX()}`)
      .send({ blocked: false });
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(true);
  });

  it('Staff bị mở khoá → login lại thành công', async () => {
    const token = await loginAs(staffEmail);
    expect(token).toBeTruthy();
  });

  it('Manager không block được admin → 403', async () => {
    const res = await request
      .patch(`/api/auth/admin/${SEED_IDS.adminX}/block`)
      .set('Authorization', `Bearer ${managerX()}`)
      .send({ blocked: true });
    expect(res.status).toBe(403);
  });

  it('Manager không block được manager khác → 403', async () => {
    const res = await request
      .patch(`/api/auth/admin/${manager2Id}/block`)
      .set('Authorization', `Bearer ${managerX()}`)
      .send({ blocked: true });
    expect(res.status).toBe(403);
  });

  it('Staff không block được ai → 403', async () => {
    const res = await request
      .patch(`/api/auth/admin/${staffId}/block`)
      .set('Authorization', `Bearer ${staffX()}`)
      .send({ blocked: true });
    expect(res.status).toBe(403);
  });

  it('Manager không update được admin → 403', async () => {
    const res = await request
      .put(`/api/auth/admin/update/${SEED_IDS.adminX}`)
      .set('Authorization', `Bearer ${managerX()}`)
      .send({ name: 'Xâm nhập' });
    expect(res.status).toBe(403);
  });

  it('Manager không delete được admin → 403', async () => {
    const res = await request
      .delete(`/api/auth/admin/delete/${SEED_IDS.adminX}`)
      .set('Authorization', `Bearer ${managerX()}`);
    expect(res.status).toBe(403);
  });

  it('Manager không update được manager khác → 403', async () => {
    const res = await request
      .put(`/api/auth/admin/update/${manager2Id}`)
      .set('Authorization', `Bearer ${managerX()}`)
      .send({ name: 'Xâm nhập' });
    expect(res.status).toBe(403);
  });

  it('Admin không block được admin thuộc chuỗi khác → 403 (tenant isolation)', async () => {
    const res = await request
      .patch(`/api/auth/admin/${SEED_IDS.adminX}/block`)
      .set('Authorization', `Bearer ${adminOther()}`)
      .send({ blocked: true });
    expect(res.status).toBe(403);
  });
});
