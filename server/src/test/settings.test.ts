import { describe, it, expect } from 'vitest';
import { request, tokenFor, idOf } from './utils.js';
import { SEED_IDS } from './seed.js';

const X = SEED_IDS.tenantX.toString();

const adminX = () => tokenFor('admin', X);
const managerX = () => tokenFor('manager', X);
const staffX = () => tokenFor('staff', X);


describe('T11 — Settings', () => {
  it('GET /settings/:id — manager X đọc cấu hình X → 200 (controller dùng req.tenantId)', async () => {
    const res = await request
      .get(`/api/settings/${idOf(SEED_IDS.settingX)}`)
      .set('Authorization', `Bearer ${managerX()}`);
    expect(res.status).toBe(200);
    const target = res.body.data.targetId;
    expect(target?._id?.toString?.() ?? target?.toString?.() ?? target).toBe(X);
  });

  it('GET /settings/:id — staff X đọc cấu hình → 200', async () => {
    const res = await request
      .get(`/api/settings/${idOf(SEED_IDS.settingX)}`)
      .set('Authorization', `Bearer ${staffX()}`);
    expect(res.status).toBe(200);
  });

  it('PUT /settings/:id — admin X cập nhật cấu hình X → 200', async () => {
    const res = await request
      .put(`/api/settings/${idOf(SEED_IDS.settingX)}`)
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ systemConfig: { autoPushKDS: false } });
    expect(res.status).toBe(200);
  });

  it('PATCH /settings/:id/payment-method (bank_transfer) — admin X → 200', async () => {
    const res = await request
      .patch(`/api/settings/${idOf(SEED_IDS.settingX)}/payment-method`)
      .set('Authorization', `Bearer ${adminX()}`)
      .send({
        paymentMethodType: 'bank_transfer',
        payload: {
          bankAccount: {
            bankName: 'Test Bank',
            bin: '970415',
            accountNumber: '1234567890',
            accountName: 'NHAM NHI',
          },
        },
      });
    expect(res.status).toBe(200);
  });

  it('POST /settings/create trùng cấu hình tenant X → 400', async () => {
    const res = await request
      .post('/api/settings/create')
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ scope: 'restaurant', targetModel: 'Restaurant', targetId: X });
    expect(res.status).toBe(400);
  });

  it('POST /settings/get-or-create/:scope/:model/:targetId — admin X → 200 trả cấu hình X', async () => {
    const res = await request
      .get(`/api/settings/get-or-create/restaurant/Restaurant/${X}`)
      .set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(200);
    const target = res.body.data.targetId;
    expect(target?._id?.toString?.() ?? target?.toString?.() ?? target).toBe(X);
  });

  it('POST /settings/kds/verify thiếu code → 400 (public)', async () => {
    const res = await request.post('/api/settings/kds/verify').send({});
    expect(res.status).toBe(400);
  });

  it('staff không gọi được PUT /settings/:id → 403', async () => {
    const res = await request
      .put(`/api/settings/${idOf(SEED_IDS.settingX)}`)
      .set('Authorization', `Bearer ${staffX()}`)
      .send({});
    expect(res.status).toBe(403);
  });
});
