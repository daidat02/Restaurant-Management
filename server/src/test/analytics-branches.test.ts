import { describe, it, expect } from 'vitest';
import { request, tokenFor, idOf } from './utils.js';
import { SEED_IDS } from './seed.js';

const X = SEED_IDS.tenantX.toString();
const Y = SEED_IDS.tenantY.toString();

const adminX = () => tokenFor('admin', X);
const managerX = () => tokenFor('manager', X);

describe('T7 — Analytics revenue-branches: admin (chủ chuỗi) lấy doanh thu từng chi nhánh', () => {
  it('GET /analytics/revenue-branches — admin sở hữu X+Y → 200, có dữ liệu chi nhánh', async () => {
    const res = await request
      .get('/api/analytics/revenue-branches')
      .query({ startDate: '2020-01-01', endDate: '2030-01-01' })
      .set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(200);
    const data = res.body.data as any[];
    expect(Array.isArray(data)).toBe(true);
    for (const b of data) {
      expect(typeof b.branchName).toBe('string');
      expect(typeof b.revenue).toBe('number');
      expect(typeof b.orderCount).toBe('number');
    }
  });

  it('GET /analytics/revenue-branches — manager X → 200, chỉ data chi nhánh X', async () => {
    const res = await request
      .get('/api/analytics/revenue-branches')
      .query({ startDate: '2020-01-01', endDate: '2030-01-01' })
      .set('Authorization', `Bearer ${managerX()}`);
    expect(res.status).toBe(200);
    const data = res.body.data as any[];
    for (const b of data) {
      // Repo trả branchName từ lookup restaurants — đảm bảo không leak tên nhà hàng Y qua manager X
      expect(b.branchName).not.toBe('NhamNhi Cơ Sở 2');
    }
  });
});
