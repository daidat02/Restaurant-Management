import { describe, it, expect, beforeAll, vi } from 'vitest';
import { request, tokenFor, idOf } from './utils.js';
import { SEED_IDS } from './seed.js';
import DB_Connection from '../models/DB_Connection.js';
import { __setPayOSClient } from '../modules/PaymentModule/payos.service.js';

// Đăng ký job handler (complete-payment) để addJob chạy inline khi Redis off trong test.
import '../jobs/index.js';

const X = SEED_IDS.tenantX.toString();
const staffX = () => tokenFor('staff', X);

const verifyMock = vi.fn(async (payload: any) => ({
  ...(payload?.data || payload),
  code: '00',
  status: 'PAID',
}));

function injectPayOSMock() {
  __setPayOSClient(
    function MockPayOS() {
      return {
        paymentRequests: { create: vi.fn(), cancel: vi.fn() },
        webhooks: { verify: verifyMock },
      };
    },
  );
}

describe('T13 — Queue payment-webhook: webhook verify-sync + complete job (idempotent, Redis off → inline)', () => {
  let orderId = '';
  let paymentId = '';
  let orderCode = 0;

  beforeAll(async () => {
    injectPayOSMock();
    // Tạo đơn dine-in + phục vụ món + initiate payment (giống payment-refund test).
    const createRes = await request
      .post('/api/orders')
      .send({
        orderId: `ORD-QUEUE-${Date.now()}`,
        orderType: 'dine-in',
        table: idOf(SEED_IDS.tableX2),
        restaurant: X,
        items: [{ menuItem: idOf(SEED_IDS.menuItemX1), quantity: 1 }],
      });
    orderId = createRes.body?.data?._id || '';
    const itemId = createRes.body?.data?.items?.[0]?._id || '';
    await request
      .post(`/api/orders/item/${itemId}/served`)
      .set('Authorization', `Bearer ${staffX()}`);
    const init = await request
      .post('/api/payments/initiate')
      .set('Authorization', `Bearer ${staffX()}`)
      .send({ orderId });
    paymentId = init.body?.data?._id || '';

    // Mô phỏng trạng thái trước webhook: payos.createUrl cập nhật orderCode + status 'authorized'.
    orderCode = Number(String(Date.now()).slice(-8));
    await DB_Connection.Payment.findByIdAndUpdate(paymentId, {
      orderCode,
      status: 'authorized',
      method: 'banking',
    });
  });

  it('Setup dữ liệu test (data)', () => {
    expect(paymentId).toBeTruthy();
    expect(orderCode).toBeGreaterThan(0);
  });

  it('Webhook hợp lệ (Redis off) → trả 200 + payment captured + order completed + bàn trống', async () => {
    const res = await request.post('/api/payments/webhook').send({
      code: '00',
      data: { orderCode, amount: 35000 },
      signature: 'mock-signature',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const payment = await DB_Connection.Payment.findById(paymentId);
    expect(payment?.status).toBe('captured');
    const order = await DB_Connection.Order.findById(orderId);
    expect(order?.status).toBe('completed');
    expect(order?.paymentStatus).toBe('paid');
    const table = await DB_Connection.Table.findById(SEED_IDS.tableX2);
    expect(table?.status).toBe('available');
  });

  it('Double-webhook cùng orderCode → chỉ complete 1 lần (idempotent, không lỗi)', async () => {
    const before = await DB_Connection.Payment.findById(paymentId);
    expect(before?.status).toBe('captured');

    // Gửi lại webhook (PayloadOS gửi trùng khi chưa nhận ack đủ nhanh).
    const res = await request.post('/api/payments/webhook').send({
      code: '00',
      data: { orderCode, amount: 35000 },
      signature: 'mock-signature',
    });
    // Route vẫn ack 200 (job guard no-op), không throw, không double-complete.
    expect(res.status).toBe(200);

    const after = await DB_Connection.Payment.findById(paymentId);
    expect(after?.status).toBe('captured');
    const order = await DB_Connection.Order.findById(orderId);
    expect(order?.status).toBe('completed');
  });

  it('Webhook với orderCode không tồn tại → vẫn ack 200 (no-op, PayOS cần 2XX để đánh dấu thành công)', async () => {
    const res = await request.post('/api/payments/webhook').send({
      code: '00',
      data: { orderCode: 999999999, amount: 100 },
      signature: 'mock-signature',
    });
    // PayOS chỉ xác nhận webhook gửi thành công khi nhận 2XX — không được trả 4xx/5xx ở đây.
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
  });

  it('Sample webhook PayOS thật (raw) → không 401 (route public giữ nguyên)', async () => {
    // PayOS gửi body ở dạng { data: {...}, signature } — route public, chữ ký xấu → 400.
    const res = await request.post('/api/payments/webhook').send({
      code: '01',
      desc: 'Giao dịch thất bại',
      data: { orderCode: -99999 },
      signature: 'invalid',
    });
    expect(res.status).not.toBe(401);
  });
});