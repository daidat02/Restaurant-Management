import { test, expect } from '@playwright/test';
import { login, waitAuthPersisted, USERS } from './helpers';

/** Admin vào /admin/restaurants (danh sách chi nhánh dạng card). */
async function openRestaurantsPage(page: import('@playwright/test').Page) {
  await login(page, USERS.admin.email);
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
  await waitAuthPersisted(page, null);

  await page.goto('/admin/restaurants');
  await expect(page.getByRole('heading', { name: 'Nhà Hàng' })).toBeVisible({
    timeout: 20_000,
  });
}

/** Mở trang quản lý 1 chi nhánh (card → /admin/restaurants/:id, tab Cửa hàng mặc định). */
async function openBranchStore(page: import('@playwright/test').Page, branchName: string) {
  await page.getByText(branchName, { exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/restaurants\/[0-9a-f]{24}/, { timeout: 15_000 });
  // Tab Cửa hàng mặc định → input tên cửa hàng hiển thị đúng chi nhánh
  await expect(page.locator(`input[value="${branchName}"]`)).toBeVisible({ timeout: 15_000 });
}

test.describe('T09 — /admin/restaurants: quản lý chi nhánh theo từng cơ sở', () => {
  test('admin mở quản lý "NhamNhi Cơ Sở 2" → input hồ sơ hiển thị đúng cơ sở 2', async ({
    page,
  }) => {
    await openRestaurantsPage(page);

    await openBranchStore(page, 'NhamNhi Cơ Sở 2');

    // Chỉ hiển thị cơ sở 2, không phải cơ sở 1
    await expect(page.locator('input[value="NhamNhi Cơ Sở 1"]')).toHaveCount(0);
  });

  test('admin đổi tên chi nhánh "NhamNhi Cơ Sở 1" → chỉ cơ sở 1 đổi, cơ sở 2 giữ nguyên', async ({
    page,
  }) => {
    const newName = `NhamNhi Cơ Sở 1 E2E ${Date.now()}`;
    await openRestaurantsPage(page);

    // Mở quản lý cơ sở 1, đổi tên và lưu
    await page.getByText('NhamNhi Cơ Sở 1', { exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/restaurants\/[0-9a-f]{24}/, { timeout: 15_000 });

    const nameInput = page.locator('input[value="NhamNhi Cơ Sở 1"]');
    await expect(nameInput).toBeVisible({ timeout: 15_000 });
    await nameInput.fill(newName);

    await page.getByRole('button', { name: 'Lưu cài đặt' }).click();
    await expect(page.getByText('Cập nhật nhà hàng thành công')).toBeVisible({
      timeout: 15_000,
    });

    // Reload danh sách để xác nhận phía server đã lưu
    await page.goto('/admin/restaurants');
    await expect(page.getByText(newName)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('NhamNhi Cơ Sở 1', { exact: true })).toHaveCount(0);
    await expect(page.getByText('NhamNhi Cơ Sở 2', { exact: true })).toBeVisible();
  });
});
