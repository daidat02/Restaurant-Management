import { describe, it, expect } from 'vitest';
import { request, tokenFor } from './utils.js';

describe('T2 — PricingConfig API', () => {
  it('GET /api/pricing — chủ (admin) đọc được 4 chu kỳ', async () => {
    const res = await request
      .get('/api/pricing')
      .set('Authorization', `Bearer ${tokenFor('admin', undefined)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.cycles).toMatchObject({
      '1': 190000,
      '3': 570000,
      '6': 1020000,
      '12': 1820000,
    });
    expect(res.body.data.currency).toBe('VND');
  });

  it('PUT /api/admin/pricing — super-admin sửa giá thành công + audit', async () => {
    const res = await request
      .put('/api/admin/pricing')
      .set('Authorization', `Bearer ${tokenFor('super-admin')}`)
      .send({ cycles: { 1: 350000, 3: 950000, 6: 1700000, 12: 3100000 } });
    expect(res.status).toBe(200);
    expect(res.body.data.cycles).toMatchObject({
      '1': 350000,
      '3': 950000,
      '6': 1700000,
      '12': 3100000,
    });
  });

  it('PUT /api/admin/pricing — sai quyền (admin) → 403', async () => {
    const res = await request
      .put('/api/admin/pricing')
      .set('Authorization', `Bearer ${tokenFor('admin', undefined)}`)
      .send({ cycles: { 1: 1, 3: 1, 6: 1, 12: 1 } });
    expect(res.status).toBe(403);
  });

  it('PUT /api/admin/pricing — giá không hợp lệ (<= 0 / thiếu) → 400', async () => {
    const bad1 = await request
      .put('/api/admin/pricing')
      .set('Authorization', `Bearer ${tokenFor('super-admin')}`)
      .send({ cycles: { 1: 0, 3: 1, 6: 1, 12: 1 } });
    expect(bad1.status).toBe(400);

    const bad2 = await request
      .put('/api/admin/pricing')
      .set('Authorization', `Bearer ${tokenFor('super-admin')}`)
      .send({ cycles: { 1: 100, 3: 100 } });
    expect(bad2.status).toBe(400);
  });
});
