import { test, expect } from '@playwright/test';
import { login, waitAuthPersisted, USERS } from './helpers';

/** Admin vào /admin/restaurants rồi trả về row tương ứng với tên chi nhánh. */
async function openRestaurantsPage(page: import('@playwright/test').Page) {
  await login(page, USERS.admin.email);
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
  await waitAuthPersisted(page, null);

  await page.goto('/admin/restaurants');
  await expect(page.getByRole('heading', { name: 'Quản Lý Nhà Hàng' })).toBeVisible({
    timeout: 20_000,
  });
}

test.describe('T09 — /admin/restaurants: nút Cài Đặt mở SettingModal đúng chi nhánh', () => {
  test('admin mở Cài Đặt chi nhánh "NhamNhi Cơ Sở 2" → input hồ sơ hiển thị đúng cơ sở 2', async ({
    page,
  }) => {
    await openRestaurantsPage(page);

    // Bấm nút Cài Đặt trong dòng "NhamNhi Cơ Sở 2"
    const rowY = page.getByRole('row').filter({ hasText: 'NhamNhi Cơ Sở 2' });
    await rowY.getByTitle('Cài đặt chi nhánh').click();

    // Tab Hồ sơ mở sẵn → tên chi nhánh phải là cơ sở 2 (override đúng, không phải cơ sở 1)
    await expect(page.locator('input[value="NhamNhi Cơ Sở 2"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('input[value="NhamNhi Cơ Sở 1"]')).toHaveCount(0);

    // Đóng modal
    await page.getByLabel('Close modal').click();
    await expect(page.locator('input[value="NhamNhi Cơ Sở 2"]')).toHaveCount(0);
  });

  test('admin đổi tên chi nhánh "NhamNhi Cơ Sở 1" → chỉ cơ sở 1 đổi, cơ sở 2 giữ nguyên', async ({
    page,
  }) => {
    const newName = `NhamNhi Cơ Sở 1 E2E ${Date.now()}`;
    await openRestaurantsPage(page);

    // Mở Cài Đặt cơ sở 1, đổi tên và lưu
    const rowX = page.getByRole('row').filter({ hasText: 'NhamNhi Cơ Sở 1' });
    await rowX.getByTitle('Cài đặt chi nhánh').click();

    const nameInput = page.locator('input[value="NhamNhi Cơ Sở 1"]');
    await expect(nameInput).toBeVisible({ timeout: 15_000 });
    await nameInput.fill(newName);

    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(page.getByText('Cập nhật nhà hàng thành công')).toBeVisible({
      timeout: 15_000,
    });

    // Đóng modal và reload danh sách để xác nhận phía server đã lưu
    await page.getByLabel('Close modal').click();
    await page.reload();
    await expect(page.getByText(newName)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('NhamNhi Cơ Sở 1', { exact: true })).toHaveCount(0);
    await expect(page.getByText('NhamNhi Cơ Sở 2', { exact: true })).toBeVisible();
  });
});
