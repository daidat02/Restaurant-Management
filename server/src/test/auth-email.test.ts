import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { request, signToken } from './utils.js';
import { SEED_IDS } from './seed.js';
import { startSMTPSink, decodeQuotedPrintable, type SmtpSink } from './helpers/smtp-sink.js';
import '../jobs/index.js';

const adminXToken = signToken(SEED_IDS.adminX.toString(), 'admin', SEED_IDS.tenantX.toString());
const PASSWORD_REGEX = /reset-password\/([0-9a-f]{32})/;

describe('Email — quên mật khẩu & tài khoản nhân sự', () => {
  let sink: SmtpSink;

  beforeAll(async () => {
    sink = await startSMTPSink();
    await sink.configure();
  });

  afterAll(async () => {
    await sink.close();
  });

  it('forgot-password → sink nhận email có link → reset → đăng nhập mật khẩu mới OK', async () => {
    const res = await request
      .post('/api/auth/forgot-password')
      .send({ email: 'admin.test@nhamnhi.vn' });
    expect(res.status).toBe(200);

    expect(sink.received.length).toBe(1);
    const msg = sink.received[0]!;
    expect(msg.to).toContain('admin.test@nhamnhi.vn');
    const decoded = decodeQuotedPrintable(msg.raw);
    expect(decoded).toContain('Đặt lại mật khẩu');
    const match = decoded.match(PASSWORD_REGEX);
    expect(match).toBeTruthy();
    const token = match![1]!;

    // Reset bằng token
    const resetRes = await request
      .post('/api/auth/forgot-password/reset')
      .send({ token, newPassword: 'NewPass123' });
    expect(resetRes.status).toBe(200);

    // Đăng nhập bằng mật khẩu mới
    const loginRes = await request
      .post('/api/auth/login')
      .send({ email: 'admin.test@nhamnhi.vn', password: 'NewPass123' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.accessToken).toBeTruthy();
  });

  it('token đã dùng → reset lại bị từ chối (400)', async () => {
    const match = sink.received[sink.received.length - 1]!.raw.match(PASSWORD_REGEX);
    const usedToken = match?.[1];
    const res = await request
      .post('/api/auth/forgot-password/reset')
      .send({ token: usedToken, newPassword: 'Another123' });
    expect(res.status).toBe(400);
  });

  it('email không tồn tại → vẫn 200 nhưng sink không nhận email (chống leak)', async () => {
    const before = sink.received.length;
    const res = await request
      .post('/api/auth/forgot-password')
      .send({ email: 'khong-ton-tai@example.com' });
    expect(res.status).toBe(200);
    expect(sink.received.length).toBe(before);
  });

  it('tạo nhân sự → sink nhận email account-created kèm link đặt mật khẩu', async () => {
    const before = sink.received.length;
    const res = await request
      .post('/api/auth/admin/create')
      .set('Authorization', `Bearer ${adminXToken}`)
      .send({
        name: 'Nhân viên Mới',
        email: 'nhanvien.moi@example.com',
        role: 'staff',
        password: 'Temp1234',
        restaurantIds: [SEED_IDS.tenantX.toString()],
      });
    expect(res.status).toBe(201);

    expect(sink.received.length).toBe(before + 1);
    const msg = sink.received[sink.received.length - 1]!;
    expect(msg.to).toContain('nhanvien.moi@example.com');
    const decoded = decodeQuotedPrintable(msg.raw);
    expect(decoded).toContain('Tài khoản của bạn đã được tạo');
    expect(decoded).toContain('Nhân viên Mới');
    expect(decoded).toContain('nhanvien.moi@example.com');
    expect(decoded).toContain('reset-password/');
  });
});