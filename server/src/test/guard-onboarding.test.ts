import { describe, it, expect } from 'vitest';
import { request, signToken, idOf } from './utils.js';
import { SEED_IDS, TEST_PASSWORD } from './seed.js';

const X = SEED_IDS.tenantX.toString();

/** Tạo admin mới (chưa có nhà hàng) + token. */
async function freshAdminToken(email?: string) {
  const res = await request.post('/api/auth/register-owner').send({
    name: 'Chủ Guard',
    email: email || `guard.${Date.now()}@nhamnhi.vn`,
    password: TEST_PASSWORD,
  });
  expect(res.status).toBe(201);
  return signToken(idOf(res.body.data._id), 'admin');
}

describe('T18 — Guard onboarding: chặn Admin chưa có nhà hàng (NEEDS_ONBOARDING)', () => {
  it('verifyTenant route → 403 NEEDS_ONBOARDING khi admin chưa có nhà hàng', async () => {
    const token = await freshAdminToken();
    const res = await request
      .get(`/api/settings/get-or-create/restaurant/Restaurant/${X}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('NEEDS_ONBOARDING');
  });

  it('intersectRestaurantIds route (GET /auth/) → 403 NEEDS_ONBOARDING', async () => {
    const token = await freshAdminToken();
    const res = await request
      .get('/api/auth/')
      .query({ roles: 'staff' })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('NEEDS_ONBOARDING');
  });

  it('Endpoint tạo nhà hàng đầu tiên (POST /restaurants) KHÔNG bị chặn → 201', async () => {
    const ownerRes = await request.post('/api/auth/register-owner').send({
      name: 'Chủ Tạo Đầu',
      email: `owner.first.${Date.now()}@nhamnhi.vn`,
      password: TEST_PASSWORD,
    });
    const token = signToken(idOf(ownerRes.body.data._id), 'admin');
    const res = await request
      .post('/api/restaurants')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cơ sở đầu tiên', email: 'first@nhamnhi.vn', operatingHours: '8-22' });
    expect(res.status).toBe(201);
    expect(res.body.result.data.subscription).toBe('active');
  });

  it('Admin đã có nhà hàng → API vẫn hoạt động (không bị chặn)', async () => {
    const token = signToken(SEED_IDS.adminX.toString(), 'admin', X);
    const res = await request
      .get('/api/auth/')
      .query({ roles: 'staff' })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

describe('T2 — /auth/profile/me trả restaurantIds mới nhất', () => {
  it('Sau khi tạo nhà hàng đầu tiên, /me có restaurantIds chứa chi nhánh mới', async () => {
    const ownerRes = await request.post('/api/auth/register-owner').send({
      name: 'Chủ Refresh',
      email: `owner.me.${Date.now()}@nhamnhi.vn`,
      password: TEST_PASSWORD,
    });
    const ownerId = idOf(ownerRes.body.data._id);
    const token = signToken(ownerId, 'admin');

    const me0 = await request.get('/api/auth/profile/me').set('Authorization', `Bearer ${token}`);
    expect(me0.status).toBe(200);
    expect(me0.body.data.restaurantIds).toEqual([]);

    const created = await request
      .post('/api/restaurants')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Chi nhánh refresh', email: 'refresh@nhamnhi.vn', operatingHours: '8-22' });
    expect(created.status).toBe(201);

    const me1 = await request.get('/api/auth/profile/me').set('Authorization', `Bearer ${token}`);
    expect(me1.status).toBe(200);
    expect(me1.body.data.restaurantIds.length).toBe(1);
    // restaurantIds được populate 'name' → phần tử là { _id, name }; trích id để so sánh
    const rid = idOf(me1.body.data.restaurantIds[0]?._id ?? me1.body.data.restaurantIds[0]);
    expect(rid).toBe(idOf(created.body.result.data._id));
  });
});