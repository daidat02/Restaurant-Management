import { test, expect, type Page } from '@playwright/test';
import { PASSWORD } from './helpers';

/** Đăng ký chủ mới qua form /auth/owner → tự đăng nhập → vào wizard. */
async function registerOwner(page: Page, email: string) {
  await page.goto('/auth/owner');
  // Giải thích giá rõ ràng cho người thuê
  await expect(page.getByText(/Miễn phí 30 ngày dùng thử/)).toBeVisible();

  await page.getByPlaceholder('Nguyễn Văn A').fill('Chủ Mới E2E');
  await page.getByPlaceholder('example@gmail.com').fill(email);
  await page.getByPlaceholder('0123456789').fill('0912345678');
  await page.getByPlaceholder('Tạo mật khẩu').fill(PASSWORD);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Tạo Tài Khoản' }).click();

  // Chuyển thẳng vào wizard tạo nhà hàng đầu tiên (không tính phí, bắt đầu trial)
  // Route /onboarding cấp cao nhất — blank layout (không Sidebar/Header).
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });
  await expect(page.getByText('Khởi tạo cơ sở mới')).toBeVisible();
}

test.describe('T9 — Đăng ký chủ + wizard nhà hàng đầu', () => {
  test('đăng ký owner → wizard tạo nhà hàng đầu (trial 30 ngày) → banner trial trên /admin', async ({ page }) => {
    const email = `owner.e2e.${Date.now()}@nhamnhi.vn`;
    await registerOwner(page, email);

    // Bước 1: thông tin nhà hàng
    await expect(page.getByText('Thông tin nhà hàng')).toBeVisible();
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

  test('link từ trang đăng nhập tới đăng ký chủ nhà hàng', async ({ page }) => {
    await page.goto('/auth');
    // LoginForm và SignUpForm cùng nằm trong DOM → cần .first() để chọn button của form đang hiển thị
    await page.getByRole('button', { name: 'Đăng ký tại đây' }).first().click();
    await expect(page).toHaveURL(/\/auth\/owner/);
    await expect(page.getByRole('heading', { name: 'Đăng Ký Chủ Nhà Hàng' })).toBeVisible();
  });
});
