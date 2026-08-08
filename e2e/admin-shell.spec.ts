import { test, expect } from '@playwright/test';
import { login, waitAuthPersisted, USERS } from './helpers';

test.describe('T05 — Admin frontend shell: sidebar mới + Settings Modal', () => {
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
    for (const title of ['Nhật Ký Hệ Thống', 'Cài Đặt Chung', 'Tin Nhắn']) {
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

  test('"Cài Đặt Chung" admin mở Settings Modal — chỉ tab cá nhân + đăng xuất (ticket 05)', async ({
    page,
  }) => {
    await login(page, USERS.admin.email);
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
    await waitAuthPersisted(page, null);

    await page.getByRole('button', { name: /Cài Đặt Chung/ }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Tab cá nhân có; tab cấu hình nhà hàng KHÔNG có với admin (ticket 05)
    await expect(page.getByRole('button', { name: 'Thông Tin Cá Nhân' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mật Khẩu & Bảo Mật' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Thông Tin Nhà Hàng' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Sơ Đồ & Tạo Bàn Mới' })).toHaveCount(0);

    // Nút đăng xuất ở cuối thanh bên modal
    await expect(page.getByRole('button', { name: 'Đăng Xuất' })).toBeVisible();
  });

  test('avatar header là hiển thị tĩnh — click không mở modal (ticket 05)', async ({ page }) => {
    await login(page, USERS.admin.email);
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
    await waitAuthPersisted(page, null);

    await page.getByText('Admin Test').click();

    // Không mở bất kỳ dialog nào
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('manager "Cài Đặt Chung" mở Settings Modal kèm tab cấu hình nhà hàng (ticket 05)', async ({
    page,
  }) => {
    await login(page, USERS.manager.email);
    await expect(page).toHaveURL(/\/manager/, { timeout: 15_000 });
    await waitAuthPersisted(page, '69fccba996a14809070b9ef2');

    await page.getByRole('button', { name: /Cài Đặt Chung/ }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Manager thấy cá nhân + đủ tab cấu hình nhà hàng (ticket 05)
    await expect(page.getByRole('button', { name: 'Thông Tin Cá Nhân' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Thông Tin Nhà Hàng' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sơ Đồ & Tạo Bàn Mới' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cấu Hình Hóa Đơn' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Đăng Xuất' })).toBeVisible();
  });
});
