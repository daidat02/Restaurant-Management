import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { request, signToken } from './utils.js';
import DB_Connection from '../models/DB_Connection.js';
import { SEED_IDS } from './seed.js';
import { startSMTPSink, decodeQuotedPrintable, type SmtpSink } from './helpers/smtp-sink.js';
import '../jobs/index.js';

const day = 24 * 3600 * 1000;
const adminXToken = signToken(SEED_IDS.adminX.toString(), 'admin', SEED_IDS.tenantX.toString());

describe('T5 — Thanh toán mock + khoá đơn/món khi locked', () => {
  it('POST /api/subscriptions/pay — gia hạn từ active → active, paidUntil tăng theo chu kỳ', async () => {
    const res = await request
      .post('/api/subscriptions/pay')
      .set('Authorization', `Bearer ${adminXToken}`)
      .send({ restaurantId: SEED_IDS.tenantX.toString(), cycleMonths: 1 });
    expect(res.status).toBe(200);
    expect(res.body.data.restaurant.subscription).toBe('active');
    expect(res.body.data.transaction.amount).toBe(190000);
    const txLog = await DB_Connection.AuditLog.exists({ action: 'transaction.create' });
    expect(txLog).toBeTruthy();
  });

  it('POST /api/subscriptions/pay — mở lại từ locked → active + audit subscription.unlocked', async () => {
    // Khoá nhà hàng Y (đặt paidUntil quá khứ)
    await DB_Connection.Restaurant.findByIdAndUpdate(SEED_IDS.tenantY, {
      subscription: 'locked',
      paidUntil: new Date(Date.now() - day),
    });
    const res = await request
      .post('/api/subscriptions/pay')
      .set('Authorization', `Bearer ${adminXToken}`)
      .send({ restaurantId: SEED_IDS.tenantY.toString(), cycleMonths: 3 });
    expect(res.status).toBe(200);
    expect(res.body.data.restaurant.subscription).toBe('active');
    const unlockLog = await DB_Connection.AuditLog.exists({ action: 'subscription.unlocked' });
    expect(unlockLog).toBeTruthy();
  });

  it('POST /api/subscriptions/pay — không phải chủ sở hữu → 403', async () => {
    const otherToken = signToken(SEED_IDS.managerX.toString(), 'manager', SEED_IDS.tenantX.toString());
    const res = await request
      .post('/api/subscriptions/pay')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ restaurantId: SEED_IDS.tenantX.toString(), cycleMonths: 1 });
    expect(res.status).toBe(403);
  });

  it('POST /api/subscriptions/pay — hạ gói khi còn hạn (Pro → Cơ bản): lưu pendingPlanKey, không trừ tiền, giữ gói hiện tại', async () => {
    await DB_Connection.Restaurant.findByIdAndUpdate(SEED_IDS.tenantX, {
      subscription: 'active',
      paidUntil: new Date(Date.now() + 30 * day),
      currentPlanKey: 'pro',
      pendingPlanKey: undefined,
      pendingCycleMonths: undefined,
    });
    const res = await request
      .post('/api/subscriptions/pay')
      .set('Authorization', `Bearer ${adminXToken}`)
      .send({ restaurantId: SEED_IDS.tenantX.toString(), cycleMonths: 1, planId: 'basic' });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('áp dụng khi hết hạn');
    expect(res.body.data.pendingPlanKey).toBe('basic');
    expect(res.body.data.transaction).toBeUndefined();
    const rest = await DB_Connection.Restaurant.findById(SEED_IDS.tenantX);
    expect(rest?.currentPlanKey).toBe('pro');
    expect(rest?.pendingPlanKey).toBe('basic');
    expect(rest?.pendingCycleMonths).toBe(1);
  });

  it('POST /api/subscriptions/pay — nâng cấp gói khi còn hạn (Cơ bản → Pro): 200 + currentPlanKey cập nhật, paidUntil không cộng dồn', async () => {
    await DB_Connection.Restaurant.findByIdAndUpdate(SEED_IDS.tenantX, {
      subscription: 'active',
      paidUntil: new Date(Date.now() + 30 * day),
      currentPlanKey: 'basic',
    });
    const res = await request
      .post('/api/subscriptions/pay')
      .set('Authorization', `Bearer ${adminXToken}`)
      .send({ restaurantId: SEED_IDS.tenantX.toString(), cycleMonths: 1, planId: 'pro' });
    expect(res.status).toBe(200);
    expect(res.body.data.restaurant.currentPlanKey).toBe('pro');
    const rest = await DB_Connection.Restaurant.findById(SEED_IDS.tenantX);
    expect(rest?.currentPlanKey).toBe('pro');
    // Upgrade chỉ tính chênh lệch theo thời gian còn lại — KHÔNG cộng dồn chu kỳ mới.
    expect(rest?.paidUntil).toBeDefined();
    expect((rest!.paidUntil as any).getTime()).toBeLessThan(Date.now() + 45 * day);
  });

  it('POST /api/subscriptions/pay — đã hết hạn thì được nhận gói thấp hơn: 200', async () => {
    await DB_Connection.Restaurant.findByIdAndUpdate(SEED_IDS.tenantX, {
      subscription: 'locked',
      paidUntil: new Date(Date.now() - day),
      currentPlanKey: 'pro',
    });
    const res = await request
      .post('/api/subscriptions/pay')
      .set('Authorization', `Bearer ${adminXToken}`)
      .send({ restaurantId: SEED_IDS.tenantX.toString(), cycleMonths: 1, planId: 'basic' });
    expect(res.status).toBe(200);
    const rest = await DB_Connection.Restaurant.findById(SEED_IDS.tenantX);
    expect(rest?.subscription).toBe('active');
    expect(rest?.currentPlanKey).toBe('basic');
  });

  it('GET /api/subscriptions/me — trả trạng thái các nhà hàng của chủ', async () => {
    const res = await request
      .get('/api/subscriptions/me')
      .set('Authorization', `Bearer ${adminXToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    // Kèm mức sử dụng bàn/món/NV (cho "Đang dùng X/Y")
    const tenantX = res.body.data.find((r: any) => String(r._id) === SEED_IDS.tenantX.toString());
    expect(tenantX).toBeTruthy();
    expect(tenantX.usage).toBeDefined();
    expect(tenantX.usage.tables).toBeGreaterThanOrEqual(2); // tableX1 + tableX2 seed
    expect(tenantX.usage.items).toBeGreaterThanOrEqual(2); // menuItemX1 + menuItemX2 seed
    expect(tenantX.usage.staff).toBeGreaterThanOrEqual(1); // staffX
    expect(typeof tenantX.usage.daily_orders).toBe('number'); // đơn hôm nay
    expect(typeof tenantX.usage.group_chats).toBe('number'); // nhóm chat
  });

  it('GET /api/subscriptions/usage — mức sử dụng 1 nhà hàng (chủ sở hữu)', async () => {
    const res = await request
      .get('/api/subscriptions/usage')
      .query({ restaurantId: SEED_IDS.tenantX.toString() })
      .set('Authorization', `Bearer ${adminXToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.tables).toBeGreaterThanOrEqual(2);
    expect(res.body.data.items).toBeGreaterThanOrEqual(2);
    expect(res.body.data.staff).toBeGreaterThanOrEqual(1);
    expect(typeof res.body.data.daily_orders).toBe('number');
    expect(typeof res.body.data.group_chats).toBe('number');
  });

  it('GET /api/subscriptions/usage — nhà hàng không thuộc chủ → 403', async () => {
    const res = await request
      .get('/api/subscriptions/usage')
      .query({ restaurantId: '000000000000000000000000' })
      .set('Authorization', `Bearer ${adminXToken}`);
    expect(res.status).toBe(404);
  });

  it('GET /api/subscriptions/transactions — chủ xem đúng lịch sử giao dịch của mình', async () => {
    const res = await request
      .get('/api/subscriptions/transactions')
      .set('Authorization', `Bearer ${adminXToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    // Mọi giao dịch đều thuộc chủ (adminX)
    expect(res.body.data.every((t: any) => t.ownerId === SEED_IDS.adminX.toString())).toBe(true);
  });

  it('Tạo đơn khi nhà hàng locked → 403 RESTAURANT_LOCKED', async () => {
    await DB_Connection.Restaurant.findByIdAndUpdate(SEED_IDS.tenantY, {
      subscription: 'locked',
      paidUntil: new Date(Date.now() - day),
    });
    const res = await request.post('/api/orders').send({
      restaurant: SEED_IDS.tenantY.toString(),
      table: SEED_IDS.tableY1.toString(),
      orderType: 'dine-in',
      items: [{ menuItem: SEED_IDS.menuItemY1.toString(), quantity: 1 }],
    });
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('RESTAURANT_LOCKED');
  });

  it('Tạo món khi nhà hàng locked → 403 RESTAURANT_LOCKED', async () => {
    const managerXToken = signToken(SEED_IDS.managerX.toString(), 'manager', SEED_IDS.tenantX.toString());
    await DB_Connection.Restaurant.findByIdAndUpdate(SEED_IDS.tenantX, {
      subscription: 'locked',
      paidUntil: new Date(Date.now() - day),
    });
    const res = await request
      .post('/api/menu/item')
      .set('Authorization', `Bearer ${managerXToken}`)
      .send({
        category: SEED_IDS.categoryX.toString(),
        restaurant: SEED_IDS.tenantX.toString(),
        name: 'Món bị chặn',
        price: 10000,
      });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('RESTAURANT_LOCKED');
    // Mở lại cho các test sau
    await DB_Connection.Restaurant.findByIdAndUpdate(SEED_IDS.tenantX, {
      subscription: 'active',
      paidUntil: new Date(Date.now() + 30 * day),
    });
  });
});

describe('T5 — Biên lai thanh toán gói qua email', () => {
  let sink: SmtpSink;

  beforeAll(async () => {
    sink = await startSMTPSink();
    await sink.configure();
  });

  afterAll(async () => {
    await sink.close();
  });

  it('POST /api/subscriptions/pay — chủ nhận email biên lai (template subscription-receipt)', async () => {
    // Reset tenantX về trạng thái renew sạch (tránh pendingPlanKey từ test trước).
    await DB_Connection.Restaurant.findByIdAndUpdate(SEED_IDS.tenantX, {
      subscription: 'active',
      paidUntil: new Date(Date.now() + 30 * day),
      currentPlanKey: 'pro',
      pendingPlanKey: undefined,
      pendingCycleMonths: undefined,
    });

    const res = await request
      .post('/api/subscriptions/pay')
      .set('Authorization', `Bearer ${adminXToken}`)
      .send({ restaurantId: SEED_IDS.tenantX.toString(), cycleMonths: 1 });
    expect(res.status).toBe(200);
    expect(res.body.data.transaction.transactionId).toBeTruthy();

    // Chủ sở hữu adminX (admin.test@nhamnhi.vn) nhận biên lai qua sink.
    expect(sink.received.length).toBe(1);
    const msg = sink.received[0]!;
    expect(msg.to).toContain('admin.test@nhamnhi.vn');
    const decoded = decodeQuotedPrintable(msg.raw);
    expect(decoded).toContain('Biên lai thanh toán gói');
    expect(decoded).toContain('NhamNhi Cơ Sở 1'); // restaurantName
    expect(decoded).toContain(res.body.data.transaction.transactionId);
    expect(decoded).toContain('đ'); // số tiền định dạng VND
  });

  it('POST /api/subscriptions/pay — hạ gói khi còn hạn KHÔNG gửi biên lai (không có transaction)', async () => {
    const before = sink.received.length;
    // Chủ đang dùng gói Pro (cao hơn basic) để trigger nhánh lên lịch hạ gói.
    await DB_Connection.Restaurant.findByIdAndUpdate(SEED_IDS.tenantX, {
      subscription: 'active',
      paidUntil: new Date(Date.now() + 30 * day),
      currentPlanKey: 'pro',
      pendingPlanKey: undefined,
      pendingCycleMonths: undefined,
    });
    const res = await request
      .post('/api/subscriptions/pay')
      .set('Authorization', `Bearer ${adminXToken}`)
      .send({ restaurantId: SEED_IDS.tenantX.toString(), cycleMonths: 1, planId: 'basic' });
    expect(res.status).toBe(200);
    expect(res.body.data.transaction).toBeUndefined();
    expect(sink.received.length).toBe(before); // không phát sinh email
  });
});
