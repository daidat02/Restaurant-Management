import { test, expect } from '@playwright/test';
import { login, waitAuthPersisted, USERS } from './helpers';

test.describe('T07 — /admin/reports: so sánh chi nhánh với số liệu thật (bỏ mock data)', () => {
  test('admin.test (2 cơ sở) thấy bảng xếp hạng 2 chi nhánh từ DB, không còn mock', async ({
    page,
  }) => {
    await login(page, USERS.admin.email);
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
    await waitAuthPersisted(page, null);

    // Điều hướng sang trang Báo Cáo Nâng Cao
    await page.goto('/admin/reports');
    await expect(page.getByRole('heading', { name: 'Báo Cáo Nâng Cao' })).toBeVisible({
      timeout: 20_000,
    });

    // Bảng xếp hạng chi nhánh (admin) hiển thị data thật của cả 2 cơ sở seed
    await expect(page.getByText('Hiệu suất chuỗi chi nhánh')).toBeVisible({ timeout: 15_000 });
    const branchTable = page.getByRole('table');
    await expect(branchTable.getByText('NhamNhi Cơ Sở 1')).toBeVisible({ timeout: 15_000 });
    await expect(branchTable.getByText('NhamNhi Cơ Sở 2')).toBeVisible({ timeout: 15_000 });

    // Không còn mock data cũ của trang reports
    await expect(page.getByText('Cơ sở Quận 1')).toHaveCount(0);
    await expect(page.getByText('Lẩu Nấm Sườn Sụn Gia Truyền')).toHaveCount(0);
  });

  test('admin.test thấy cụm so sánh doanh thu các chi nhánh', async ({ page }) => {
    await login(page, USERS.admin.email);
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
    await waitAuthPersisted(page, null);

    await page.goto('/admin/reports');
    await expect(
      page.getByRole('heading', { name: 'Báo Cáo Nâng Cao' }),
    ).toBeVisible({ timeout: 20_000 });

    // Cụm so sánh doanh thu giữa các chi nhánh hiển thị (bảng xếp hạng trong ChartsSection)
    await expect(
      page.getByText('Xếp hạng doanh thu và sản lượng đơn hàng thực tế giữa các cơ sở nhà hàng'),
    ).toBeVisible({
      timeout: 15_000,
    });
  });
});
