import { describe, it, expect } from 'vitest';
import { request, tokenFor, idOf } from './utils.js';
import { SEED_IDS } from './seed.js';
import DB_Connection from '../models/DB_Connection.js';

const X = SEED_IDS.tenantX.toString();
const Y = SEED_IDS.tenantY.toString();

const superAdmin = () => tokenFor('super-admin');
const adminX = () => tokenFor('admin', X);

describe('T15 — Gói cước (Plan): đổi gói + enforce hạn mức free', () => {
  it('PATCH /restaurants/plan/:id — super-admin đổi X sang free → 200, plan cập nhật', async () => {
    const res = await request
      .patch(`/api/restaurants/plan/${X}`)
      .set('Authorization', `Bearer ${superAdmin()}`)
      .send({ plan: 'free' });
    expect(res.status).toBe(200);
    expect(res.body.data.plan).toBe('free');
  });

  it('PATCH /restaurants/plan/:id — admin X không có quyền → 403', async () => {
    const res = await request
      .patch(`/api/restaurants/plan/${X}`)
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ plan: 'pro' });
    expect(res.status).toBe(403);
  });

  it('PATCH /restaurants/plan/:id — gói không hợp lệ → 400', async () => {
    const res = await request
      .patch(`/api/restaurants/plan/${X}`)
      .set('Authorization', `Bearer ${superAdmin()}`)
      .send({ plan: 'ultra' });
    expect(res.status).toBe(400);
  });

  it('PATCH /restaurants/plan/:id — đổi gói → có audit log restaurant.plan.change', async () => {
    await request
      .patch(`/api/restaurants/plan/${X}`)
      .set('Authorization', `Bearer ${superAdmin()}`)
      .send({ plan: 'pro' });

    const log = (await DB_Connection.AuditLog.findOne({ action: 'restaurant.plan.change' })
      .sort({ createdAt: -1 })
      .lean()) as any;
    expect(log).toBeTruthy();
    expect(idOf(log?.restaurant)).toBe(X);
    expect(log?.meta?.newPlan).toBe('pro');
  });

  describe('Hạn mức nhân sự (free = 5 user)', () => {
    it('Hạ X về free rồi tạo staff đến hạn mức 5, user thứ 6 → 403', async () => {
      // X đang pro từ test trước → hạ về free
      await request
        .patch(`/api/restaurants/plan/${X}`)
        .set('Authorization', `Bearer ${superAdmin()}`)
        .send({ plan: 'free' });

      // Seed đã có 3 nhân sự thuộc X (adminX, managerX, staffX) → tạo 2 nữa là đủ 5
      for (let i = 1; i <= 2; i++) {
        const ok = await request
          .post('/api/auth/admin/create')
          .set('Authorization', `Bearer ${adminX()}`)
          .send({
            name: `Limit Staff ${i}`,
            email: `limit.staff${i}@nhamnhi.vn`,
            phone: `09000001${i}`,
            password: 'Test@NhamNhi2026',
            role: 'staff',
          });
        expect(ok.status).toBe(201);
      }

      // User thứ 6 → vượt hạn mức free → 403
      const blocked = await request
        .post('/api/auth/admin/create')
        .set('Authorization', `Bearer ${adminX()}`)
        .send({
          name: 'Limit Staff 6',
          email: 'limit.staff6@nhamnhi.vn',
          phone: '090000016',
          password: 'Test@NhamNhi2026',
          role: 'staff',
        });
      expect(blocked.status).toBe(403);
    });

    it('Nâng X lên pro → tạo staff vượt 5 → 201', async () => {
      await request
        .patch(`/api/restaurants/plan/${X}`)
        .set('Authorization', `Bearer ${superAdmin()}`)
        .send({ plan: 'pro' });

      const res = await request
        .post('/api/auth/admin/create')
        .set('Authorization', `Bearer ${adminX()}`)
        .send({
          name: 'Pro Staff',
          email: 'pro.staff@nhamnhi.vn',
          phone: '090000099',
          password: 'Test@NhamNhi2026',
          role: 'staff',
        });
      expect(res.status).toBe(201);
    });
  });

  describe('Hạn mức đơn hàng (free = 500/tháng)', () => {
    it('Free với 500+ đơn trong tháng → POST /orders → 403', async () => {
      await request
        .patch(`/api/restaurants/plan/${X}`)
        .set('Authorization', `Bearer ${superAdmin()}`)
        .send({ plan: 'free' });

      // Chèn thẳng 500 đơn vào DB (cùng tháng này) để đạt hạn mức nhanh
      const bulk = Array.from({ length: 500 }, (_, i) => ({
        orderId: `bulk-limit-${i}`,
        restaurant: SEED_IDS.tenantX,
        orderType: 'delivery' as const,
        status: 'paid' as const,
        paymentStatus: 'paid' as const,
        totalAmount: 0,
        itemsCount: 0,
      }));
      await DB_Connection.Order.insertMany(bulk);

      const res = await request.post('/api/orders').send({
        restaurant: X,
        orderType: 'delivery',
        deliveryInfo: { name: 'Khách A', phone: '0900000001', address: 'Hà Nội' },
        items: [{ menuItem: idOf(SEED_IDS.menuItemX1), quantity: 1 }],
      });
      expect(res.status).toBe(403);
    });

    it('Nâng X lên pro → tạo đơn → 201 (hết giới hạn)', async () => {
      await request
        .patch(`/api/restaurants/plan/${X}`)
        .set('Authorization', `Bearer ${superAdmin()}`)
        .send({ plan: 'pro' });

      const res = await request.post('/api/orders').send({
        restaurant: X,
        orderType: 'delivery',
        deliveryInfo: { name: 'Khách B', phone: '0900000002', address: 'Hồ Chí Minh' },
        items: [{ menuItem: idOf(SEED_IDS.menuItemX1), quantity: 1 }],
      });
      expect(res.status).toBe(201);
    });

    it('Y vẫn pro mặc định → tạo đơn không bị chặn', async () => {
      const res = await request.post('/api/orders').send({
        restaurant: Y,
        orderType: 'delivery',
        deliveryInfo: { name: 'Khách C', phone: '0900000003', address: 'Đà Nẵng' },
        items: [{ menuItem: idOf(SEED_IDS.menuItemY1), quantity: 1 }],
      });
      expect(res.status).toBe(201);
    });
  });
});
