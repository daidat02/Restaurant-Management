import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request } from './utils.js';
import DB_Connection from '../models/DB_Connection.js';
import { sendEmailAsync } from '../services/email.service.js';
import { migrateEmailVerified } from '../scripts/migrate-email-verified.js';

/**
 * T08 — Xác thực email OTP khi đăng ký owner (auth-pages-otp).
 * sendEmailAsync bị mock toàn cục (setup.ts) — test assert payload thay vì gửi SMTP thật.
 */

const sendEmailMock = vi.mocked(sendEmailAsync);

/** Đăng ký chủ mới + trả {_id, email}. */
async function registerOwner(email: string): Promise<{ _id: string; email: string }> {
  const res = await request.post('/api/auth/register-owner').send({
    name: 'Chủ OTP',
    email,
    password: 'Test@NhamNhi2026',
    phone: '0912345678',
  });
  expect(res.status).toBe(201);
  return res.body.data as { _id: string; email: string };
}

async function otpOf(userId: string): Promise<string> {
  const user = await DB_Connection.User.findById(userId).lean();
  return (user as any).emailOtp as string;
}

describe('T08 — OTP email đăng ký owner', () => {
  beforeEach(() => {
    sendEmailMock.mockClear();
  });

  it('register-owner → user pending (emailVerified=false, OTP 6 số, hết hạn 10p) + gửi email, không auto-login', async () => {
    const { _id, email } = await registerOwner('otp.register@nhamnhi.vn');

    const user = await DB_Connection.User.findById(_id).lean() as any;
    expect(user.emailVerified).toBe(false);
    expect(user.emailOtp).toMatch(/^\d{6}$/);
    expect(user.emailOtpSentAt).toBeTruthy();
    // TTL 10 phút
    expect(user.emailOtpExpires.getTime() - Date.now()).toBeGreaterThan(9 * 60 * 1000);

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        template: 'otp-verification',
        to: email,
      }),
    );
    const payload = sendEmailMock.mock.calls[0]![0];
    expect(payload.data.otp).toBe(user.emailOtp);
  });

  it('login trước khi verify → 403 EMAIL_NOT_VERIFIED, không trả token', async () => {
    await registerOwner('otp.blocked@nhamnhi.vn');
    const res = await request.post('/api/auth/login').send({
      email: 'otp.blocked@nhamnhi.vn',
      password: 'Test@NhamNhi2026',
    });
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('EMAIL_NOT_VERIFIED');
    expect(res.body.data).toBeUndefined();
  });

  it('verify-otp sai mã → 400 + tăng emailOtpAttempts; sai đủ 5 lần → OTP bị vô hiệu', async () => {
    const { _id } = await registerOwner('otp.wrong@nhamnhi.vn');
    const correct = await otpOf(_id);
    const wrong = correct === '000000' ? '111111' : '000000';

    for (let i = 1; i <= 4; i++) {
      const res = await request.post('/api/auth/verify-otp').send({
        email: 'otp.wrong@nhamnhi.vn',
        otp: wrong,
      });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Còn');
    }

    // Lần thứ 5 → OTP vô hiệu, phải gửi lại mã.
    const last = await request.post('/api/auth/verify-otp').send({
      email: 'otp.wrong@nhamnhi.vn',
      otp: wrong,
    });
    expect(last.status).toBe(400);
    expect(last.body.message).toContain('gửi lại mã');

    const user = await DB_Connection.User.findById(_id).lean() as any;
    expect(user.emailOtp).toBeUndefined();
    expect(user.emailOtpExpires).toBeUndefined();
    expect(user.emailVerified).toBe(false);
  });

  it('verify-otp đúng → 200 + tokens (auto-login) + cookie refreshToken + emailVerified=true', async () => {
    const { _id } = await registerOwner('otp.correct@nhamnhi.vn');
    const otp = await otpOf(_id);

    const res = await request.post('/api/auth/verify-otp').send({
      email: 'otp.correct@nhamnhi.vn',
      otp,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.email).toBe('otp.correct@nhamnhi.vn');
    const cookieHeader = (res.headers['set-cookie'] as unknown as string[]) ?? [];
    expect(cookieHeader.some((c) => c.startsWith('refreshToken='))).toBe(true);

    const user = await DB_Connection.User.findById(_id).lean() as any;
    expect(user.emailVerified).toBe(true);
    expect(user.emailVerifiedAt).toBeTruthy();
    expect(user.emailOtp).toBeUndefined();
    expect(user.emailOtpSentAt).toBeUndefined();
  });

  it('login sau khi verify → 200', async () => {
    const { _id } = await registerOwner('otp.afterverify@nhamnhi.vn');
    const otp = await otpOf(_id);
    await request.post('/api/auth/verify-otp').send({
      email: 'otp.afterverify@nhamnhi.vn',
      otp,
    });

    const res = await request.post('/api/auth/login').send({
      email: 'otp.afterverify@nhamnhi.vn',
      password: 'Test@NhamNhi2026',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
  });

  it('resend-otp: bị chặn trong cooldown 60s (429 OTP_COOLDOWN); qua cooldown → OTP mới + gửi lại email', async () => {
    const { _id } = await registerOwner('otp.resend@nhamnhi.vn');
    const firstOtp = await otpOf(_id);
    sendEmailMock.mockClear();

    // Gửi lại ngay → cooldown.
    const blocked = await request.post('/api/auth/resend-otp').send({ email: 'otp.resend@nhamnhi.vn' });
    expect(blocked.status).toBe(429);
    expect(blocked.body.errorCode).toBe('OTP_COOLDOWN');
    expect(sendEmailMock).not.toHaveBeenCalled();

    // Bỏ qua cooldown (backdate emailOtpSentAt) → gửi lại thành công.
    await DB_Connection.User.findByIdAndUpdate(_id, {
      $set: { emailOtpSentAt: new Date(Date.now() - 120 * 1000) },
    });
    const res = await request.post('/api/auth/resend-otp').send({ email: 'otp.resend@nhamnhi.vn' });
    expect(res.status).toBe(200);

    const user = await DB_Connection.User.findById(_id).lean() as any;
    expect(user.emailOtp).toMatch(/^\d{6}$/);
    expect(user.emailOtp).not.toBe(firstOtp);
    expect(user.emailOtpAttempts).toBe(0);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        template: 'otp-verification',
        to: 'otp.resend@nhamnhi.vn',
      }),
    );
  });

  it('resend-otp không tồn tại email → 400; email đã verify → 400', async () => {
    const missing = await request.post('/api/auth/resend-otp').send({ email: 'otp.ghost@nhamnhi.vn' });
    expect(missing.status).toBe(400);

    const { _id } = await registerOwner('otp.already@nhamnhi.vn');
    const otp = await otpOf(_id);
    await request.post('/api/auth/verify-otp').send({ email: 'otp.already@nhamnhi.vn', otp });
    const res = await request.post('/api/auth/resend-otp').send({ email: 'otp.already@nhamnhi.vn' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('đã được xác thực');
  });

  it('migration backfill emailVerified=true — idempotent', async () => {
    const { _id } = await registerOwner('otp.migrate@nhamnhi.vn');
    const before = await DB_Connection.User.findById(_id).lean() as any;
    expect(before.emailVerified).toBe(false);

    const first = await migrateEmailVerified();
    expect(first.updated).toBeGreaterThanOrEqual(1);

    const after = await DB_Connection.User.findById(_id).lean() as any;
    expect(after.emailVerified).toBe(true);
    expect(after.emailVerifiedAt).toBeTruthy();

    // Chạy lại → không đổi gì thêm.
    const second = await migrateEmailVerified();
    expect(second.updated).toBe(0);
  });
});