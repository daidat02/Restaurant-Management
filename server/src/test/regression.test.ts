import { describe, it, expect } from 'vitest';
import { request, tokenFor, idOf } from './utils.js';
import { SEED_IDS } from './seed.js';

const X = SEED_IDS.tenantX.toString();

const managerX = () => tokenFor('manager', X);
const adminX = () => tokenFor('admin', X);
const customer = () => tokenFor('customer');

const d = (daysFromNow: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + daysFromNow);
  return dt.toISOString().slice(0, 10);
};

describe('T13 — Regression nghiệp vụ', () => {
  it('GET /menu/items/:restaurantId — danh sách món X', async () => {
    const res = await request.get(`/api/menu/items/${X}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /menu/category/:restaurantId — danh sách danh mục X', async () => {
    const res = await request.get(`/api/menu/category/${X}`);
    expect(res.status).toBe(200);
  });

  it('POST /menu/category — manager X tạo danh mục → 201', async () => {
    const res = await request
      .post('/api/menu/category')
      .set('Authorization', `Bearer ${managerX()}`)
      .send({ name: 'Món mới' });
    expect(res.status).toBe(201);
  });

  it('PUT /menu/item/:id/availability — staff X bật/tắt món X → 200', async () => {
    const res = await request
      .put(`/api/menu/item/${idOf(SEED_IDS.menuItemX1)}/availability`)
      .set('Authorization', `Bearer ${managerX()}`)
      .send({ isAvailable: false });
    expect(res.status).toBe(200);
  });

  it('POST /orders/add-item — thêm món vào đơn active X (public)', async () => {
    const res = await request.post('/api/orders/add-item').send({
      orderId: idOf(SEED_IDS.orderXActive),
      items: [{ menuItem: idOf(SEED_IDS.menuItemX2), quantity: 1 }],
    });
    expect(res.status).toBe(200);
  });

  it('POST /orders/item/:itemId/:status — cập nhật trạng thái món (token)', async () => {
    const res = await request
      .post(`/api/orders/item/${idOf(SEED_IDS.orderItemXActive)}/preparing`)
      .set('Authorization', `Bearer ${managerX()}`);
    expect(res.status).toBe(200);
  });

  it('GET /reservations/tables/slots — public, có danh sách slot', async () => {
    const res = await request
      .get(`/api/reservations/tables/slots?date=${d(0)}&restaurantId=${X}`)
      .send();
    expect(res.status).toBe(200);
  });

  it('PATCH /notifications/:id/read — đánh dấu đọc thông báo', async () => {
    const res = await request
      .patch(`/api/notifications/${idOf(SEED_IDS.notificationX)}/read`)
      .set('Authorization', `Bearer ${managerX()}`);
    expect(res.status).toBe(200);
  });

  it('POST /reservations/create — public, đặt bàn X', async () => {
    const res = await request.post('/api/reservations/create').send({
      date: d(1),
      restaurant: X,
      reservationTime: '19:00',
      partySize: 2,
      customerInfo: {
        name: 'Khách T13',
        email: 't13@example.com',
        phoneNumber: '0900000013',
        note: '',
        side: '',
      },
    });
    expect(res.status).toBe(201);
  });

  it('GET /reservations/me — customer xem đặt bàn của mình', async () => {
    const res = await request
      .get('/api/reservations/me')
      .set('Authorization', `Bearer ${customer()}`);
    expect(res.status).toBe(200);
  });

  it('GET /restaurants — public, danh sách nhà hàng', async () => {
    const res = await request.get('/api/restaurants');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /auth/profile/me — customer xem profile', async () => {
    const res = await request
      .get('/api/auth/profile/me')
      .set('Authorization', `Bearer ${customer()}`);
    expect(res.status).toBe(200);
  });

  it('GET /auth/ — manager X lấy danh sách user X → 200', async () => {
    const res = await request.get('/api/auth/').set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(200);
  });

  it('KDS regression — đơn served rồi thêm món → đơn quay về pending để bếp nhận', async () => {
    // 1. Tạo đơn dine-in X với 1 món
    const createRes = await request.post('/api/orders').send({
      restaurant: X,
      table: idOf(SEED_IDS.tableX2),
      orderType: 'dine-in',
      items: [{ menuItem: idOf(SEED_IDS.menuItemX1), quantity: 1 }],
    });
    expect(createRes.status).toBe(201);
    const orderId = createRes.body.data._id;
    const itemId = createRes.body.data.items[0]._id;
    expect(orderId).toBeTruthy();
    expect(itemId).toBeTruthy();

    // 2. Bếp xác nhận món nấu xong → đơn tự chuyển served
    const servedRes = await request
      .post(`/api/orders/item/${itemId}/served`)
      .set('Authorization', `Bearer ${managerX()}`);
    expect(servedRes.status).toBe(200);

    const servedOrder = await request
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${managerX()}`);
    expect(servedOrder.status).toBe(200);
    expect(servedOrder.body.data.status).toBe('served');

    // 3. Khách gọi thêm món → đơn phải mở lại pending để KDS nhận món mới
    const addRes = await request.post('/api/orders/add-item').send({
      orderId,
      items: [{ menuItem: idOf(SEED_IDS.menuItemX2), quantity: 1 }],
    });
    expect(addRes.status).toBe(200);

    const reopenedOrder = await request
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${managerX()}`);
    expect(reopenedOrder.status).toBe(200);
    expect(reopenedOrder.body.data.status).toBe('pending');
    expect(reopenedOrder.body.data.items.length).toBe(2);
  });

  it('KDS regression — đơn paid trước rồi thêm món → đơn quay về pending để bếp nhận', async () => {
    // 1. Tạo đơn dine-in X với 1 món
    const createRes = await request.post('/api/orders').send({
      restaurant: X,
      table: idOf(SEED_IDS.tableX2),
      orderType: 'dine-in',
      items: [{ menuItem: idOf(SEED_IDS.menuItemX1), quantity: 1 }],
    });
    expect(createRes.status).toBe(201);
    const orderId = createRes.body.data._id;

    // 2. Chuyển đơn sang paid (thanh toán trước)
    const paidRes = await request
      .put(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${managerX()}`)
      .send({ status: 'paid' });
    expect(paidRes.status).toBe(200);

    // 3. Khách gọi thêm món → đơn phải mở lại pending để KDS nhận món mới
    const addRes = await request.post('/api/orders/add-item').send({
      orderId,
      items: [{ menuItem: idOf(SEED_IDS.menuItemX2), quantity: 1 }],
    });
    expect(addRes.status).toBe(200);

    const reopenedOrder = await request
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${managerX()}`);
    expect(reopenedOrder.status).toBe(200);
    expect(reopenedOrder.body.data.status).toBe('pending');
  });

  it('KDS regression — GET /orders/kds/:id trả đơn paid còn món chưa xong (bất kể trạng thái đơn)', async () => {
    // Tạo đơn dine-in X với 1 món, chuyển sang paid (thanh toán trước nhưng món chưa nấu)
    const createRes = await request.post('/api/orders').send({
      restaurant: X,
      table: idOf(SEED_IDS.tableX2),
      orderType: 'dine-in',
      items: [{ menuItem: idOf(SEED_IDS.menuItemX1), quantity: 1 }],
    });
    expect(createRes.status).toBe(201);
    const orderId = createRes.body.data._id;

    await request
      .put(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${managerX()}`)
      .send({ status: 'paid' });

    // Endpoint KDS dùng token bếp X
    const kdsRes = await request
      .get(`/api/orders/kds/${X}`)
      .set('Authorization', `Bearer ${tokenFor('kds', X)}`);
    expect(kdsRes.status).toBe(200);
    const kdsOrderIds = (kdsRes.body.data as any[]).map((o) => String(o._id));
    // Đơn paid còn món chưa xong phải xuất hiện trên KDS
    expect(kdsOrderIds).toContain(String(orderId));
  });
});
