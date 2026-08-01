import { test, expect } from '@playwright/test';
import {
  login,
  waitAuthPersisted,
  apiLogin,
  USERS,
  SEED_IDS,
  API_BASE,
} from './helpers';

test.describe('T12 — Super-admin', () => {
  test('login SA → dashboard tổng quan + danh sách nhà hàng', async ({ page }) => {
    await login(page, USERS.superAdmin.email);
    await expect(page).toHaveURL(/\/super-admin/, { timeout: 15_000 });

    // Dashboard
    await expect(page.getByRole('heading', { name: 'Tổng Quan Hệ Thống' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('Tổng nhà hàng')).toBeVisible({ timeout: 20_000 });

    // Danh sách nhà hàng
    await page.goto('/super-admin/restaurants');
    await expect(page.getByRole('heading', { name: 'Quản Lý Nhà Hàng' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('NhamNhi Cơ Sở 1')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('NhamNhi Cơ Sở 2')).toBeVisible();
  });

  test('khóa nhà hàng Y → admin Y bị chặn khi gọi API', async ({ page, request }) => {
    // Super-admin khóa Y qua API (tránh phụ thuộc selector icon lock)
    const saToken = await apiLogin(request, USERS.superAdmin.email);
    const lockRes = await request.patch(`${API_BASE}/restaurants/status/${SEED_IDS.tenantY}`, {
      headers: { Authorization: `Bearer ${saToken}` },
      data: { status: 'inactive' },
    });
    expect(lockRes.status()).toBe(200);

    // Admin Y (đã chọn Y) gọi API data Y → bị chặn
    const adminYToken = await apiLogin(request, USERS.admin.email);
    const switchRes = await request.post(`${API_BASE}/auth/switch-tenant`, {
      headers: { Authorization: `Bearer ${adminYToken}` },
      data: { restaurantId: SEED_IDS.tenantY },
    });
    expect(switchRes.status()).toBe(200);
    const switched = (await switchRes.json()) as { data?: { accessToken?: string } };
    const yToken = switched?.data?.accessToken as string;

    const blockedRes = await request.get(`${API_BASE}/orders/restaurant/${SEED_IDS.tenantY}`, {
      headers: { Authorization: `Bearer ${yToken}` },
    });
    // Nhà hàng bị khóa → admin Y không lấy được data (401/403/404)
    expect([401, 403, 404]).toContain(blockedRes.status());

    // UI: admin Y login → chọn Y → thấy lỗi (không vào được dashboard bình thường)
    await login(page, USERS.admin.email);
    await expect(page).toHaveURL(/select-restaurant/, { timeout: 15_000 });
    await page.getByRole('button', { name: /NhamNhi Cơ Sở 2/ }).click();
    // Bị chặn: không đến /admin (redirect về login hoặc select-restaurant)
    await expect
      .poll(async () => page.url())
      .not.toMatch(/\/admin/, { timeout: 10_000 });

    // Mở khóa lại để không ảnh hưởng các test khác
    const unlockRes = await request.patch(
      `${API_BASE}/restaurants/status/${SEED_IDS.tenantY}`,
      {
        headers: { Authorization: `Bearer ${saToken}` },
        data: { status: 'active' },
      },
    );
    expect(unlockRes.status()).toBe(200);
  });
});
