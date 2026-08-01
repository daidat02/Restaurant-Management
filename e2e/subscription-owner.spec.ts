import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers';

const OWNER_EMAIL = 'owner.sub@nhamnhi.vn';

/** Đăng nhập ownerSub (3 nhà hàng) rồi chọn 1 nhà hàng ở switcher → /admin. */
async function loginOwnerAndSelect(page: Page, restaurantName: string) {
  await login(page, OWNER_EMAIL);
  await expect(page).toHaveURL(/select-restaurant/, { timeout: 15_000 });
  await page.getByRole('button', { name: restaurantName }).click();
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
}

test.describe('T7 — Frontend chủ: banner trạng thái, badge, modal trả phí, billing', () => {
  test('banner 3 trạng thái theo nhà hàng đang chọn (trial / sắp hết / bị khoá)', async ({ page }) => {
    // 1. Trial còn nhiều ngày → banner xanh
    await loginOwnerAndSelect(page, 'NhamNhi Sub Trial');
    await expect(page.getByText(/đang dùng thử miễn phí — còn lại/)).toBeVisible({ timeout: 15_000 });

    // 2. Trial sắp hết hạn (≤7 ngày) → banner cam
    await page.goto('/select-restaurant');
    await page.getByRole('button', { name: 'NhamNhi Sub Sắp Hết Hạn' }).click();
    await expect(page.getByText(/Trial sắp hết hạn — còn/)).toBeVisible({ timeout: 15_000 });

    // 3. Bị khoá → banner đỏ
    await page.goto('/select-restaurant');
    await page.getByRole('button', { name: 'NhamNhi Sub Bị Khoá' }).click();
    await expect(page.getByText(/đã bị khoá do hết hạn thanh toán/)).toBeVisible({ timeout: 15_000 });
  });

  test('trang nhà hàng hiện badge trạng thái + modal trả phí khi mở nhà hàng 2+', async ({ page }) => {
    await loginOwnerAndSelect(page, 'NhamNhi Sub Trial');
    await page.goto('/admin/restaurants');

    // Badge trạng thái cho nhà hàng của chủ
    await expect(page.getByText('Trial').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Bị khoá', { exact: true })).toBeVisible();

    // Chủ đã có nhà hàng → "Thêm nhà hàng" mở modal trả phí (không vào wizard)
    await page.getByRole('button', { name: /Thêm nhà hàng/ }).click();
    await expect(page.getByText('Mở nhà hàng mới (trả phí)')).toBeVisible();
    await expect(page.getByRole('button', { name: /Thanh toán & Tạo/ })).toBeVisible();
  });

  test('billing mock: thanh toán 299.000đ mở lại nhà hàng bị khoá → màn thành công', async ({ page }) => {
    await loginOwnerAndSelect(page, 'NhamNhi Sub Bị Khoá');
    await page.goto('/admin/billing');

    await expect(page.getByRole('heading', { name: 'Thanh Toán & Gia Hạn' })).toBeVisible({ timeout: 15_000 });

    // Mặc định chọn nhà hàng bị khoá; chọn chu kỳ 1 tháng → tổng 299.000đ
    await page.getByRole('button', { name: /1 tháng/ }).click();
    await page.getByRole('button', { name: /Thanh toán 299.000đ/ }).click();

    // Màn thanh toán thành công
    await expect(page.getByText('Thanh toán thành công')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('NhamNhi Sub Bị Khoá', { exact: true })).toBeVisible();

    // Giao dịch mới xuất hiện trong lịch sử (bảng giao dịch)
    await page.getByRole('button', { name: /Xem lịch sử giao dịch/ }).click();
    await expect(page.getByRole('cell', { name: '299.000đ' })).toBeVisible();
  });
});
