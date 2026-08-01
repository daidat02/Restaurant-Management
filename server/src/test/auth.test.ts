import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { request, loginAs } from './utils.js';
import { SEED_IDS, TEST_PASSWORD } from './seed.js';

const X = SEED_IDS.tenantX.toString();
const Y = SEED_IDS.tenantY.toString();

describe('T1 — Auth & token', () => {
  it('register customer thành công → 201 role customer', async () => {
    const res = await request.post('/api/auth/register').send({
      name: 'Khách Mới',
      email: 'new.customer@nhamnhi.vn',
      phone: '0900000999',
      password: 'Abc12345',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('customer');
    expect(res.body.data.restaurantIds).toEqual([]);
  });

  it('register trùng email → 400', async () => {
    const res = await request.post('/api/auth/register').send({
      name: 'Trùng Email',
      email: 'admin.test@nhamnhi.vn',
      phone: '0900000998',
      password: 'Abc12345',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Email đã tồn tại!');
  });

  it('login sai mật khẩu → 400', async () => {
    const res = await request.post('/api/auth/login').send({
      email: 'admin.test@nhamnhi.vn',
      password: 'SaiMatKhau123',
    });
    expect(res.status).toBe(400);
  });

  it('login email không tồn tại → 400', async () => {
    const res = await request.post('/api/auth/login').send({
      email: 'khong-ton-tai@nhamnhi.vn',
      password: TEST_PASSWORD,
    });
    expect(res.status).toBe(400);
  });

  it('refresh trả accessToken mới giữ restaurantId', async () => {
    const login = await request.post('/api/auth/login').send({
      email: 'admin.test@nhamnhi.vn',
      password: TEST_PASSWORD,
    });
    const setCookie = login.headers['set-cookie'];
    const cookie = (setCookie?.[0] ?? '').split(';')[0];
    const res = await request.post('/api/auth/refresh').set('Cookie', cookie || '').send({});
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    const decoded = jwt.decode(res.body.data.accessToken) as any;
    expect(decoded.restaurantId).toBe(X);
  });

  it('refresh thiếu refresh token cookie → 401', async () => {
    const res = await request.post('/api/auth/refresh').send({});
    expect(res.status).toBe(401);
  });

  it('access token hết hạn → bị từ chối', async () => {
    const expired = jwt.sign(
      { _id: SEED_IDS.adminX.toString(), role: 'admin', restaurantId: X },
      process.env.JWT_ACCESS_SECRET || 'test-access-secret',
      { expiresIn: -10 },
    );
    const res = await request
      .get('/api/auth/profile/me')
      .set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(403);
  });

  it('switch-tenant hợp lệ (admin X → Y) → 200 + token mới gắn Y', async () => {
    const token = await loginAs('admin.test@nhamnhi.vn');
    const res = await request
      .post('/api/auth/switch-tenant')
      .set('Authorization', `Bearer ${token}`)
      .send({ restaurantId: Y });
    expect(res.status).toBe(200);
    const decoded = jwt.decode(res.body.data.accessToken) as any;
    expect(decoded.restaurantId).toBe(Y);
  });

  it('switch-tenant không thuộc (manager X → Y) → 403', async () => {
    const token = await loginAs('manager.test@nhamnhi.vn');
    const res = await request
      .post('/api/auth/switch-tenant')
      .set('Authorization', `Bearer ${token}`)
      .send({ restaurantId: Y });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Bạn không thuộc nhà hàng này!');
  });

  it('switch-tenant thiếu restaurantId → 400', async () => {
    const token = await loginAs('admin.test@nhamnhi.vn');
    const res = await request
      .post('/api/auth/switch-tenant')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('change-password đúng mật khẩu hiện tại → 200 + login được với mật khẩu mới', async () => {
    const register = await request.post('/api/auth/register').send({
      name: 'Đổi MK',
      email: 'doimatkhau@nhamnhi.vn',
      phone: '0900000888',
      password: 'OldPass123',
    });
    expect(register.status).toBe(201);

    const login = await request
      .post('/api/auth/login')
      .send({ email: 'doimatkhau@nhamnhi.vn', password: 'OldPass123' });
    const token = login.body.data.accessToken;

    const res = await request
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'OldPass123', newPassword: 'NewPass123' });
    expect(res.status).toBe(200);

    const relogin = await request
      .post('/api/auth/login')
      .send({ email: 'doimatkhau@nhamnhi.vn', password: 'NewPass123' });
    expect(relogin.status).toBe(200);
  });

  it('change-password sai mật khẩu hiện tại → 400', async () => {
    const token = await loginAs('customer.test@nhamnhi.vn');
    const res = await request
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'SaiCurrent', newPassword: 'NewPass123' });
    expect(res.status).toBe(400);
  });

  it('reset-password (không xác thực mật khẩu hiện tại) → 200', async () => {
    const token = await loginAs('manager.test@nhamnhi.vn');
    const res = await request
      .post('/api/auth/reset-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ newPassword: 'ResetPass123', isvalidPassword: 'ResetPass123' });
    expect(res.status).toBe(200);
  });
});
