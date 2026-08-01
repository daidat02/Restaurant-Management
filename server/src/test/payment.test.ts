import { describe, it, expect } from 'vitest';
import { request, tokenFor } from './utils.js';
import { SEED_IDS } from './seed.js';

const X = SEED_IDS.tenantX.toString();

const staffX = () => tokenFor('staff', X);
const idOf = (oid: unknown) => oid.toString();

describe('T9 — Payment', () => {
  describe('GET /payments/:paymentId — cần token + cô lập tenant', () => {
    it('staff X đọc payment X → 200', async () => {
      const res = await request
        .get(`/api/payments/${idOf(SEED_IDS.paymentX)}`)
        .set('Authorization', `Bearer ${staffX()}`);
      expect(res.status).toBe(200);
    });

    it('staff X đọc payment Y → kỳ vọng 403 (hiện 200, thiếu tenant check)', async () => {
      const res = await request
        .get(`/api/payments/${idOf(SEED_IDS.paymentY)}`)
        .set('Authorization', `Bearer ${staffX()}`);
      expect(res.status).toBe(403);
    });

    it('không có token → 401', async () => {
      const res = await request.get(`/api/payments/${idOf(SEED_IDS.paymentX)}`);
      expect(res.status).toBe(401);
    });

    it('payment không tồn tại → 404', async () => {
      const res = await request
        .get('/api/payments/000000000000000000000000')
        .set('Authorization', `Bearer ${staffX()}`);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /payments/initiate', () => {
    it('initiate cho đơn active → 201', async () => {
      const res = await request
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer ${staffX()}`)
        .send({ orderId: idOf(SEED_IDS.orderYActive) });
      expect(res.status).toBe(201);
    });

    it('initiate cho đơn đã paid → 400', async () => {
      const res = await request
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer ${staffX()}`)
        .send({ orderId: idOf(SEED_IDS.orderXPaid) });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /payments/:paymentId/method/:method', () => {
    it('payment không tồn tại → ghi nhận hành vi hiện tại 500 (repo .save(null) throw)', async () => {
      const res = await request
        .post('/api/payments/000000000000000000000000/method/cash')
        .set('Authorization', `Bearer ${staffX()}`);
      // PaymentRepository.updatePayment gọi updatedPayment.save() khi findByIdAndUpdate trả null → throw → 500.
      // Kỳ vọng đúng phải là 404. Chưa thuộc phạm vi tenant.
      expect(res.status).toBe(500);
    });
  });

  describe('Các route công khai (public) — không cần token', () => {
    it('POST /banking/:orderId → không đòi 401', async () => {
      const res = await request.post(`/api/payments/banking/${idOf(SEED_IDS.orderXPaid)}`);
      expect(res.status).not.toBe(401);
    });

    it('POST /:orderId/cancel → không đòi 401', async () => {
      const res = await request.post(`/api/payments/${idOf(SEED_IDS.orderXPaid)}/cancel`);
      expect(res.status).not.toBe(401);
    });

    it('POST /check-connect thiếu payload → ghi nhận hiện tại 500 (destructure undefined)', async () => {
      const res = await request.post('/api/payments/check-connect').send({});
      // Controller destructure payload từ body {} → undefined → service throw → 500.
      // Kỳ vọng đúng phải là 400. Chưa thuộc phạm vi tenant.
      expect(res.status).toBe(500);
    });

    it('POST /webhook → không đòi 401', async () => {
      const res = await request.post('/api/payments/webhook').send({});
      expect(res.status).not.toBe(401);
    });
  });
});
