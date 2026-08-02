import { test, expect } from '@playwright/test';
import { login, waitAuthPersisted, USERS } from './helpers';

test.describe('T05 — Admin frontend shell: sidebar mới + modal tài khoản', () => {
  test('admin thấy menu quản trị mới, không còn menu vận hành', async ({ page }) => {
    await login(page, USERS.admin.email);
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
    await waitAuthPersisted(page, null);

    // Menu mới theo Q3 (general)
    for (const title of [
      'Tổng Quan Hệ Thống',
      'Quản Lý Nhà Hàng',
      'Báo Cáo Kinh Doanh',
      'Người Dùng Hệ Thống',
      'Thanh Toán & Gói',
    ]) {
      await expect(page.getByRole('button', { name: new RegExp(title) })).toBeVisible();
    }

    // Menu tools: Audit Logs, Cài Đặt Chung, Tin Nhắn
    for (const title of ['Audit Logs', 'Cài Đặt Chung', 'Tin Nhắn']) {
      await expect(page.getByRole('button', { name: new RegExp(title) })).toBeVisible();
    }

    // Không còn menu vận hành (POS/menu/tables/orders/reservations)
    for (const forbidden of [
      'Gọi Món (POS)',
      'Quản Lý Thực Đơn',
      'Sơ Đồ Bàn',
      'Đơn Hiện Tại',
      'Lịch Đặt Bàn',
    ]) {
      await expect(page.getByRole('button', { name: new RegExp(forbidden) })).toHaveCount(0);
    }
  });

  test('"Cài Đặt Chung" admin mở modal tài khoản cá nhân', async ({ page }) => {
    await login(page, USERS.admin.email);
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
    await waitAuthPersisted(page, null);

    await page.getByRole('button', { name: /Cài Đặt Chung/ }).click();

    await expect(page.getByText('Tài Khoản Cá Nhân')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /Đăng xuất/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Thông Tin Cá Nhân/ })).toBeVisible();
  });

  test('avatar header mở modal tài khoản cá nhân', async ({ page }) => {
    await login(page, USERS.admin.email);
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
    await waitAuthPersisted(page, null);

    await page.getByRole('button', { name: /Admin Test/ }).click();

    await expect(page.getByText('Tài Khoản Cá Nhân')).toBeVisible({ timeout: 10_000 });
    // Tab đổi mật khẩu
    await page.getByRole('button', { name: /Đổi Mật Khẩu/ }).click();
    await expect(page.getByPlaceholder('••••••••').first()).toBeVisible();
  });

  test('manager giữ "Cài Đặt Nhà Hàng" → SettingModal', async ({ page }) => {
    await login(page, USERS.manager.email);
    await expect(page).toHaveURL(/\/manager/, { timeout: 15_000 });
    await waitAuthPersisted(page, '69fccba996a14809070b9ef2');

    await page.getByRole('button', { name: /Cài Đặt Nhà Hàng/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
  });
});
