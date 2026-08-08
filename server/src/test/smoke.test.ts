import { describe, it, expect } from 'vitest';
import { request, loginAs } from './utils.js';
import { SEED_IDS, TEST_PASSWORD } from './seed.js';

describe('Smoke test — hạ tầng test', () => {
  it('login admin trả về accessToken có tenant X', async () => {
    const res = await request.post('/api/auth/login').send({
      email: 'admin.test@nhamnhi.vn',
      password: TEST_PASSWORD,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('admin.test@nhamnhi.vn');
    expect(res.body.data.user.role).toBe('admin');
    // restaurantIds được server populate ('name') → mỗi phần tử là {_id, name}; trích id để so sánh
    const ids = res.body.data.user.restaurantIds.map((r: any) =>
      typeof r === 'string' ? r : String(r?._id ?? r?.id ?? ''),
    );
    expect(ids).toContain(SEED_IDS.tenantX.toString());
    expect(res.body.data.accessToken).toBeTruthy();
  });

  it('login sai mật khẩu trả về 400', async () => {
    const res = await request.post('/api/auth/login').send({
      email: 'admin.test@nhamnhi.vn',
      password: 'SaiMatKhau',
    });
    expect(res.status).toBe(400);
  });

  it('GET /api/auth/profile/me với token hợp lệ', async () => {
    const token = await loginAs('manager.test@nhamnhi.vn');
    const res = await request
      .get('/api/auth/profile/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('manager.test@nhamnhi.vn');
  });

  it('GET /api/tables/restaurant/:id trả đúng bàn của tenant X', async () => {
    const token = await loginAs('admin.test@nhamnhi.vn');
    const res = await request
      .get(`/api/tables/restaurant/${SEED_IDS.tenantX.toString()}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const tables = Array.isArray(res.body.data) ? res.body.data : res.body.data?.tables ?? [];
    expect(tables).toHaveLength(2);
    for (const table of tables) {
      expect(table.restaurant.toString()).toBe(SEED_IDS.tenantX.toString());
    }
  });
});
