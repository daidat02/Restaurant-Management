import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { request, tokenFor } from './utils.js';
import DB_Connection from '../models/DB_Connection.js';
import { SEED_IDS } from './seed.js';

const X = SEED_IDS.tenantX.toString();
const Y = SEED_IDS.tenantY.toString();
const idOf = (oid: unknown) => String(oid);

const adminX = () => tokenFor('admin', X);
const superAdmin = () => tokenFor('super-admin');

describe('T05 — Rate limit + Audit log', () => {
  describe('Audit log — ghi khi hành động admin xảy ra', () => {
    it('register tạo user → có audit log user.register', async () => {
      await request.post('/api/auth/register').send({
        name: 'Khách Audit',
        email: 'audit-customer@nhamnhi.vn',
        password: 'Test@NhamNhi2026',
        role: 'customer',
      });
      const log = await DB_Connection.AuditLog.findOne({ action: 'user.register' })
        .sort({ createdAt: -1 })
        .lean();
      expect(log).toBeTruthy();
      expect(log?.targetType).toBe('user');
      expect(log?.summary).toContain('Đăng ký');
    });

    it('switch-tenant → có audit log user.switch-tenant đúng restaurant + actor', async () => {
      const token = await request.post('/api/auth/login').send({
        email: 'admin.test@nhamnhi.vn',
        password: 'Test@NhamNhi2026',
      });
      const accessToken = token.body?.data?.accessToken as string;
      await request
        .post('/api/auth/switch-tenant')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ restaurantId: Y });

      const log = await DB_Connection.AuditLog.findOne({ action: 'user.switch-tenant' })
        .sort({ createdAt: -1 })
        .lean();
      expect(log).toBeTruthy();
      expect(idOf(log?.restaurant)).toBe(Y);
      expect(idOf(log?.actor)).toBe(idOf(SEED_IDS.adminX));
    });

    it('khoá nhà hàng (super-admin) → có audit log restaurant.lock', async () => {
      await request
        .patch(`/api/restaurants/status/${Y}`)
        .set('Authorization', `Bearer ${superAdmin()}`)
        .send({ status: 'inactive' });

      const log = await DB_Connection.AuditLog.findOne({ action: 'restaurant.lock' })
        .sort({ createdAt: -1 })
        .lean();
      expect(log).toBeTruthy();
      expect(idOf(log?.restaurant)).toBe(Y);
    });

    it('generate kitchen code → có audit log setting.kds-code.generate', async () => {
      await request
        .post(`/api/settings/${idOf(SEED_IDS.settingX)}/kds-code`)
        .set('Authorization', `Bearer ${adminX()}`);

      const log = await DB_Connection.AuditLog.findOne({
        action: 'setting.kds-code.generate',
      })
        .sort({ createdAt: -1 })
        .lean();
      expect(log).toBeTruthy();
      expect(idOf(log?.restaurant)).toBe(X);
    });
  });

  describe('GET /audit-logs — bảo vệ role', () => {
    it('admin X → 403 (chỉ super-admin)', async () => {
      const res = await request.get('/api/audit-logs').set('Authorization', `Bearer ${adminX()}`);
      expect(res.status).toBe(403);
    });

    it('super-admin → 200, có danh sách log + total', async () => {
      const res = await request
        .get('/api/audit-logs?limit=10')
        .set('Authorization', `Bearer ${superAdmin()}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(4);
    });

    it('super-admin lọc theo restaurantId=X → chỉ log của X', async () => {
      const res = await request
        .get(`/api/audit-logs?restaurantId=${X}&limit=50`)
        .set('Authorization', `Bearer ${superAdmin()}`);
      expect(res.status).toBe(200);
      for (const log of res.body.data as any[]) {
        expect(idOf(log.restaurant)).toBe(X);
      }
    });
  });

  describe('Rate limit — bypass khi test, 429 khi bật', () => {
    it('NODE_ENV=test → gọi nhiều lần không bị chặn (bypass)', async () => {
      for (let i = 0; i < 12; i++) {
        const res = await request.post('/api/settings/kds/verify').send({ code: '999999' });
        expect(res.status).not.toBe(429);
      }
    });

    it('bật rate limit (NODE_ENV=development) → vượt ngưỡng kds/verify bị 429', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      try {
        // kdsVerifyRateLimit = 10/5min → request thứ 11 phải 429
        let got429 = false;
        for (let i = 0; i < 12; i++) {
          const res = await request.post('/api/settings/kds/verify').send({ code: '999999' });
          if (res.status === 429) {
            got429 = true;
            break;
          }
        }
        expect(got429).toBe(true);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});
