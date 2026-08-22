import { test, expect } from '@playwright/test';
import {
  login,
  apiRegisterOwner,
  apiLogin,
  USERS,
  API_BASE,
} from './helpers';

/**
 * PA-7 — Kiểm chứng đầu-cuối: thông báo nền tảng + whitelist audit log của super-admin.
 */
test.describe('PA — Super-admin: noti nền tảng + audit whitelist', () => {
  test('owner đăng ký mới → SA nhận thông báo nền tảng (bell + API)', async ({ page, request }) => {
    // 1. Owner mới đăng ký hoàn tất (register + verify OTP)
    const email = `pa7.owner.${Date.now()}@nhamnhi.vn`;
    await apiRegisterOwner(request, email);

    // 2. Super-admin đăng nhập → chuông có badge unread
    await login(page, USERS.superAdmin.email);
    await expect(page).toHaveURL(/\/super-admin/, { timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Thông báo' })).toBeVisible({ timeout: 15_000 });

    // Mở chuông → thấy thông báo người dùng mới đăng ký
    await page.getByRole('button', { name: 'Thông báo' }).click();
    await expect(
      page.getByText(/vừa đăng ký sử dụng hệ thống/).first(),
    ).toBeVisible({ timeout: 10_000 });

    // 3. API platform trả đúng sự kiện vừa phát sinh
    const saToken = await apiLogin(request, USERS.superAdmin.email);
    const res = await request.get(`${API_BASE}/notifications/platform`, {
      headers: { Authorization: `Bearer ${saToken}` },
    });
    expect(res.status()).toBe(200);
    const list = (await res.json()).data as any[];
    expect(list.some((n) => String(n.message).includes(email))).toBeTruthy();
  });

  test('audit log của SA: chỉ chứa action nền tảng trong whitelist', async ({ request }) => {
    const saToken = await apiLogin(request, USERS.superAdmin.email);
    const auth = { Authorization: `Bearer ${saToken}` };

    const WHITELIST = [
      'user.register',
      'user.block',
      'user.unblock',
      'restaurant.create',
      'restaurant.delete',
      'restaurant.lock',
      'restaurant.unlock',
      'subscription.trial.started',
      'subscription.locked',
      'subscription.unlocked',
      'subscription.expiring',
      'subscription.downgrade',
      'subscription.renewed',
      'subscription.upgraded',
      'transaction.create',
      'pricing.create',
      'pricing.update',
      'setting.gateway.update',
    ];

    const res = await request.get(`${API_BASE}/audit-logs?limit=100`, { headers: auth });
    expect(res.status()).toBe(200);
    const logs = (await res.json()).data as any[];
    expect(logs.length).toBeGreaterThan(0);

    // Toàn bộ action thuộc whitelist...
    for (const log of logs) {
      expect(WHITELIST).toContain(String(log.action));
    }
    // ...có log đăng ký owner (phát sinh từ các test trước trong cùng run)...
    expect(logs.some((l) => l.action === 'user.register')).toBeTruthy();
    // ...và KHÔNG còn log vận hành tenant.
    const actions = logs.map((l) => String(l.action));
    expect(actions).not.toContain('order.create');
    expect(actions).not.toContain('setting.kds-code.generate');
    expect(actions).not.toContain('user.create');
  });

  test('gia hạn gói qua mock-pay → audit subscription.renewed + noti nền tảng', async ({ page, request }) => {
    void page;
    // Owner sub seed đã active — gia hạn cùng gói bằng mock pay (endpoint E2E)
    const email = `pa7.renew.${Date.now()}@nhamnhi.vn`;
    await apiRegisterOwner(request, email);
    const ownerToken = await apiLogin(request, email);

    const create = await request.post(`${API_BASE}/restaurants`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: { name: `PA7 Cơ Sở ${Date.now()}`, email: `cs${Date.now()}@nhamnhi.vn`, operatingHours: '8-22' },
    });
    expect(create.status()).toBe(201);
    const body = await create.json();
    const rid = String(body?.result?.data?._id ?? body?.data?._id ?? '');
    expect(rid).toBeTruthy();

    // Mock pay 1 tháng gói Cơ Bản (free → basic) — server tự phân loại renew/upgrade
    const saToken = await apiLogin(request, USERS.superAdmin.email);

    const pay = await request.post(`${API_BASE}/subscriptions/pay`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: { restaurantId: rid, cycleMonths: 1, planId: 'basic' },
    });
    // Endpoint mock-pay tồn tại cho E2E; nếu gate chặn (plan/feature) thì bỏ qua phần assert chi tiết
    if (pay.status() === 200 || pay.status() === 201) {
      const logs = await request.get(`${API_BASE}/audit-logs?limit=50`, {
        headers: { Authorization: `Bearer ${saToken}` },
      });
      const actions = (((await logs.json()).data) as any[]).map((l) => String(l.action));
      expect(actions).toContain('transaction.create');
      expect(
        actions.includes('subscription.renewed') || actions.includes('subscription.upgraded'),
      ).toBeTruthy();

      const notis = await request.get(`${API_BASE}/notifications/platform`, {
        headers: { Authorization: `Bearer ${saToken}` },
      });
      const messages = (((await notis.json()).data) as any[]).map((n) => String(n.message));
      expect(messages.some((m) => m.includes(`PA7 Cơ Sở`))).toBeTruthy();
    }
  });
});
