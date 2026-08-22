import { test, expect } from '@playwright/test';
import {
  login,
  waitAuthPersisted,
  USERS,
  SEED_IDS,
} from './helpers';

test.describe('T04 — Admin & tenant sau redesign (bỏ /select-restaurant)', () => {
  test('admin (2 cơ sở) login → vào thẳng /admin, KHÔNG qua /select-restaurant', async ({ page }) => {
    await login(page, USERS.admin.email);
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
    expect(page.url()).not.toContain('select-restaurant');
  });

  test('đã đăng nhập mà mở lại /login hoặc /register → điều hướng ngay về trang chủ theo role', async ({ page }) => {
    // Login manager (role có home riêng /manager) rồi quay lại trang auth
    await login(page, USERS.manager.email);
    await expect(page).toHaveURL(/\/manager/, { timeout: 15_000 });

    await page.goto('/login');
    await expect(page).toHaveURL(/\/manager$/, { timeout: 10_000 });
    await page.goto('/register');
    await expect(page).toHaveURL(/\/manager$/, { timeout: 10_000 });
  });

  test('admin login → currentRestaurantId = null (quản toàn chuỗi)', async ({ page }) => {
    await login(page, USERS.admin.email);
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
    const auth = await waitAuthPersisted(page, null);
    expect(auth.currentRestaurantId).toBe(null);
  });

  test('manager chỉ có cơ sở X — tự chọn X, vào thẳng /manager', async ({ page }) => {
    await login(page, USERS.manager.email);
    // Manager có 1 nhà hàng → tự chọn X, không bị bắt qua switcher
    await expect(page).toHaveURL(/\/manager/, { timeout: 15_000 });
    await waitAuthPersisted(page, SEED_IDS.tenantX);
  });

  test('manager không đọc được data Y qua API', async ({ page, request }) => {
    // Login manager qua UI → token trong localStorage → gọi API data Y phải 403
    await login(page, USERS.manager.email);
    await expect(page).toHaveURL(/\/manager/, { timeout: 15_000 });
    const auth = await waitAuthPersisted(page, SEED_IDS.tenantX);
    const token = auth.token;
    expect(token).toBeTruthy();

    const res = await request.get(`${'http://localhost:8100/api'}/orders/${SEED_IDS.orderYActive}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
  });

  test('staff login → vào trang Đơn (không còn vào thẳng POS)', async ({ page }) => {
    await login(page, USERS.staff.email);
    await expect(page).toHaveURL(/\/staff\/orders$/, { timeout: 15_000 });
  });

  test('admin bị chặn URL /manager/menu/items → redirect về /admin', async ({ page }) => {
    await login(page, USERS.admin.email);
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
    await page.goto('/manager/menu/items');
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
  });

  test('manager bị chặn URL /admin/customers → redirect về /manager', async ({ page }) => {
    await login(page, USERS.manager.email);
    await expect(page).toHaveURL(/\/manager/, { timeout: 15_000 });
    await page.goto('/admin/customers');
    await expect(page).toHaveURL(/\/manager/, { timeout: 15_000 });
  });
});
