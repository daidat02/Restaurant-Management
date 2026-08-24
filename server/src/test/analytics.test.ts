import { describe, it, expect } from 'vitest';
import { request, tokenFor } from './utils.js';
import { SEED_IDS } from './seed.js';

const X = SEED_IDS.tenantX.toString();
const Y = SEED_IDS.tenantY.toString();

const adminX = () => tokenFor('admin', X);
const managerX = () => tokenFor('manager', X);

const d = (daysAgo: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - daysAgo);
  return dt.toISOString().slice(0, 10);
};

describe('T10 — Analytics', () => {
  describe('overview: validate params', () => {
    it('thiếu startDate/endDate → 400', async () => {
      const res = await request
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${managerX()}`);
      expect(res.status).toBe(400);
    });

    it('ngày không hợp lệ → 400', async () => {
      const res = await request
        .get(`/api/analytics/overview?startDate=abc&endDate=${d(0)}`)
        .set('Authorization', `Bearer ${managerX()}`);
      expect(res.status).toBe(400);
    });

    it('startDate > endDate → 400', async () => {
      const res = await request
        .get(`/api/analytics/overview?startDate=${d(0)}&endDate=${d(7)}`)
        .set('Authorization', `Bearer ${managerX()}`);
      expect(res.status).toBe(400);
    });

    it('hợp lệ (manager X) → 200 có data', async () => {
      const res = await request
        .get(`/api/analytics/overview?startDate=${d(30)}&endDate=${d(0)}`)
        .set('Authorization', `Bearer ${managerX()}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeTruthy();
      expect(typeof res.body.data.totalRevenue).toBe('number');
    });
  });

  describe('revenue-channels (LỖ HỔNG — admin X đọc được toàn hệ thống)', () => {
    it('admin X gọi revenue-channels → kỳ vọng 403 (hiện 200, leak data Y)', async () => {
      const res = await request
        .get(`/api/analytics/revenue-channels?startDate=${d(30)}&endDate=${d(0)}`)
        .set('Authorization', `Bearer ${adminX()}`);
      expect(res.status).toBe(403);
    });
  });

  describe('T02 — admin chủ chuỗi: analytics gộp nhiều chi nhánh ($in) + intersect quyền', () => {
    it('admin X gửi restaurantIds=[X,Y] (cả 2 thuộc chuỗi) → 200, data gộp', async () => {
      const res = await request
        .get(`/api/analytics/overview?startDate=${d(30)}&endDate=${d(0)}&restaurantIds=${X}&restaurantIds=${Y}`)
        .set('Authorization', `Bearer ${adminX()}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeTruthy();
    });

    it('admin X gửi restaurantIds=[X,Y] → revenue-hourly gộp 200', async () => {
      const res = await request
        .get(`/api/analytics/revenue-hourly?startDate=${d(30)}&endDate=${d(0)}&restaurantIds=${X}&restaurantIds=${Y}`)
        .set('Authorization', `Bearer ${adminX()}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('admin X gửi restaurantIds=[X,Y] → order-channels gộp 200', async () => {
      const res = await request
        .get(`/api/analytics/order-channels?startDate=${d(30)}&endDate=${d(0)}&restaurantIds=${X}&restaurantIds=${Y}`)
        .set('Authorization', `Bearer ${adminX()}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('admin X gửi restaurantIds=[X, tenant khác không thuộc chuỗi] → 403', async () => {
      const res = await request
        .get(`/api/analytics/overview?startDate=${d(30)}&endDate=${d(0)}&restaurantIds=${X}&restaurantIds=${SEED_IDS.tenantSubTrial.toString()}`)
        .set('Authorization', `Bearer ${adminX()}`);
      expect(res.status).toBe(403);
    });

    it('manager X gửi restaurantIds=[Y] (không thuộc) → 403', async () => {
      const res = await request
        .get(`/api/analytics/overview?startDate=${d(30)}&endDate=${d(0)}&restaurantIds=${Y}`)
        .set('Authorization', `Bearer ${managerX()}`);
      expect(res.status).toBe(403);
    });

    it('manager X gửi restaurantIds=[X] → vẫn hoạt động 200', async () => {
      const res = await request
        .get(`/api/analytics/overview?startDate=${d(30)}&endDate=${d(0)}&restaurantIds=${X}`)
        .set('Authorization', `Bearer ${managerX()}`);
      expect(res.status).toBe(200);
    });

    it('admin X không gửi restaurantIds → mặc định toàn chuỗi (X+Y) → 200', async () => {
      const res = await request
        .get(`/api/analytics/overview?startDate=${d(30)}&endDate=${d(0)}`)
        .set('Authorization', `Bearer ${adminX()}`);
      expect(res.status).toBe(200);
    });
  });

  describe('role guard', () => {    it('manager không gọi được revenue-channels → 403', async () => {
      const res = await request
        .get(`/api/analytics/revenue-channels?startDate=${d(30)}&endDate=${d(0)}`)
        .set('Authorization', `Bearer ${managerX()}`);
      expect(res.status).toBe(403);
    });

    it('customer không gọi được overview → 403', async () => {
      const res = await request
        .get(`/api/analytics/overview?startDate=${d(30)}&endDate=${d(0)}`)
        .set('Authorization', `Bearer ${tokenFor('customer')}`);
      expect(res.status).toBe(403);
    });

    it('thiếu token → 401', async () => {
      const res = await request.get('/api/analytics/overview');
      expect(res.status).toBe(401);
    });
  });

  describe('top-items (Home — mọi gói)', () => {
    it('thiếu startDate/endDate → 400', async () => {
      const res = await request
        .get('/api/analytics/top-items')
        .set('Authorization', `Bearer ${managerX()}`);
      expect(res.status).toBe(400);
    });

    it('startDate > endDate → 400', async () => {
      const res = await request
        .get(`/api/analytics/top-items?startDate=${d(0)}&endDate=${d(7)}`)
        .set('Authorization', `Bearer ${managerX()}`);
      expect(res.status).toBe(400);
    });

    it('hợp lệ (manager X) → 200 mảng có cấu trúc đúng', async () => {
      const res = await request
        .get(`/api/analytics/top-items?startDate=${d(30)}&endDate=${d(0)}&limit=5`)
        .set('Authorization', `Bearer ${managerX()}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      for (const item of res.body.data) {
        expect(typeof item.itemName).toBe('string');
        expect(item.quantity).toBeGreaterThan(0);
        expect(item.revenue).toBeGreaterThan(0);
        expect(item.orderCount).toBeGreaterThan(0);
      }
      // Sort giảm dần theo quantity
      const quantities = res.body.data.map((i: any) => i.quantity);
      expect([...quantities].sort((a: number, b: number) => b - a)).toEqual(quantities);
    });
  });

  describe('channel-trend + hour-matrix (Advanced — gate advanced_report)', () => {
    it('channel-trend thiếu tham số → 400', async () => {
      const res = await request
        .get('/api/analytics/channel-trend')
        .set('Authorization', `Bearer ${adminX()}`);
      expect(res.status).toBe(400);
    });

    it('channel-trend hợp lệ (admin X, pro) → 200; mỗi ngày đủ 4 kênh', async () => {
      const res = await request
        .get(`/api/analytics/channel-trend?startDate=${d(30)}&endDate=${d(0)}`)
        .set('Authorization', `Bearer ${adminX()}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      for (const day of res.body.data) {
        expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(day.channels).toHaveLength(4);
        const totalRevenue = day.channels.reduce((s: number, c: any) => s + c.revenue, 0);
        expect(totalRevenue).toBeGreaterThanOrEqual(0);
      }
      // Sắp tăng dần theo ngày
      const dates = res.body.data.map((x: any) => x.date);
      expect([...dates].sort()).toEqual(dates);
    });

    it('hour-matrix hợp lệ (admin X, pro) → 200 ô thô dow/hour hợp lệ', async () => {
      const res = await request
        .get(`/api/analytics/hour-matrix?startDate=${d(30)}&endDate=${d(0)}`)
        .set('Authorization', `Bearer ${adminX()}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      for (const cell of res.body.data) {
        expect(cell.dow).toBeGreaterThanOrEqual(1); // 1=CN
        expect(cell.dow).toBeLessThanOrEqual(7);
        expect(cell.hour).toBeGreaterThanOrEqual(0);
        expect(cell.hour).toBeLessThanOrEqual(23);
        expect(cell.orderCount).toBeGreaterThan(0);
      }
    });

    it('revenue-hourly trả đủ 24 giờ kể cả ngoài khung 09-22', async () => {
      const res = await request
        .get(`/api/analytics/revenue-hourly?startDate=${d(30)}&endDate=${d(0)}`)
        .set('Authorization', `Bearer ${adminX()}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(24);
      expect(res.body.data[0].hour).toBe('0:00');
      expect(res.body.data[23].hour).toBe('23:00');
    });
  });
});
