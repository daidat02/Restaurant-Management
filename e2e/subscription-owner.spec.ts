import { test, expect } from '@playwright/test';
import { login, API_BASE, apiLogin } from './helpers';

const OWNER_EMAIL = 'owner.sub@nhamnhi.vn';

/**
 * T7 — Frontend chủ (admin toàn chuỗi): trang Thanh Toán & Gói.
 * Verify gói đang dùng + mức sử dụng X/Y + đổi gói (downgrade lên lịch cuối chu kỳ).
 */
test.describe('T7 — Billing chủ: gói hiện tại + X/Y + lên lịch hạ gói', () => {
  test('admin chủ: gói đang dùng + "Đang dùng X/Y" hiển thị', async ({ page }) => {
    await login(page, OWNER_EMAIL);
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
    await page.goto('/admin/billing');

    // Header + gói đang sử dụng
    await expect(
      page.getByRole('heading', { name: /Thanh Toán & Gói Dịch Vụ/ }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Gói đang sử dụng')).toBeVisible();

    // Mức sử dụng X/Y hiển thị (nhà hàng mặc định — NhamNhi Sub Basic, gói Cơ Bản)
    await expect(page.getByText('Bàn đang dùng').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Món đang dùng').first()).toBeVisible();
    await expect(page.getByText('Nhân viên đang dùng').first()).toBeVisible();
  });

  test('downgrade giữa chu kỳ: "Lên lịch hạ gói" → pendingPlanKey + badge áp dụng cuối kỳ', async ({ page, request }) => {
    await login(page, OWNER_EMAIL);
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
    await page.goto('/admin/billing');

    // Chọn nhà hàng "NhamNhi Sub Basic" (gói Cơ Bản, đang còn hạn)
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /NhamNhi Sub Basic/ }).click();

    // Card gói Miễn Phí hiển thị nút "Lên lịch hạ gói" (đang còn hạn)
    const freeCard = page.locator('div').filter({ hasText: /^Miễn Phí/ }).first();
    await expect(freeCard.getByRole('button', { name: 'Lên lịch hạ gói' })).toBeVisible({
      timeout: 15_000,
    });

    await freeCard.getByRole('button', { name: 'Lên lịch hạ gói' }).click();

    // Badge "Đã lên lịch hạ gói" xuất hiện trong Gói đang sử dụng
    await expect(page.getByText('Đã lên lịch hạ gói — áp dụng khi hết hạn chu kỳ')).toBeVisible({
      timeout: 15_000,
    });

    // API: pendingPlanKey đã lưu = free, không trừ tiền
    const token = await apiLogin(request, OWNER_EMAIL);
    const me = await request.get(`${API_BASE}/subscriptions/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(me.status()).toBe(200);
    const mine = ((await me.json()).data ?? []).find(
      (r: any) => r.name === 'NhamNhi Sub Basic',
    );
    expect(mine).toBeTruthy();
    expect(mine.pendingPlanKey).toBe('free');
    expect(mine.currentPlanKey).toBe('basic');
  });
});
