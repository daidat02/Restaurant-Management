import { describe, it, expect } from 'vitest';
import { request } from './utils.js';
import { SEED_IDS } from './seed.js';

const X = SEED_IDS.tenantX.toString();
const Y = SEED_IDS.tenantY.toString();

const idOf = (oid: unknown) => oid.toString();

describe('T8 — QR / bàn: tạo đơn công khai tại bàn + đọc đơn theo bàn', () => {
  it('POST /api/orders (không token) tại bàn X2 → 201', async () => {
    const res = await request.post('/api/orders').send({
      restaurant: X,
      table: idOf(SEED_IDS.tableX2),
      orderType: 'dine-in',
      items: [{ menuItem: idOf(SEED_IDS.menuItemX1), quantity: 2 }],
    });
    expect(res.status).toBe(201);
    expect(res.body.data.restaurant?.toString?.() ?? res.body.data.restaurant).toBe(X);
    expect(res.body.data.totalAmount).toBe(35000 * 2);
  });

  it('POST /api/orders bàn Y nhưng restaurant X → 400 (chống giả mạo QR)', async () => {
    const res = await request.post('/api/orders').send({
      restaurant: X,
      table: idOf(SEED_IDS.tableY1),
      orderType: 'dine-in',
      items: [{ menuItem: idOf(SEED_IDS.menuItemY1), quantity: 1 }],
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/orders thiếu items → 400', async () => {
    const res = await request.post('/api/orders').send({
      restaurant: X,
      table: idOf(SEED_IDS.tableX2),
      orderType: 'dine-in',
      items: [],
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/orders delivery thiếu thông tin giao → 400', async () => {
    const res = await request.post('/api/orders').send({
      restaurant: X,
      orderType: 'delivery',
      items: [{ menuItem: idOf(SEED_IDS.menuItemX1), quantity: 1 }],
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/orders delivery đầy đủ → 201', async () => {
    const res = await request.post('/api/orders').send({
      restaurant: X,
      orderType: 'delivery',
      deliveryInfo: { name: 'Khách A', phone: '0900000001', address: 'Hà Nội' },
      items: [{ menuItem: idOf(SEED_IDS.menuItemX1), quantity: 1 }],
    });
    expect(res.status).toBe(201);
  });

  it('GET /api/orders/table/:tableId — bàn X1 (có đơn active) → 200, đơn thuộc X', async () => {
    const res = await request.get(`/api/orders/table/${idOf(SEED_IDS.tableX1)}`);
    expect(res.status).toBe(200);
    const order = res.body.data;
    expect(order?.restaurant?.toString?.() ?? order?.restaurant).toBe(X);
  });

  it('GET /api/orders/table/:tableId — bàn Y1 → 200, đơn thuộc Y', async () => {
    const res = await request.get(`/api/orders/table/${idOf(SEED_IDS.tableY1)}`);
    expect(res.status).toBe(200);
    const order = res.body.data;
    expect(order?.restaurant?.toString?.() ?? order?.restaurant).toBe(Y);
  });

  it('GET /api/orders/table/:tableId — bàn không có đơn active → 404', async () => {
    const res = await request.get(`/api/orders/table/${idOf(SEED_IDS.tableY2)}`);
    expect(res.status).toBe(404);
  });
});
