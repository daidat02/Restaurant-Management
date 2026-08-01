import { describe, it, expect } from 'vitest';
import { request, tokenFor, idOf } from './utils.js';
import { SEED_IDS } from './seed.js';

const X = SEED_IDS.tenantX.toString();
const Y = SEED_IDS.tenantY.toString();

const adminX = () => tokenFor('admin', X);
const managerX = () => tokenFor('manager', X);
const staffX = () => tokenFor('staff', X);


describe('T2 — Tenant isolation: token X chặn truy cập resource của tenant Y', () => {
  // ============ ĐỌC (READ) ============

  it('GET /orders/:id — staff X không đọc được đơn của Y → 403', async () => {
    const res = await request
      .get(`/api/orders/${idOf(SEED_IDS.orderYActive)}`)
      .set('Authorization', `Bearer ${staffX()}`);
    expect(res.status).toBe(403);
  });

  it('GET /reservations/:id — admin X không đọc được đặt bàn của Y → 403', async () => {
    const res = await request
      .get(`/api/reservations/${idOf(SEED_IDS.reservationY)}`)
      .set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(403);
  });

  it('GET /payments/:paymentId — staff X không xem được thanh toán của Y → 403', async () => {
    const res = await request
      .get(`/api/payments/${idOf(SEED_IDS.paymentY)}`)
      .set('Authorization', `Bearer ${staffX()}`);
    expect(res.status).toBe(403);
  });

  it('GET /auth/profile/:id — manager X không xem được user của Y → 403', async () => {
    const res = await request
      .get(`/api/auth/profile/${idOf(SEED_IDS.staffY)}`)
      .set('Authorization', `Bearer ${managerX()}`);
    expect(res.status).toBe(403);
  });

  // ============ GHI (WRITE) — TABLE ============

  it('PUT /tables/:id — admin X không sửa được bàn của Y → 403', async () => {
    const res = await request
      .put(`/api/tables/${idOf(SEED_IDS.tableY1)}`)
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ tableData: { capacity: 99 } });
    expect(res.status).toBe(403);
  });

  it('PATCH /tables/:id/status — staff X không đổi trạng thái bàn của Y → 403', async () => {
    const res = await request
      .patch(`/api/tables/${idOf(SEED_IDS.tableY1)}/status`)
      .set('Authorization', `Bearer ${staffX()}`)
      .send({ status: 'available' });
    expect(res.status).toBe(403);
  });

  // ============ GHI (WRITE) — MENU ============

  it('PUT /menu/category/:id — admin X không sửa danh mục của Y → 403', async () => {
    const res = await request
      .put(`/api/menu/category/${idOf(SEED_IDS.categoryY)}`)
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ name: 'Xâm nhập' });
    expect(res.status).toBe(403);
  });

  it('PUT /menu/item/:id — admin X không sửa món của Y → 403', async () => {
    const res = await request
      .put(`/api/menu/item/${idOf(SEED_IDS.menuItemY1)}`)
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ name: 'Xâm nhập' });
    expect(res.status).toBe(403);
  });

  it('PUT /menu/item/:id/availability — staff X không đổi trạng thái món của Y → 403', async () => {
    const res = await request
      .put(`/api/menu/item/${idOf(SEED_IDS.menuItemY1)}/availability`)
      .set('Authorization', `Bearer ${staffX()}`)
      .send({ isAvailable: false });
    expect(res.status).toBe(403);
  });

  // ============ GHI (WRITE) — ORDER ============

  it('PUT /orders/:id — staff X không cập nhật đơn của Y → 403', async () => {
    const res = await request
      .put(`/api/orders/${idOf(SEED_IDS.orderYActive)}`)
      .set('Authorization', `Bearer ${staffX()}`)
      .send({ notes: 'Xâm nhập' });
    expect(res.status).toBe(403);
  });

  it('PUT /orders/:id/status — staff X không đổi trạng thái đơn của Y → 403', async () => {
    const res = await request
      .put(`/api/orders/${idOf(SEED_IDS.orderYActive)}/status`)
      .set('Authorization', `Bearer ${staffX()}`)
      .send({ status: 'confirmed' });
    expect(res.status).toBe(403);
  });

  // ============ GHI (WRITE) — SETTING ============

  it('PUT /settings/:id — admin X không sửa cấu hình của Y → 403', async () => {
    const res = await request
      .put(`/api/settings/${idOf(SEED_IDS.settingY)}`)
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ systemConfig: { autoPushKDS: false } });
    expect(res.status).toBe(403);
  });

  it('PATCH /settings/:id/payment-method — admin X không đổi phương thức thanh toán của Y → 403', async () => {
    const res = await request
      .patch(`/api/settings/${idOf(SEED_IDS.settingY)}/payment-method`)
      .set('Authorization', `Bearer ${adminX()}`)
      .send({
        paymentMethodType: 'bank_transfer',
        payload: {
          bankAccount: {
            bankName: 'Test Bank',
            bin: '970415',
            accountNumber: '1234567890',
            accountName: 'TEST',
          },
        },
      });
    expect(res.status).toBe(403);
  });

  // ============ GHI (WRITE) — RESERVATION ============

  it('PUT /reservations/update/:id — admin X không sửa đặt bàn của Y → 403', async () => {
    const res = await request
      .put(`/api/reservations/update/${idOf(SEED_IDS.reservationY)}`)
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ partySize: 8 });
    expect(res.status).toBe(403);
  });

  it('PUT /reservations/update-status/:id — staff X không đổi trạng thái đặt bàn của Y → 403', async () => {
    const res = await request
      .put(`/api/reservations/update-status/${idOf(SEED_IDS.reservationY)}`)
      .set('Authorization', `Bearer ${staffX()}`)
      .query({ status: 'cancelled' });
    expect(res.status).toBe(403);
  });

  it('PUT /reservations/cancel/:id — staff X không hủy đặt bàn của Y → 403', async () => {
    const res = await request
      .put(`/api/reservations/cancel/${idOf(SEED_IDS.reservationY)}`)
      .set('Authorization', `Bearer ${staffX()}`)
      .query({ status: 'cancelled' });
    expect(res.status).toBe(403);
  });

  // ============ GHI (WRITE) — USER & RESTAURANT ============

  it('PUT /auth/admin/update/:id — admin X không sửa user của Y → 403', async () => {
    const res = await request
      .put(`/api/auth/admin/update/${idOf(SEED_IDS.staffY)}`)
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ name: 'Xâm nhập' });
    expect(res.status).toBe(403);
  });

  it('PUT /restaurants/update/:id — admin X không sửa nhà hàng Y → 403', async () => {
    const res = await request
      .put(`/api/restaurants/update/${Y}`)
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ name: 'Xâm nhập' });
    expect(res.status).toBe(403);
  });

  // ============ XOÁ (DELETE) — đặt cuối để không phá data các case trên ============

  it('DELETE /tables/:id — admin X không xóa bàn của Y → 403', async () => {
    const res = await request
      .delete(`/api/tables/${idOf(SEED_IDS.tableY2)}`)
      .set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(403);
  });

  it('DELETE /settings/:id — admin X không xóa cấu hình của Y → 403', async () => {
    const res = await request
      .delete(`/api/settings/${idOf(SEED_IDS.settingY)}`)
      .set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(403);
  });

  it('DELETE /auth/admin/delete/:id — admin X không xóa user của Y → 403', async () => {
    const res = await request
      .delete(`/api/auth/admin/delete/${idOf(SEED_IDS.staffY)}`)
      .set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(403);
  });

  it('DELETE /restaurants/:id — admin X không xóa nhà hàng Y → 403', async () => {
    const res = await request
      .delete(`/api/restaurants/${Y}`)
      .set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(403);
  });
});
