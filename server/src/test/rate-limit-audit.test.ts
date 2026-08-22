import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { request, tokenFor } from './utils.js';
import DB_Connection from '../models/DB_Connection.js';
import { SEED_IDS } from './seed.js';
import { SUPER_ADMIN_ALLOWED_ACTIONS } from '../services/auditAction.js';

const X = SEED_IDS.tenantX.toString();
const Y = SEED_IDS.tenantY.toString();
const idOf = (oid: unknown) => String(oid);
// restaurant được populate thành { _id, name } — lấy id từ cả 2 dạng (string | object)
const ridOf = (restaurant: unknown) =>
  idOf((restaurant as { _id?: unknown })?._id ?? (restaurant as string));

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
      const log = (await DB_Connection.AuditLog.findOne({ action: 'user.register' })
        .sort({ createdAt: -1 })
        .lean()) as any;
      expect(log).toBeTruthy();
      expect(log?.targetType).toBe('user');
      expect(log?.summary).toContain('Đăng ký');
    });

    it('switch-tenant → KHÔNG ghi audit (hành động cá nhân, không thay đổi dữ liệu)', async () => {
      const token = await request.post('/api/auth/login').send({
        email: 'admin.test@nhamnhi.vn',
        password: 'Test@NhamNhi2026',
      });
      const accessToken = token.body?.data?.accessToken as string;
      await request
        .post('/api/auth/switch-tenant')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ restaurantId: Y });

      const log = (await DB_Connection.AuditLog.findOne({ action: 'user.switch-tenant' })
        .sort({ createdAt: -1 })
        .lean()) as any;
      expect(log).toBeFalsy();
    });

    it('khoá nhà hàng (super-admin) → có audit log restaurant.lock', async () => {
      await request
        .patch(`/api/restaurants/status/${Y}`)
        .set('Authorization', `Bearer ${superAdmin()}`)
        .send({ status: 'inactive' });

      const log = (await DB_Connection.AuditLog.findOne({ action: 'restaurant.lock' })
        .sort({ createdAt: -1 })
        .lean()) as any;
      expect(log).toBeTruthy();
      expect(idOf(log?.restaurant)).toBe(Y);
    });

    it('generate kitchen code → có audit log setting.kds-code.generate', async () => {
      await request
        .post(`/api/settings/${idOf(SEED_IDS.settingX)}/kds-code`)
        .set('Authorization', `Bearer ${adminX()}`);

      const log = (await DB_Connection.AuditLog.findOne({
        action: 'setting.kds-code.generate',
      })
        .sort({ createdAt: -1 })
        .lean()) as any;
      expect(log).toBeTruthy();
      expect(idOf(log?.restaurant)).toBe(X);
    });
  });

  describe('GET /audit-logs — bảo vệ role', () => {
    it('admin X → 200, chỉ thấy log của chuỗi mình (X/Y)', async () => {
      const res = await request.get('/api/audit-logs').set('Authorization', `Bearer ${adminX()}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      for (const log of res.body.data as any[]) {
        const rid = ridOf(log.restaurant);
        expect([X, Y]).toContain(rid);
      }
    });

    it('admin X gửi restaurantIds có id ngoài chuỗi → 403', async () => {
      const res = await request
        .get(`/api/audit-logs?restaurantIds=${idOf(SEED_IDS.tenantSubTrial)}`)
        .set('Authorization', `Bearer ${adminX()}`);
      expect(res.status).toBe(403);
    });

    it('super-admin → 200, chỉ thấy log NỀN TẢNG trong whitelist (PA-6)', async () => {
      const res = await request
        .get('/api/audit-logs?limit=50')
        .set('Authorization', `Bearer ${superAdmin()}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      // Seed có user.register + transaction.create (whitelist) → ít nhất 2 log nền tảng
      expect(res.body.total).toBeGreaterThanOrEqual(2);
      for (const log of res.body.data as any[]) {
        expect(SUPER_ADMIN_ALLOWED_ACTIONS).toContain(String(log.action));
      }
    });

    it('super-admin → KHÔNG thấy action vận hành tenant (order.*, kds-code...)', async () => {
      const res = await request
        .get('/api/audit-logs?limit=50')
        .set('Authorization', `Bearer ${superAdmin()}`);
      expect(res.status).toBe(200);
      const actions = (res.body.data as any[]).map((l) => String(l.action));
      expect(actions).not.toContain('order.create');
      expect(actions).not.toContain('setting.kds-code.generate');
      for (const log of res.body.data as any[]) {
        expect(String(log.action).startsWith('order.')).toBe(false);
      }
    });

    it('super-admin lọc theo restaurantId=X → chỉ log của X, vẫn đúng whitelist', async () => {
      const res = await request
        .get(`/api/audit-logs?restaurantId=${X}&limit=50`)
        .set('Authorization', `Bearer ${superAdmin()}`);
      expect(res.status).toBe(200);
      for (const log of res.body.data as any[]) {
        expect(ridOf(log.restaurant)).toBe(X);
        expect(String(log.action).startsWith('order.')).toBe(false);
      }
    });

    it('admin X → vẫn thấy order.create của chuỗi mình', async () => {
      const res = await request.get('/api/audit-logs').set('Authorization', `Bearer ${adminX()}`);
      expect(res.status).toBe(200);
      const orderLogs = (res.body.data as any[]).filter((log) =>
        String(log.action).startsWith('order.'),
      );
      expect(orderLogs.length).toBeGreaterThan(0);
    });

    it('manager X → thấy order.create của chi nhánh mình, không lộ chi nhánh khác', async () => {
      const res = await request
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${tokenFor('manager', X)}`);
      expect(res.status).toBe(200);
      const orderLogs = (res.body.data as any[]).filter((log) =>
        String(log.action).startsWith('order.'),
      );
      expect(orderLogs.length).toBeGreaterThan(0);
      for (const log of res.body.data as any[]) {
        expect(ridOf(log.restaurant)).toBe(X);
      }
    });
  });

  describe('GET /audit-logs/payments — lịch sử thanh toán của chủ', () => {
    it('admin X → 200, mọi transaction thuộc ownerId adminX', async () => {
      // Tạo 1 giao dịch thanh toán cho chủ adminX
      await request
        .post('/api/subscriptions/pay')
        .set('Authorization', `Bearer ${adminX()}`)
        .send({ restaurantId: X, cycleMonths: 1 });

      const res = await request
        .get('/api/audit-logs/payments')
        .set('Authorization', `Bearer ${adminX()}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
      for (const tx of res.body.data as any[]) {
        expect(idOf(tx.ownerId)).toBe(idOf(SEED_IDS.adminX));
      }
    });

    it('manager → 403 (chỉ admin chủ chuỗi)', async () => {
      const res = await request
        .get('/api/audit-logs/payments')
        .set('Authorization', `Bearer ${tokenFor('manager', X)}`);
      expect(res.status).toBe(403);
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
