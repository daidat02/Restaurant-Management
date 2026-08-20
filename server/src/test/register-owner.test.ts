import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request, signToken } from './utils.js';
import DB_Connection from '../models/DB_Connection.js';
import { sendEmailAsync } from '../services/email.service.js';
import { SEED_IDS } from './seed.js';

const day = 24 * 3600 * 1000;

const sendEmailMock = vi.mocked(sendEmailAsync);

describe('T4 — Đăng ký chủ + tạo nhà hàng', () => {
  beforeEach(() => {
    sendEmailMock.mockClear();
  });

  it('POST /api/auth/register-owner — tạo chủ role admin, emailVerified=false, gửi email OTP (không auto-login)', async () => {
    const res = await request.post('/api/auth/register-owner').send({
      name: 'Chủ Mới',
      email: 'owner.new@nhamnhi.vn',
      password: 'Test@NhamNhi2026',
      phone: '0912345678',
    });
    expect(res.status).toBe(201);
    // Không còn auto-login → response chỉ có _id + email.
    expect(res.body.data.email).toBe('owner.new@nhamnhi.vn');
    expect(res.body.data._id).toBeTruthy();
    expect(res.body.data.accessToken).toBeUndefined();
    expect(res.body.data.role).toBeUndefined();

    const user = await DB_Connection.User.findById(res.body.data._id).lean();
    expect((user as any).role).toBe('admin');
    expect((user as any).restaurantIds).toEqual([]);
    expect((user as any).emailVerified).toBe(false);
    expect((user as any).emailOtp).toMatch(/^\d{6}$/);
    expect((user as any).emailOtpExpires).toBeTruthy();

    // Đã gửi email OTP (sendEmailAsync mock — không đụng SMTP thật).
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        template: 'otp-verification',
        to: 'owner.new@nhamnhi.vn',
      }),
    );

    const log = await DB_Connection.AuditLog.exists({ action: 'user.register' });
    expect(log).toBeTruthy();
  });

  it('POST /api/auth/register-owner — email trùng → 400', async () => {
    const res = await request.post('/api/auth/register-owner').send({
      name: 'Trùng',
      email: 'admin.test@nhamnhi.vn',
      password: 'Test@NhamNhi2026',
    });
    expect(res.status).toBe(400);
  });

  it('Tạo nhà hàng đầu tiên → active + gói Miễn Phí + gắn owner + audit free.assigned', async () => {
    const reg = await request.post('/api/auth/register-owner').send({
      name: 'Chủ Mới Free',
      email: 'owner.free@nhamnhi.vn',
      password: 'Test@NhamNhi2026',
    });
    const ownerId = reg.body.data._id;
    const token = signToken(ownerId, 'admin');

    const res = await request
      .post('/api/restaurants')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Nhà hàng đầu tiên', email: 'first@nhamnhi.vn', operatingHours: '8-22' });
    expect(res.status).toBe(201);
    const r = res.body.result.data;
    expect(r.subscription).toBe('active');
    expect(r.ownerId?.toString()).toBe(ownerId);
    expect(r.trialEndsAt).toBeUndefined();
    expect(r.paidUntil).toBeUndefined();
    expect(r.currentPlanKey).toBe('free');

    const freeLog = await DB_Connection.AuditLog.exists({ action: 'subscription.free.assigned' });
    expect(freeLog).toBeTruthy();

    // user được gắn restaurantIds
    const owner = await DB_Connection.User.findById(ownerId).lean();
    expect((owner as any).restaurantIds.length).toBe(1);
  });

  it('Tạo nhà hàng thứ 2 → trả phí (transaction) + active', async () => {
    // adminX đã có 2 nhà hàng trong seed → mở thêm phải trả phí
    const res = await request
      .post('/api/restaurants')
      .set('Authorization', `Bearer ${tokenForAdmin()}`)
      .send({
        name: 'Nhà hàng trả phí',
        email: 'paid@nhamnhi.vn',
        operatingHours: '8-22',
        cycleMonths: 3,
      });
    expect(res.status).toBe(201);
    const r = res.body.result.data;
    expect(r.subscription).toBe('active');
    expect(r.paidUntil).toBeTruthy();
    expect(res.body.result.transaction).toBeTruthy();

    const tx = await DB_Connection.Transaction.findOne({ restaurant: r._id }).lean();
    expect((tx as any)?.amount).toBe(570000);
    expect((tx as any)?.cycleMonths).toBe(3);

    const txLog = await DB_Connection.AuditLog.exists({ action: 'transaction.create' });
    expect(txLog).toBeTruthy();
  });

  it('Tạo nhà hàng thứ 2 với chu kỳ không hợp lệ → 400', async () => {
    const res = await request
      .post('/api/restaurants')
      .set('Authorization', `Bearer ${tokenForAdmin()}`)
      .send({ name: 'Sai chu kỳ', email: 'bad@nhamnhi.vn', cycleMonths: 2 });
    expect(res.status).toBe(400);
  });

  it('Tạo nhà hàng khi tài khoản chủ bị khoá → 403', async () => {
    const reg = await request.post('/api/auth/register-owner').send({
      name: 'Chủ Bị Khoá',
      email: 'owner.blocked@nhamnhi.vn',
      password: 'Test@NhamNhi2026',
    });
    const ownerId = reg.body.data._id;
    await DB_Connection.User.findByIdAndUpdate(ownerId, { isActive: false });
    const token = signToken(ownerId, 'admin');

    const res = await request
      .post('/api/restaurants')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Không được tạo', email: 'x@nhamnhi.vn' });
    expect(res.status).toBe(403);
  });
});

function tokenForAdmin() {
  return signToken(SEED_IDS.adminX.toString(), 'admin', SEED_IDS.tenantX.toString());
}
