import { test, expect } from '@playwright/test';
import { login, waitAuthPersisted, USERS } from './helpers';

/**
 * T05 — Cài Đặt Chung phân quyền theo role (Settings PAGE hiện tại).
 * Tab theo role: staff = Tài khoản + Thông báo; super-admin = Tài khoản + Phân quyền + Nền tảng + Hạ tầng.
 */
test.describe('T05 — Cài Đặt Chung phân quyền theo role', () => {
  test('staff "Cài Đặt Chung" → trang cài đặt chỉ cá nhân + thông báo, không có tab nhà hàng', async ({
    page,
  }) => {
    await login(page, USERS.staff.email);
    await expect(page).toHaveURL(/\/staff/, { timeout: 15_000 });
    await waitAuthPersisted(page, '69fccba996a14809070b9ef2');

    await page.getByRole('button', { name: /Cài Đặt Chung/ }).click();
    await expect(page).toHaveURL(/\/staff\/settings/, { timeout: 10_000 });
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: 'Cài Đặt' })).toBeVisible({ timeout: 10_000 });

    // Tab cá nhân + thông báo có
    await expect(main.getByRole('button', { name: 'Tài khoản' })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Thông báo & Giao diện' })).toBeVisible();
    // Tab cấu hình nhà hàng KHÔNG có với staff
    await expect(main.getByRole('button', { name: 'Cửa hàng & Hệ thống' })).toHaveCount(0);
    await expect(main.getByRole('button', { name: 'Sơ đồ bàn' })).toHaveCount(0);
    await expect(main.getByRole('button', { name: 'Thanh toán' })).toHaveCount(0);
  });

  test('super-admin "Cài Đặt Chung" → tab cá nhân + phân quyền + nền tảng, không có tab nhà hàng', async ({
    page,
  }) => {
    await login(page, USERS.superAdmin.email);
    await expect(page).toHaveURL(/\/super-admin/, { timeout: 15_000 });
    await waitAuthPersisted(page, null);

    await page.getByRole('button', { name: /Cài Đặt Chung/ }).click();
    await expect(page).toHaveURL(/\/super-admin\/settings/, { timeout: 10_000 });
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: 'Cài Đặt' })).toBeVisible({ timeout: 10_000 });

    await expect(main.getByRole('button', { name: 'Tài khoản' })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Phân quyền & Vai trò' })).toBeVisible();
    // Tab cấu hình cổng thanh toán hệ thống
    await expect(main.getByRole('button', { name: 'Nền tảng' })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Hệ thống & Hạ tầng' })).toBeVisible();
    // Không có tab nhà hàng
    await expect(main.getByRole('button', { name: 'Cửa hàng & Hệ thống' })).toHaveCount(0);
    await expect(main.getByRole('button', { name: 'Sơ đồ bàn' })).toHaveCount(0);
  });

  test('super-admin cấu hình cổng thanh toán hệ thống (PayOS + VNPay) — tab Nền tảng', async ({
    page,
  }) => {
    await login(page, USERS.superAdmin.email);
    await expect(page).toHaveURL(/\/super-admin/, { timeout: 15_000 });
    await waitAuthPersisted(page, null);

    await page.getByRole('button', { name: /Cài Đặt Chung/ }).click();
    await expect(page).toHaveURL(/\/super-admin\/settings/, { timeout: 10_000 });

    // Vào tab Nền tảng
    await page.getByRole('button', { name: 'Nền tảng' }).click();

    // Bật toggle PayOS + VNPay (mặc định tắt khi chưa có cấu hình)
    const payosCard = page.locator('div.rounded-2xl').filter({ hasText: 'Cổng PayOS' });
    await expect(payosCard).toBeVisible({ timeout: 10_000 });
    await payosCard.getByRole('switch').click();

    await payosCard.getByPlaceholder('Nhập Client ID PayOS').fill('e2e-payos-client');
    await payosCard.getByPlaceholder('Nhập API Key PayOS').fill('e2e-payos-api');
    await payosCard.getByPlaceholder('Nhập Checksum Key PayOS').fill('e2e-payos-checksum');

    // VNPay: bật toggle rồi điền
    await page.getByRole('switch').nth(1).click();
    await page.getByPlaceholder('VD: VNP00000001').fill('E2EMERCHANT');
    await page.getByPlaceholder('VD: 10123456789').fill('8888888888');
    await page.getByPlaceholder('Tên chủ tài khoản').fill('NHAM NHI E2E');
    await page.getByPlaceholder('Nhập API Key VNPay').fill('e2e-vnpay-api');
    await page.getByPlaceholder('Nhập Checksum Key VNPay').fill('e2e-vnpay-checksum');

    // Lưu qua nút cố định của trang cài đặt
    await page.getByRole('button', { name: 'Lưu cài đặt' }).click();
    await expect(
      page.getByText('Đã lưu cấu hình cổng thanh toán hệ thống'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('nút Đăng Xuất ở cuối thanh bên — mọi role đăng xuất được', async ({ page }) => {
    await login(page, USERS.staff.email);
    await expect(page).toHaveURL(/\/staff/, { timeout: 15_000 });
    await waitAuthPersisted(page, '69fccba996a14809070b9ef2');

    await page.getByRole('button', { name: 'Đăng Xuất' }).click();

    // Sau logout → về landing page (route /auth cũ đã được thay bằng landing)
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
  });
});
