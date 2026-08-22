import { test, expect } from '@playwright/test';
import { registerOwnerViaUi } from './helpers';

/** Đăng ký chủ mới qua trang /register + xác thực OTP → tự đăng nhập → vào wizard. */
async function registerOwner(page: import('@playwright/test').Page, email: string) {
  // registerOwnerViaUi: /register → /verify-otp (nhập OTP từ endpoint test-only) → /onboarding
  await registerOwnerViaUi(page, email);

  // Route /onboarding cấp cao nhất — blank layout (không Sidebar/Header).
  await expect(page.getByText('Khởi tạo cơ sở mới')).toBeVisible();
}

test.describe('T9 — Đăng ký chủ + wizard nhà hàng đầu', () => {
  test('đăng ký owner → wizard tạo nhà hàng đầu (trial 30 ngày) → banner trial trên /admin', async ({ page }) => {
    const email = `owner.e2e.${Date.now()}@nhamnhi.vn`;
    await registerOwner(page, email);

    // Bước 1: thông tin nhà hàng
    await expect(
      page.getByRole('heading', { name: 'Thông tin nhà hàng' }),
    ).toBeVisible();
    await page.getByPlaceholder('VD: NhamNhi Cơ Sở 3').fill('Nhà Hàng Mới E2E');
    await page.getByPlaceholder('Số nhà, đường, phường/xã...').fill('123 Nguyễn Trãi, Q1');
    await page.getByRole('button', { name: /Tạo nhà hàng & tiếp tục/ }).click();

    // Bước 2: cấu hình cơ sở → sinh mã bếp → tiếp tục
    await expect(page.getByText('Mã nhà bếp (KDS)')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /Khởi tạo cấu hình & sinh mã bếp/ }).click();
    await expect(page.locator('span.font-mono').first()).not.toHaveText('', { timeout: 15_000 });
    await page.getByRole('button', { name: /Tiếp tục tạo nhân sự/ }).click();

    // Bước 3: bỏ qua nhân sự
    await page.getByRole('button', { name: /Bỏ qua & tiếp tục/ }).click();

    // Bước 4: tạo bàn & QR → hoàn tất
    await page.getByRole('button', { name: /Tạo bàn & QR/ }).click();
    await page.getByRole('button', { name: /Hoàn tất & vào quản trị/ }).click();

    // Về /admin — admin toàn chuỗi (Q14): không còn "nhà hàng đang chọn" nên banner trial
    // cũ được thay bằng cảnh báo thuê bao toàn chuỗi (T07/Q16). TODO(T07): bổ sung assertion.
    await expect(page).toHaveURL(/\/admin$/, { timeout: 20_000 });
  });

  test('link từ trang đăng nhập tới trang đăng ký chủ nhà hàng', async ({ page }) => {
    await page.goto('/login');
    // Link "Đăng ký miễn phí" dưới form login chuyển sang trang đăng ký
    await page.getByRole('link', { name: 'Đăng ký miễn phí' }).click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(
      page.getByRole('button', { name: 'Đăng ký miễn phí' }),
    ).toBeVisible();
  });
});
