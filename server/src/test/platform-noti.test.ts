import { describe, it, expect, beforeAll } from 'vitest';
import DB_Connection from '../models/DB_Connection.js';
import { request, tokenFor } from './utils.js';
import { SEED_IDS } from './seed.js';
import notificationService from '../modules/Notification/notification.service.js';

const saToken = () => tokenFor('super-admin');

/**
 * PA-1 — Kênh thông báo NỀN TẢNG (restaurant = null) cho super-admin:
 * - createPlatformNotification → doc restaurant:null
 * - GET /api/notifications/platform: SA thấy; manager bị chặn (verifyRole)
 * - POST /api/notifications/platform/read-all: đọc tất cả
 */
describe('PA-1 — Thông báo nền tảng cho super-admin', () => {
  beforeAll(async () => {
    await notificationService.createPlatformNotification({
      type: 'system',
      message: 'Người dùng owner.pa1@nhamnhi.vn vừa đăng ký sử dụng hệ thống',
      data: { email: 'owner.pa1@nhamnhi.vn' },
    });
    await notificationService.createPlatformNotification({
      type: 'subscription',
      message: 'Nhà hàng "PA1 Cơ Sở" đã gia hạn gói Pro 3 tháng',
      data: { planKey: 'pro' },
    });
  });

  it('GET /api/notifications/platform — super-admin thấy đúng các noti platform (restaurant=null)', async () => {
    const res = await request
      .get('/api/notifications/platform')
      .set('Authorization', `Bearer ${saToken()}`);
    expect(res.status).toBe(200);
    const list = res.body.data as any[];
    expect(list.length).toBeGreaterThanOrEqual(2);
    for (const n of list) {
      expect(n.restaurant ?? null).toBeNull();
    }
    expect(list.map((n) => n.type)).toContain('system');
    expect(list.map((n) => n.type)).toContain('subscription');
  });

  it('GET /api/notifications/platform — manager KHÔNG được gọi (verifyRole chặn)', async () => {
    const res = await request
      .get('/api/notifications/platform')
      .set('Authorization', `Bearer ${tokenFor('manager', SEED_IDS.tenantX.toString())}`);
    expect([401, 403]).toContain(res.status);
  });

  it('POST /api/notifications/platform/read-all — đánh dấu tất cả đã đọc', async () => {
    const res = await request
      .post('/api/notifications/platform/read-all')
      .set('Authorization', `Bearer ${saToken()}`);
    expect(res.status).toBe(200);

    const unread = await DB_Connection.Notification.countDocuments({
      restaurant: null,
      isRead: false,
    });
    expect(unread).toBe(0);
  });
});
