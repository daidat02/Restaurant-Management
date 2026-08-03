import { describe, it, expect } from 'vitest';
import { request, tokenFor, idOf } from './utils.js';
import { SEED_IDS } from './seed.js';

const X = SEED_IDS.tenantX.toString();
const Y = SEED_IDS.tenantY.toString();

const adminX = () => tokenFor('admin', X);
const managerX = () => tokenFor('manager', X);

describe('T5 — Notification chain: admin (chủ chuỗi) gộp toàn chuỗi qua GET /api/notifications', () => {
  it('GET /api/notifications — admin sở hữu X+Y → 200, gộp thông báo cả 2 nhà hàng kèm tên', async () => {
    const res = await request
      .get('/api/notifications')
      .set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(200);
    const list = res.body.data as any[];
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(2);

    const ids = list.map((n) => n.restaurant?._id ?? n.restaurant).map((id) => idOf(id));
    expect(ids).toContain(X);
    expect(ids).toContain(Y);

    for (const n of list) {
      // populate('restaurant', 'name') → restaurant là object có _id + name
      expect(n.restaurant?.name).toBeTruthy();
    }
  });

  it('GET /api/notifications — manager X → 200, chỉ thông báo X (không gộp chuỗi)', async () => {
    const res = await request
      .get('/api/notifications')
      .set('Authorization', `Bearer ${managerX()}`);
    expect(res.status).toBe(200);
    const list = res.body.data as any[];
    for (const n of list) {
      const rid = idOf(n.restaurant?._id ?? n.restaurant);
      expect(rid).toBe(X);
    }
  });
});
