import { test, expect } from '@playwright/test';
import { login, API_BASE, apiLogin, apiRegisterOwner, USERS, SEED_IDS } from './helpers';

const OWNER_EMAIL = 'owner.sub@nhamnhi.vn';
const PASSWORD = 'Test@NhamNhi2026';

/**
 * T07 — Verify toàn luồng gói thuê mới (4 bậc): cấu hình super-admin, gate số lượng/tính năng,
 * upgrade/downgrade, hết hạn → hạ Miễn Phí (KHÔNG khoá), chi nhánh 2+ pending regression.
 *
 * Chiến lược:
 *  - Tạo owner + nhà hàng đầu (free) riêng cho spec → cô lập, không đụng seed.
 *  - Kịch bản hết hạn dùng seed restaurant có paidUntil quá khứ (tenantSubDowngrading / tenantSubExpired);
 *    trigger applySubscriptionState qua GET /api/admin/dashboard (super-admin).
 */
test.describe('T07 — Subscription plans: gate + vòng đời mới', () => {
  let saToken: string;
  let adminToken: string;
  let ownerToken: string;
  let freeOwnerToken: string;
  let freeId: string;
  let freeManagerToken: string;
  let freeCatId: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  test.beforeAll(async ({ request }) => {
    saToken = await apiLogin(request, USERS.superAdmin.email);
    adminToken = await apiLogin(request, USERS.admin.email); // restaurantIds[0] = tenantX (pro)
    ownerToken = await apiLogin(request, OWNER_EMAIL);

    // Owner riêng + nhà hàng đầu tiên → active + gói Miễn Phí (trần 5 bàn / 30 món / 2 NV)
    const email = `e2e.plan.${Date.now()}@nhamnhi.vn`;
    await apiRegisterOwner(request, email, 'E2E Plan Owner');

    const create = await request.post(`${API_BASE}/restaurants`, {
      headers: auth(await apiLogin(request, email)),
      data: { name: 'E2E Free Plan', email: `free${Date.now()}@nhamnhi.vn`, operatingHours: '8-22' },
    });
    expect(create.status()).toBe(201);
    freeId = (await create.json()).result.data._id as string;
    expect((await create.json()).result.data.subscription).toBe('active');
    expect((await create.json()).result.data.currentPlanKey).toBe('free');

    // Token chủ phải đăng nhập SAU khi có nhà hàng (để restaurantId nằm trong claim JWT)
    freeOwnerToken = await apiLogin(request, email);

    // Manager cho nhà hàng free (để tạo món — route /menu/item chỉ cho manager)
    const mgrEmail = `mgr.free.${Date.now()}@nhamnhi.vn`;
    const mgr = await request.post(`${API_BASE}/auth/admin/create`, {
      headers: auth(freeOwnerToken),
      data: {
        name: 'Mgr Free',
        email: mgrEmail,
        password: PASSWORD,
        role: 'manager',
        restaurant: freeId,
      },
    });
    expect(mgr.status()).toBe(201);
    freeManagerToken = await apiLogin(request, mgrEmail);

    // Danh mục cho nhà hàng free
    const cat = await request.post(`${API_BASE}/menu/category`, {
      headers: auth(freeOwnerToken),
      data: { name: 'Danh mục E2E', restaurant: freeId },
    });
    expect(cat.status()).toBe(201);
    freeCatId = (await cat.json()).data?._id ?? (await cat.json()).result?.data?._id;
  });

  test('1. super-admin cấu hình featureKeys → GET /pricing phản ánh đúng', async ({ request }) => {
    const get = await request.get(`${API_BASE}/pricing`, { headers: auth(saToken) });
    expect(get.status()).toBe(200);
    const config = (await get.json()).data;
    const plans = config.plans as any[];
    expect(plans.length).toBeGreaterThanOrEqual(4); // free/basic/pro/enterprise
    const pro = plans.find((p) => p.key === 'pro');
    expect(pro).toBeTruthy();
    expect(Array.isArray(pro.featureKeys)).toBe(true);
    const originalKeys = [...(pro.featureKeys ?? [])];

    // Thêm feature 'api' vào Pro
    const modified = plans.map((p) =>
      p.key === 'pro' ? { ...p, featureKeys: [...(p.featureKeys ?? []), 'api'] } : p,
    );
    const put = await request.put(`${API_BASE}/admin/pricing`, {
      headers: auth(saToken),
      data: { plans: modified },
    });
    expect(put.status()).toBe(200);

    const after = (await (await request.get(`${API_BASE}/pricing`, { headers: auth(saToken) })).json())
      .data;
    expect(after.plans.find((p: any) => p.key === 'pro').featureKeys).toContain('api');

    // Khôi phục để không ảnh hưởng các kịch bản gate sau
    const restore = await request.put(`${API_BASE}/admin/pricing`, {
      headers: auth(saToken),
      data: { plans: plans.map((p) => ({ ...p, featureKeys: originalKeys })) },
    });
    expect(restore.status()).toBe(200);
  });

  test('2. Gate số lượng: free chặn bàn thứ 6 / món thứ 31 / NV thứ 3; pro thoải mái', async ({ request }) => {
    // --- Free: bàn ---
    for (let i = 1; i <= 5; i += 1) {
      const ok = await request.post(`${API_BASE}/tables/create`, {
        headers: auth(freeOwnerToken),
        data: { tableData: { restaurant: freeId, tableNumber: String(i), status: 'available' } },
      });
      expect(ok.status(), `tạo bàn ${i} (free) phải thành công`).toBe(201);
    }
    const table6 = await request.post(`${API_BASE}/tables/create`, {
      headers: auth(freeOwnerToken),
      data: { tableData: { restaurant: freeId, tableNumber: '6', status: 'available' } },
    });
    expect(table6.status()).toBe(403);
    expect((await table6.json()).errorCode).toBe('PLAN_LIMIT_REACHED');
    expect((await table6.json()).meta).toMatchObject({ resource: 'tables', limit: 5, planKey: 'free' });

    // --- Free: món (30 OK, thứ 31 chặn) ---
    for (let i = 1; i <= 30; i += 1) {
      const ok = await request.post(`${API_BASE}/menu/item`, {
        headers: auth(freeManagerToken),
        data: { category: freeCatId, restaurant: freeId, name: `Món E2E ${i}`, price: 10000 },
      });
      expect(ok.status(), `tạo món ${i} (free) phải thành công`).toBe(201);
    }
    const item31 = await request.post(`${API_BASE}/menu/item`, {
      headers: auth(freeManagerToken),
      data: { category: freeCatId, restaurant: freeId, name: 'Món E2E 31', price: 10000 },
    });
    expect(item31.status()).toBe(403);
    expect((await item31.json()).errorCode).toBe('PLAN_LIMIT_REACHED');
    expect((await item31.json()).meta).toMatchObject({ resource: 'items', limit: 30, planKey: 'free' });

    // --- Free: NV (manager đã tính 1; thêm 1 staff → 2; staff thứ 2 → 3 → chặn) ---
    const staff1 = await request.post(`${API_BASE}/auth/admin/create`, {
      headers: auth(freeOwnerToken),
      data: { name: 'NV Free 1', email: `nv1.${Date.now()}@nhamnhi.vn`, password: PASSWORD, role: 'staff', restaurant: freeId },
    });
    expect(staff1.status()).toBe(201);
    const staff2 = await request.post(`${API_BASE}/auth/admin/create`, {
      headers: auth(freeOwnerToken),
      data: { name: 'NV Free 2', email: `nv2.${Date.now()}@nhamnhi.vn`, password: PASSWORD, role: 'staff', restaurant: freeId },
    });
    expect(staff2.status()).toBe(403);
    expect((await staff2.json()).errorCode).toBe('PLAN_LIMIT_REACHED');
    expect((await staff2.json()).meta).toMatchObject({ resource: 'staff', limit: 2, planKey: 'free' });

    // --- Pro (tenantX): tạo bàn + món + NV thoải mái → 201 ---
    const pTable = await request.post(`${API_BASE}/tables/create`, {
      headers: auth(adminToken),
      data: { tableData: { restaurant: SEED_IDS.tenantX, tableNumber: '99', status: 'available' } },
    });
    expect(pTable.status()).toBe(201);

    // /menu/item chỉ cho role manager — dùng manager của tenantX
    const proMgrToken = await apiLogin(request, USERS.manager.email);
    const pItem = await request.post(`${API_BASE}/menu/item`, {
      headers: auth(proMgrToken),
      data: {
        category: SEED_IDS.categoryX,
        restaurant: SEED_IDS.tenantX,
        name: 'Món Pro E2E',
        price: 20000,
      },
    });
    expect(pItem.status()).toBe(201);

    const pStaff = await request.post(`${API_BASE}/auth/admin/create`, {
      headers: auth(adminToken),
      data: { name: 'NV Pro', email: `nvpro.${Date.now()}@nhamnhi.vn`, password: PASSWORD, role: 'staff', restaurant: SEED_IDS.tenantX },
    });
    expect(pStaff.status()).toBe(201);
  });

  test('3. Gate tính năng: free chặn KDS (màn hình bếp) + báo cáo nâng cao; pro dùng được', async ({ request }) => {
    // Free: màn hình KDS (đơn bếp) → 403 meta.feature kds
    const kdsFree = await request.get(`${API_BASE}/orders/kds/${freeId}`, {
      headers: auth(freeOwnerToken),
    });
    expect(kdsFree.status()).toBe(403);
    expect((await kdsFree.json()).errorCode).toBe('PLAN_LIMIT_REACHED');
    expect((await kdsFree.json()).meta).toMatchObject({ feature: 'kds', planKey: 'free' });

    // Free: báo cáo nâng cao → 403 meta.feature advanced_report
    const reportFree = await request.get(`${API_BASE}/analytics/overview`, {
      headers: auth(freeOwnerToken),
      params: { restaurantIds: freeId },
    });
    expect(reportFree.status()).toBe(403);
    expect((await reportFree.json()).errorCode).toBe('PLAN_LIMIT_REACHED');
    expect((await reportFree.json()).meta).toMatchObject({ feature: 'advanced_report', planKey: 'free' });

    // Pro (tenantX): KDS + báo cáo nâng cao OK
    const managerToken = await apiLogin(request, USERS.manager.email);
    const kdsPro = await request.get(`${API_BASE}/orders/kds/${SEED_IDS.tenantX}`, {
      headers: auth(managerToken),
    });
    expect(kdsPro.status()).toBe(200);

    const reportPro = await request.get(`${API_BASE}/analytics/overview`, {
      headers: auth(managerToken),
      params: { restaurantIds: SEED_IDS.tenantX, startDate: '2026-01-01', endDate: '2026-01-31' },
    });
    expect(reportPro.status()).toBe(200);
  });

  test('4. Upsell client: thao tác vượt giới hạn → modal upsell mở (interceptor)', async ({ page }) => {
    // Mock create-url (POST thao tác) trả PLAN_LIMIT_REACHED → interceptor bật modal upsell
    await page.route('**/api/subscriptions/payos/create-url', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Gói Miễn Phí đã đạt giới hạn số bàn: 5/5. Nâng gói để tiếp tục.',
          errorCode: 'PLAN_LIMIT_REACHED',
          restaurantId: freeId,
          meta: { resource: 'tables', limit: 5, used: 5, planKey: 'free' },
        }),
      });
    });

    await login(page, OWNER_EMAIL);
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
    await page.goto('/admin/billing');

    // Nhấn "Gia hạn gói" → gọi tạo link thanh toán → mock 403 → modal upsell mở
    await page.getByRole('button', { name: /Gia hạn gói/ }).click();
    await expect(page.getByText('Đã đạt giới hạn gói')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Bạn đã dùng 5\/5 bàn/)).toBeVisible();

    // Dọn mock + đóng modal
    await page.unroute('**/api/subscriptions/payos/create-url');
    await page.getByRole('button', { name: 'Để sau' }).click();
  });

  test('5. Upgrade: free → pro → bàn thứ 6 / món 31 / NV thứ 3 thành công', async ({ request }) => {
    const pay = await request.post(`${API_BASE}/subscriptions/pay`, {
      headers: auth(freeOwnerToken),
      data: { restaurantId: freeId, cycleMonths: 1, planId: 'pro' },
    });
    expect(pay.status()).toBe(200);
    const payBody = await pay.json();
    expect(payBody.data.restaurant.currentPlanKey).toBe('pro');
    expect(payBody.data.paidUntil).toBeTruthy();

    const table6 = await request.post(`${API_BASE}/tables/create`, {
      headers: auth(freeOwnerToken),
      data: { tableData: { restaurant: freeId, tableNumber: '6', status: 'available' } },
    });
    expect(table6.status()).toBe(201);

    const item31 = await request.post(`${API_BASE}/menu/item`, {
      headers: auth(freeManagerToken),
      data: { category: freeCatId, restaurant: freeId, name: 'Món Pro 31', price: 10000 },
    });
    expect(item31.status()).toBe(201);

    const staff3 = await request.post(`${API_BASE}/auth/admin/create`, {
      headers: auth(freeOwnerToken),
      data: { name: 'NV Pro 3', email: `nv3.${Date.now()}@nhamnhi.vn`, password: PASSWORD, role: 'staff', restaurant: freeId },
    });
    expect(staff3.status()).toBe(201);
  });

  test('6. Downgrade: lên lịch hạ gói giữa chu kỳ (pendingPlanKey), không trừ tiền; hết hạn → áp dụng', async ({ request }) => {
    // a. pro đang còn hạn → hạ basic: lưu pendingPlanKey, không tạo transaction
    const before = await request.get(`${API_BASE}/subscriptions/transactions`, {
      headers: auth(freeOwnerToken),
    });
    const beforeCount = ((await before.json()).data ?? []).length;

    const downgrade = await request.post(`${API_BASE}/subscriptions/pay`, {
      headers: auth(freeOwnerToken),
      data: { restaurantId: freeId, cycleMonths: 1, planId: 'basic' },
    });
    expect(downgrade.status()).toBe(200);
    const dBody = await downgrade.json();
    expect(dBody.message).toContain('áp dụng khi hết hạn');
    expect(dBody.data.pendingPlanKey).toBe('basic');
    expect(dBody.data.transaction).toBeUndefined();

    const after = await request.get(`${API_BASE}/subscriptions/transactions`, {
      headers: auth(freeOwnerToken),
    });
    expect(((await after.json()).data ?? []).length).toBe(beforeCount);

    // currentPlanKey giữ nguyên pro
    const me1 = await request.get(`${API_BASE}/subscriptions/me`, { headers: auth(freeOwnerToken) });
    const mine1 = ((await me1.json()).data ?? []).find((r: any) => String(r._id) === freeId);
    expect(mine1.currentPlanKey).toBe('pro');
    expect(mine1.pendingPlanKey).toBe('basic');

    // b. Seed hết hạn + đã lên lịch hạ basic → super-admin dashboard trigger → áp dụng basic cuối chu kỳ
    await request.get(`${API_BASE}/admin/dashboard`, { headers: auth(saToken) });
    const me2 = await request.get(`${API_BASE}/subscriptions/me`, { headers: auth(ownerToken) });
    const downgrading = ((await me2.json()).data ?? []).find(
      (r: any) => String(r._id) === String(SEED_IDS.tenantSubDowngrading),
    );
    expect(downgrading).toBeTruthy();
    expect(downgrading.subscription).toBe('active');
    expect(downgrading.currentPlanKey).toBe('basic');
    expect(downgrading.pendingPlanKey).toBeUndefined();
  });

  test('7. Hết hạn: paidUntil quá khứ → hạ Miễn Phí (KHÔNG locked)', async ({ request }) => {
    // Trigger applySubscriptionState qua super-admin dashboard (idempotent)
    await request.get(`${API_BASE}/admin/dashboard`, { headers: auth(saToken) });

    const me = await request.get(`${API_BASE}/subscriptions/me`, { headers: auth(ownerToken) });
    const expired = ((await me.json()).data ?? []).find(
      (r: any) => String(r._id) === String(SEED_IDS.tenantSubExpired),
    );
    expect(expired).toBeTruthy();
    expect(expired.subscription).toBe('active'); // KHÔNG locked
    expect(expired.currentPlanKey).toBe('free');
    expect(expired.paidUntil).toBeFalsy();
  });

  test('8. Chi nhánh 2+ (pending) regression: pending → 403 RESTAURANT_LOCKED → thanh toán → active', async ({ request }) => {
    const email = `e2e.branch.${Date.now()}@nhamnhi.vn`;
    await apiRegisterOwner(request, email, 'E2E Branch Owner');
    const token = await apiLogin(request, email);

    // Nhà hàng đầu (free) → đủ điều kiện mở chi nhánh 2+
    await request.post(`${API_BASE}/restaurants`, {
      headers: auth(token),
      data: { name: 'Nhánh 1', email: `b1${Date.now()}@nhamnhi.vn`, operatingHours: '8-22' },
    });

    // Chi nhánh 2: activation pending
    const create2 = await request.post(`${API_BASE}/restaurants`, {
      headers: auth(token),
      data: {
        name: 'Nhánh 2 Pending',
        email: `b2${Date.now()}@nhamnhi.vn`,
        operatingHours: '8-22',
        cycleMonths: 1,
        activation: 'pending',
      },
    });
    expect(create2.status()).toBe(201);
    const pendingId = (await create2.json()).result.data._id as string;
    expect((await create2.json()).result.data.subscription).toBe('pending');

    // Vận hành chi nhánh pending → 403 RESTAURANT_LOCKED
    const blocked = await request.get(`${API_BASE}/tables/restaurant/${pendingId}`, {
      headers: auth(token),
    });
    expect(blocked.status()).toBe(403);
    expect((await blocked.json()).code ?? (await blocked.json()).errorCode).toBe('RESTAURANT_LOCKED');

    // Thanh toán → active
    const pay = await request.post(`${API_BASE}/subscriptions/pay`, {
      headers: auth(token),
      data: { restaurantId: pendingId, cycleMonths: 1 },
    });
    expect(pay.status()).toBe(200);

    const ok = await request.get(`${API_BASE}/tables/restaurant/${pendingId}`, {
      headers: auth(token),
    });
    expect(ok.status()).toBe(200);
  });
});
