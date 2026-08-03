import { test, expect } from '@playwright/test';
import { login, waitAuthPersisted, USERS } from './helpers';

/** Admin đăng nhập và vào /admin/logs. */
async function openLogsPage(page: import('@playwright/test').Page) {
  await login(page, USERS.admin.email);
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
  await waitAuthPersisted(page, null);

  await page.goto('/admin/logs');
  await expect(page.getByRole('heading', { name: 'Nhật Ký Hệ Thống' })).toBeVisible({
    timeout: 20_000,
  });
}

test.describe('T10 — /admin/logs: audit hành động + lịch sử thanh toán toàn chuỗi', () => {
  test('tab Hành Động hiển thị audit của chuỗi kèm tên chi nhánh', async ({ page }) => {
    await openLogsPage(page);

    // Audit seed: adminX tạo đơn ORD-X-001 tại NhamNhi Cơ Sở 1
    const row = page.getByRole('row').filter({ hasText: 'Tạo đơn ORD-X-001' });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row.getByText('NhamNhi Cơ Sở 1')).toBeVisible();
    await expect(row.getByText('Admin Test')).toBeVisible();
  });

  test('tab Thanh Toán hiển thị transaction thật của mọi chi nhánh + lọc theo chi nhánh', async ({
    page,
  }) => {
    await openLogsPage(page);

    await page.getByRole('button', { name: 'Thanh Toán', exact: true }).click();

    // Transaction seed: 299.000đ / 1 tháng cho cả 2 chi nhánh của adminX
    const payRow = page.getByRole('row').filter({ hasText: '299.000 ₫' });
    await expect(payRow.first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('row').filter({ hasText: 'NhamNhi Cơ Sở 1' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'NhamNhi Cơ Sở 2' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: '1 tháng' }).first()).toBeVisible();

    // Lọc theo chi nhánh: chọn cơ sở 2 → cơ sở 1 biến mất, cơ sở 2 còn lại
    await page.getByRole('combobox').first().selectOption({ label: 'NhamNhi Cơ Sở 2' });
    await expect(page.getByRole('row').filter({ hasText: 'NhamNhi Cơ Sở 1' })).toHaveCount(0);
    await expect(page.getByRole('row').filter({ hasText: 'NhamNhi Cơ Sở 2' })).toBeVisible();
  });
});
