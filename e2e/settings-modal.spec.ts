import { test, expect } from '@playwright/test';
import { login, waitAuthPersisted, USERS } from './helpers';

test.describe('T05 — Settings Modal phân quyền theo role (ticket 05)', () => {
  test('staff có "Cài Đặt Chung" — modal chỉ cá nhân + mật khẩu, không có tab nhà hàng', async ({
    page,
  }) => {
    await login(page, USERS.staff.email);
    await expect(page).toHaveURL(/\/staff/, { timeout: 15_000 });
    await waitAuthPersisted(page, '69fccba996a14809070b9ef2');

    await page.getByRole('button', { name: /Cài Đặt Chung/ }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Thông Tin Cá Nhân' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mật Khẩu & Bảo Mật' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Thông Tin Nhà Hàng' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Sơ Đồ & Tạo Bàn Mới' })).toHaveCount(0);
    // Ticket 07: staff không có tab cấu hình cổng thanh toán hệ thống
    await expect(page.getByRole('button', { name: 'Thanh Toán Hệ Thống' })).toHaveCount(0);
  });

  test('super-admin có "Cài Đặt Chung" — modal chỉ cá nhân + mật khẩu, không có tab nhà hàng', async ({
    page,
  }) => {
    await login(page, USERS.superAdmin.email);
    await expect(page).toHaveURL(/\/super-admin/, { timeout: 15_000 });
    await waitAuthPersisted(page, null);

    await page.getByRole('button', { name: /Cài Đặt Chung/ }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Thông Tin Cá Nhân' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mật Khẩu & Bảo Mật' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Thông Tin Nhà Hàng' })).toHaveCount(0);
    // Ticket 07: super-admin có tab cấu hình cổng thanh toán hệ thống
    await expect(page.getByRole('button', { name: 'Thanh Toán Hệ Thống' })).toBeVisible();
  });

  test('super-admin cấu hình cổng thanh toán hệ thống (PayOS + VNPay) — ticket 07', async ({
    page,
  }) => {
    await login(page, USERS.superAdmin.email);
    await expect(page).toHaveURL(/\/super-admin/, { timeout: 15_000 });
    await waitAuthPersisted(page, null);

    await page.getByRole('button', { name: /Cài Đặt Chung/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Thanh Toán Hệ Thống' }).click();

    const payos = page.locator('div.rounded-xl', { hasText: 'Cổng PayOS' });
    await expect(payos).toBeVisible({ timeout: 10_000 });
    await payos.locator('input').nth(0).fill('e2e-payos-client');
    await payos.locator('input').nth(1).fill('e2e-payos-api');
    await payos.locator('input').nth(2).fill('e2e-payos-checksum');

    const vnpay = page.locator('div.rounded-xl', { hasText: 'Cổng VNPay' });
    await expect(vnpay).toBeVisible();
    await vnpay.locator('input').nth(0).fill('E2EMERCHANT');
    await vnpay.locator('input').nth(1).fill('NHAM NHI E2E');
    await vnpay.locator('input').nth(2).fill('8888888888');
    await vnpay.locator('input').nth(3).fill('e2e-vnpay-api');
    await vnpay.locator('input').nth(4).fill('e2e-vnpay-checksum');

    await page.getByRole('button', { name: 'Lưu cấu hình' }).click();

    await expect(
      page.getByText('Đã lưu cấu hình cổng thanh toán hệ thống'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('nút Đăng Xuất ở cuối thanh bên modal — mọi role đăng xuất được (ticket 05)', async ({
    page,
  }) => {
    await login(page, USERS.staff.email);
    await expect(page).toHaveURL(/\/staff/, { timeout: 15_000 });
    await waitAuthPersisted(page, '69fccba996a14809070b9ef2');

    await page.getByRole('button', { name: /Cài Đặt Chung/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Đăng Xuất' }).click();

    // Sau logout → về landing page (route /auth cũ đã được thay bằng landing)
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
  });
});
