import { describe, it, expect } from 'vitest';
import { request, tokenFor } from './utils.js';
import { SEED_IDS } from './seed.js';

const X = SEED_IDS.tenantX.toString();
const authManager = () => `Bearer ${tokenFor('manager', X)}`;

/**
 * Regression — trang Quản Lý Đơn Hàng server-side:
 * - GET /orders/management: filter/search/phân trang + stats (aggregate phải cast ObjectId)
 * - GET /orders/management/export: trả .xlsx đọc được
 */
describe('GET /orders/management (Quản lý đơn hàng)', () => {
  it('trả data + total + stats khớp seed', async () => {
    const res = await request
      .get('/api/orders/management')
      .query({ page: 1, limit: 10 })
      .set("Authorization", authManager());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.total).toBe('number');
    expect(res.body.stats).toBeDefined();
    expect(res.body.stats.totalOrders).toBe(res.body.total);
    // Seed có đơn ở tenantX → stats không được rỗng
    expect(res.body.stats.totalOrders).toBeGreaterThan(0);
    expect(typeof res.body.stats.revenue).toBe('number');
  });

  it('filter status + search mã đơn hoạt động', async () => {
    const all = await request
      .get('/api/orders/management')
      .query({ limit: 50 })
      .set("Authorization", authManager());

    const firstStatus = all.body.data[0]?.status;
    expect(firstStatus).toBeTruthy();

    const filtered = await request
      .get('/api/orders/management')
      .query({ status: firstStatus, limit: 50 })
      .set("Authorization", authManager());

    filtered.body.data.forEach((o: { status: string }) => expect(o.status).toBe(firstStatus));

    if (all.body.data[0]?.orderId) {
      const kw = String(all.body.data[0].orderId).slice(0, 4);
      const searched = await request
        .get('/api/orders/management')
        .query({ search: kw, limit: 50 })
        .set("Authorization", authManager());
      searched.body.data.forEach((o: { orderId: string }) =>
        expect(o.orderId.toLowerCase()).toContain(kw.toLowerCase()),
      );
    }
  });

  it('GET /management/export trả .xlsx hợp lệ', async () => {
    // supertest mặc định parse text — cần buffer+binary parser để kiểm tra byte ZIP (PK)
    const binaryParser = (
      res: { setEncoding: (e: string) => void; on: (ev: string, cb: (c: never) => void) => void },
      callback: (err: Error | null, body?: Buffer) => void,
    ) => {
      res.setEncoding('binary');
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => callback(null, Buffer.from(data, 'binary')));
    };

    const res = await request
      .get('/api/orders/management/export')
      .buffer()
      // Supertest khai báo kiểu parse thiếu tham số — ép qua signature chuẩn của nó
      .parse(binaryParser as unknown as (str: string) => unknown)
      .set('Authorization', authManager());

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
    expect(res.headers['content-disposition']).toMatch(/don-hang-\d{4}-\d{2}-\d{2}\.xlsx/);
    // Magic bytes của file .xlsx (ZIP): PK
    expect(res.body[0]).toBe(0x50);
    expect(res.body[1]).toBe(0x4b);
  });
});
