import { test, expect } from '@playwright/test';

test('login admin thành công (smoke)', async ({ page }) => {
  await page.goto('/auth');

  await page.getByPlaceholder('Input email').fill('admin.test@nhamnhi.vn');
  await page.getByPlaceholder('Input password').fill('Test@NhamNhi2026');
  await page.getByRole('button', { name: 'Đăng Nhập', exact: true }).first().click();

  // Admin có nhiều nhà hàng, chưa chọn tenant -> được đưa tới màn hình chọn nhà hàng
  await expect(page).toHaveURL(/\/admin|\/select-restaurant/, { timeout: 15_000 });
});
