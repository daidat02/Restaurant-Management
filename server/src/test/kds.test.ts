import { describe, it, expect } from 'vitest';
import { request, tokenFor } from './utils.js';
import { SEED_IDS } from './seed.js';

const X = SEED_IDS.tenantX.toString();

const adminX = () => tokenFor('admin', X);

describe('T5 — KDS: xác thực mã nhà bếp', () => {
  it('verify mã đúng (X) → 200, token KDS + restaurantId X', async () => {
    const res = await request.post('/api/settings/kds/verify').send({ code: '456734' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.restaurantId).toBe(X);
  });

  it('verify mã đúng (Y) → 200, restaurantId Y', async () => {
    const res = await request.post('/api/settings/kds/verify').send({ code: '553572' });
    expect(res.status).toBe(200);
    expect(res.body.data.restaurantId).toBe(SEED_IDS.tenantY.toString());
  });

  it('verify mã sai → 401', async () => {
    const res = await request.post('/api/settings/kds/verify').send({ code: '000000' });
    expect(res.status).toBe(401);
  });

  it('verify thiếu code → 400', async () => {
    const res = await request.post('/api/settings/kds/verify').send({});
    expect(res.status).toBe(400);
  });

  it('public — không cần token vẫn verify được', async () => {
    const res = await request.post('/api/settings/kds/verify').send({ code: '456734' });
    expect(res.status).toBe(200);
  });

  it('generate mã mới (admin X) → 200, trả mã 6 chữ số', async () => {
    const res = await request
      .post(`/api/settings/${SEED_IDS.settingX.toString()}/kds-code`)
      .set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(200);
    expect(String(res.body.data.kitchenCode)).toMatch(/^\d{6}$/);
  });

  it('admin X không generate được mã cho Y → 403 (verifyTenant đã chặn)', async () => {
    const res = await request
      .post(`/api/settings/${SEED_IDS.settingY.toString()}/kds-code`)
      .set('Authorization', `Bearer ${adminX()}`);
    // verifyTenant dùng req.tenantId = X → generate cho X. Kỳ vọng route phải chặn tham chiếu Y.
    expect(res.status).toBe(403);
  });
});
