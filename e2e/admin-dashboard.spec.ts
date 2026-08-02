import { test, expect } from '@playwright/test';
import { login, waitAuthPersisted, USERS } from './helpers';

test.describe('T06 — Dashboard /admin: KPI gộp chuỗi + bảng cảnh báo thuê bao', () => {
  test('admin.test (2 cơ sở active) thấy dashboard KPI, không có cảnh báo thuê bao', async ({
    page,
  }) => {
    await login(page, USERS.admin.email);
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
    await waitAuthPersisted(page, null);

    // Dashboard analytic hiển thị
    await expect(page.getByRole('heading', { name: 'Báo Cáo & Phân Tích' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('Doanh Thu Tổng Kỳ Này')).toBeVisible({ timeout: 15_000 });

    // 2 cơ sở active → không có bảng cảnh báo thuê bao
    await expect(page.getByText(/Cảnh báo thuê bao/)).toHaveCount(0);
  });

  test('owner.sub (có cơ sở sắp hết hạn + bị khoá) thấy cảnh báo đúng chi nhánh', async ({
    page,
  }) => {
    await login(page, 'owner.sub@nhamnhi.vn');
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
    await waitAuthPersisted(page, null);

    await expect(page.getByRole('heading', { name: 'Báo Cáo & Phân Tích' })).toBeVisible({
      timeout: 20_000,
    });

    // Bảng cảnh báo: chi nhánh sắp hết hạn + bị khoá
    await expect(page.getByText(/Cảnh báo thuê bao/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('NhamNhi Sub Sắp Hết Hạn')).toBeVisible();
    await expect(page.getByText('NhamNhi Sub Bị Khoá')).toBeVisible();

    // Nút thanh toán điều hướng /admin/billing
    await page.getByRole('button', { name: /Thanh toán/ }).first().click();
    await expect(page).toHaveURL(/\/admin\/billing/, { timeout: 15_000 });
  });
});
