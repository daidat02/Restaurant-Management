import { describe, it, expect } from 'vitest';
import { request, signToken } from './utils.js';
import DB_Connection from '../models/DB_Connection.js';
import { SEED_IDS } from './seed.js';

const day = 24 * 3600 * 1000;

/**
 * T11 — Verify toàn diện chuỗi "chống production":
 * đăng ký chủ mới → nhà hàng đầu (trial) → phục vụ OK → (mock) hết hạn → locked + khoá đơn
 * → thanh toán → active + phục vụ lại → super-admin thấy KPI/giao dịch → block/unblock chủ.
 */
describe('T11 — Verify lifecycle subscription (trial → locked → pay → active)', () => {
  it('toàn bộ vòng đời thuê bao + super-admin giám sát', async () => {
    // 0. Đăng ký chủ mới (role admin, chưa có nhà hàng)
    const reg = await request.post('/api/auth/register-owner').send({
      name: 'Chủ Lifecycle',
      email: 'owner.lifecycle@nhamnhi.vn',
      password: 'Test@NhamNhi2026',
      phone: '0912345678',
    });
    expect(reg.status).toBe(201);
    expect(reg.body.data.role).toBe('admin');
    const ownerId = reg.body.data._id as string;
    const ownerToken = signToken(ownerId, 'admin');

    // 1. Nhà hàng đầu tiên → trial 30 ngày (không tính phí)
    const createRes = await request
      .post('/api/restaurants')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Nhà hàng lifecycle', email: 'lc@nhamnhi.vn', operatingHours: '8-22' });
    expect(createRes.status).toBe(201);
    const restaurant = createRes.body.result.data;
    expect(restaurant.subscription).toBe('trial');
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

    // 2. Trial đang hiệu lực → tạo đơn được
    const orderOk = await request.post('/api/orders').send(orderPayload);
    expect(orderOk.status).toBe(201);

    // 3. (Mock) hết hạn: đẩy trialEndsAt về quá khứ → lần đọc sau tự chuyển locked
    await DB_Connection.Restaurant.findByIdAndUpdate(rid, {
      trialEndsAt: new Date(Date.now() - day),
    });

    // Tạo đơn bị chặn RESTAURANT_LOCKED + trạng thái tự chuyển sang locked
    const orderBlocked = await request.post('/api/orders').send(orderPayload);
    expect(orderBlocked.status).toBe(403);
    expect(orderBlocked.body.errorCode).toBe('RESTAURANT_LOCKED');

    // Chủ thấy nhà hàng của mình đã bị locked
    const me = await request
      .get('/api/subscriptions/me')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(me.status).toBe(200);
    const mine = me.body.data.find((r: any) => String(r._id) === rid);
    expect(mine.subscription).toBe('locked');

    // 4. Thanh toán chu kỳ 1 tháng → active + Transaction + audit unlock
    const pay = await request
      .post('/api/subscriptions/pay')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ restaurantId: rid, cycleMonths: 1 });
    expect(pay.status).toBe(200);
    expect(pay.body.data.restaurant.subscription).toBe('active');
    expect(pay.body.data.transaction.amount).toBe(299000);
    const unlockLog = await DB_Connection.AuditLog.exists({ action: 'subscription.unlocked' });
    expect(unlockLog).toBeTruthy();

    // 5. Mở lại → tạo đơn được trở lại
    const orderAfterPay = await request.post('/api/orders').send(orderPayload);
    expect(orderAfterPay.status).toBe(201);

    // 6. Super-admin thấy KPI + giao dịch vừa tạo
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
    expect(newTx.amount).toBe(299000);
    expect(newTx.status).toBe('paid');

    // 7. Super-admin khoá chủ → toàn bộ user chủ không đăng nhập được → mở lại → đăng nhập OK
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
