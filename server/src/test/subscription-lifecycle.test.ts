import { describe, it, expect } from 'vitest';
import { request, signToken } from './utils.js';
import DB_Connection from '../models/DB_Connection.js';
import { SEED_IDS } from './seed.js';

const day = 24 * 3600 * 1000;

/**
 * T11 — Verify toàn diện chuỗi "chống production":
 * đăng ký chủ mới → nhà hàng đầu (active + Miễn Phí) → phục vụ OK → nâng gói Basic (trả phí)
 * → (mock) hết hạn → TỰ HẠ về Miễn Phí (KHÔNG khoá) → vẫn phục vụ được
 * → super-admin thấy KPI/giao dịch → block/unblock chủ.
 */
describe('T11 — Verify lifecycle subscription (free → upgrade → hết hạn → hạ về free)', () => {
  it('toàn bộ vòng đời thuê bao + super-admin giám sát', async () => {
    // 0. Đăng ký chủ mới (role admin, chưa có nhà hàng)
    const reg = await request.post('/api/auth/register-owner').send({
      name: 'Chủ Lifecycle',
      email: 'owner.lifecycle@nhamnhi.vn',
      password: 'Test@NhamNhi2026',
      phone: '0912345678',
    });
    expect(reg.status).toBe(201);
    const ownerId = reg.body.data._id as string;
    // register-owner không còn auto-login → chỉ trả {_id, email}; role admin xác nhận qua DB.
    const owner = await DB_Connection.User.findById(ownerId).lean();
    expect((owner as any).role).toBe('admin');
    // Xác thực email (OTP) để bước 6 đăng nhập sau unblock được — register-owner không auto-login.
    await request.post('/api/auth/verify-otp').send({
      email: 'owner.lifecycle@nhamnhi.vn',
      otp: (owner as any).emailOtp,
    });
    const ownerToken = signToken(ownerId, 'admin');

    // 1. Nhà hàng đầu tiên → active + gói Miễn Phí (không trial, không paidUntil)
    const createRes = await request
      .post('/api/restaurants')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Nhà hàng lifecycle', email: 'lc@nhamnhi.vn', operatingHours: '8-22' });
    expect(createRes.status).toBe(201);
    const restaurant = createRes.body.result.data;
    expect(restaurant.subscription).toBe('active');
    expect(restaurant.currentPlanKey).toBe('free');
    expect(restaurant.trialEndsAt).toBeUndefined();
    expect(restaurant.paidUntil).toBeUndefined();
    expect(restaurant.ownerId?.toString()).toBe(ownerId);
    const rid = String(restaurant._id);

    // Dữ liệu phụ để tạo đơn hợp lệ
    const table = await DB_Connection.Table.create({ restaurant: rid, tableNumber: '1', status: 'available' });
    const category = await DB_Connection.MenuCategory.create({ name: 'LC', restaurant: rid });
    const menuItem = await DB_Connection.MenuItem.create({
      category: category._id,
      restaurant: rid,
      name: 'Món Lifecycle',
      price: 50000,
      isAvailable: true,
    });
    const orderPayload = {
      restaurant: rid,
      table: String(table._id),
      orderType: 'dine-in',
      items: [{ menuItem: String(menuItem._id), quantity: 1 }],
    };

    // 2. Gói Miễn Phí đang hiệu lực → tạo đơn được
    const orderOk = await request.post('/api/orders').send(orderPayload);
    expect(orderOk.status).toBe(201);

    // 3. Nâng lên gói Basic (trả phí 1 tháng) → active + currentPlanKey basic + Transaction + audit
    const pay = await request
      .post('/api/subscriptions/pay')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ restaurantId: rid, cycleMonths: 1, planId: 'basic' });
    expect(pay.status).toBe(200);
    expect(pay.body.data.restaurant.subscription).toBe('active');
    expect(pay.body.data.restaurant.currentPlanKey).toBe('basic');
    expect(pay.body.data.transaction.amount).toBe(190000);
    expect(pay.body.data.paidUntil).toBeDefined();
    const txLog = await DB_Connection.AuditLog.exists({ action: 'transaction.create' });
    expect(txLog).toBeTruthy();

    // 4. (Mock) hết hạn: đẩy paidUntil về quá khứ → lần đọc sau tự HẠ về Miễn Phí (KHÔNG khoá)
    await DB_Connection.Restaurant.findByIdAndUpdate(rid, {
      paidUntil: new Date(Date.now() - day),
    });

    // Vẫn tạo đơn được (free không hết hạn)
    const orderAfterExpiry = await request.post('/api/orders').send(orderPayload);
    expect(orderAfterExpiry.status).toBe(201);

    // Nhà hàng đã tự hạ về Miễn Phí + audit subscription.downgrade
    const restAfter = (await DB_Connection.Restaurant.findById(rid).lean()) as any;
    expect(restAfter.subscription).toBe('active');
    expect(restAfter.currentPlanKey).toBe('free');
    expect(restAfter.paidUntil).toBeUndefined();
    const downgradeLog = await DB_Connection.AuditLog.exists({
      action: 'subscription.downgrade',
      'meta.reason': 'paid-expired',
    });
    expect(downgradeLog).toBeTruthy();

    // Chủ thấy nhà hàng của mình vẫn active + Miễn Phí
    const me = await request
      .get('/api/subscriptions/me')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(me.status).toBe(200);
    const mine = me.body.data.find((r: any) => String(r._id) === rid);
    expect(mine.subscription).toBe('active');
    expect(mine.currentPlanKey).toBe('free');

    // 5. Super-admin thấy KPI + giao dịch vừa tạo
    const saToken = signToken(SEED_IDS.superAdmin.toString(), 'super-admin');
    const dash = await request
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${saToken}`);
    expect(dash.status).toBe(200);
    expect(dash.body.data.kpis.activeRestaurants).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(dash.body.data.revenueByMonth)).toBe(true);

    const txs = await request
      .get('/api/admin/transactions')
      .set('Authorization', `Bearer ${saToken}`);
    expect(txs.status).toBe(200);
    const newTx = txs.body.data.find(
      (t: any) => String(t.restaurant?._id ?? t.restaurant) === rid,
    );
    expect(newTx).toBeTruthy();
    expect(newTx.amount).toBe(190000);
    expect(newTx.status).toBe('paid');
    expect(newTx.planKey).toBe('basic');

    // 6. Super-admin khoá chủ → toàn bộ user chủ không đăng nhập được → mở lại → đăng nhập OK
    await request
      .patch(`/api/admin/users/${ownerId}/block`)
      .set('Authorization', `Bearer ${saToken}`)
      .send({ blocked: true });
    const blockedLogin = await request.post('/api/auth/login').send({
      email: 'owner.lifecycle@nhamnhi.vn',
      password: 'Test@NhamNhi2026',
    });
    expect(blockedLogin.status).toBe(400);

    await request
      .patch(`/api/admin/users/${ownerId}/block`)
      .set('Authorization', `Bearer ${saToken}`)
      .send({ blocked: false });
    const unblockedLogin = await request.post('/api/auth/login').send({
      email: 'owner.lifecycle@nhamnhi.vn',
      password: 'Test@NhamNhi2026',
    });
    expect(unblockedLogin.status).toBe(200);
  });
});
