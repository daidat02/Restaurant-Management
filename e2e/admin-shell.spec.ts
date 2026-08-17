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

  test('"Cài Đặt Chung" admin mở trang Cài Đặt — chỉ tab cá nhân + thông báo (ticket 05)', async ({
    page,
  }) => {
    await login(page, USERS.admin.email);
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
    await waitAuthPersisted(page, null);

    await page.getByRole('button', { name: /Cài Đặt Chung/ }).click();
    await expect(page).toHaveURL(/\/admin\/settings/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Cài Đặt' })).toBeVisible({ timeout: 10_000 });

    // Tab cá nhân có; tab cấu hình nhà hàng KHÔNG có với admin (ticket 05)
    await expect(page.getByRole('button', { name: 'Tài khoản' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Thông báo & Giao diện' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cửa hàng & Hệ thống' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Sơ đồ bàn' })).toHaveCount(0);

    // Nút đăng xuất ở cuối thanh bên
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

  test('manager "Cài Đặt Chung" mở trang Cài Đặt kèm tab cấu hình nhà hàng (ticket 05)', async ({
    page,
  }) => {
    await login(page, USERS.manager.email);
    await expect(page).toHaveURL(/\/manager/, { timeout: 15_000 });
    await waitAuthPersisted(page, '69fccba996a14809070b9ef2');

    await page.getByRole('button', { name: /Cài Đặt Chung/ }).click();
    await expect(page).toHaveURL(/\/manager\/settings/, { timeout: 10_000 });
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: 'Cài Đặt' })).toBeVisible({ timeout: 10_000 });

    // Manager thấy cá nhân + đủ tab cấu hình nhà hàng (ticket 05)
    await expect(main.getByRole('button', { name: 'Tài khoản' })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Cửa hàng & Hệ thống' })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Sơ đồ bàn' })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Thanh toán' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Đăng Xuất' })).toBeVisible();
  });
});
