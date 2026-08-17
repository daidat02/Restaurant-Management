import { test, expect, type Page } from '@playwright/test';
import { login, waitAuthPersisted, USERS, SEED_IDS, PASSWORD } from './helpers';

/** Tạo manager qua UI admin (form wizard 3 bước): chọn role + nhà hàng, trả email đã tạo. */
async function createManagerViaAdmin(page: Page, restaurantName: string, email: string) {
  await login(page, USERS.admin.email);
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
  await waitAuthPersisted(page, null);

  await page.goto('/admin/customers');
  await expect(page.getByRole('heading', { name: 'Quản Lý Người Dùng' })).toBeVisible({
    timeout: 20_000,
  });

  // Mở form tạo
  await page.getByRole('button', { name: /Thêm nhân viên/ }).click();
  await expect(page).toHaveURL(/\/admin\/customers\/new/, { timeout: 15_000 });

  // Bước 1 (Tài khoản): thông tin + vai trò + nhà hàng + mật khẩu
  await page.getByPlaceholder('Nguyễn Văn A').fill('Manager E2E');
  await page.getByPlaceholder('example@gmail.com').fill(email);
  await page.getByPlaceholder('090xxxxxxx').fill('0911111222');

  // Chọn nhà hàng (bắt buộc) — combobox thứ 2 (thứ 1 là vai trò, mặc định Manager)
  await page.getByRole('combobox').nth(1).click();
  await page.getByRole('option', { name: restaurantName }).click();

  await page.getByPlaceholder('Nhập mật khẩu').fill(PASSWORD);
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
  await page.getByRole('button', { name: 'Tiếp theo' }).click();

  // Bước 2 (Nhân sự): bỏ qua
  await page.getByRole('button', { name: 'Tiếp theo' }).click();

  // Bước 3 (Liên hệ khẩn cấp): hoàn tất tạo
  await page.getByRole('button', { name: 'Hoàn tất tạo' }).click();

  // Về lại danh sách + toast thành công
  await expect(page).toHaveURL(/\/admin\/customers$/, { timeout: 15_000 });
  await expect(page.getByText('Tạo nhân viên thành công').first()).toBeVisible({
    timeout: 15_000,
  });
}

test.describe('T08 — /admin/customers: chỉ quản manager, bỏ tab khách, tạo manager chọn cơ sở', () => {
  test('admin không còn tab Khách Hàng, chỉ thấy Nhân viên', async ({ page }) => {
    await login(page, USERS.admin.email);
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
    await waitAuthPersisted(page, null);

    await page.goto('/admin/customers');
    await expect(page.getByRole('heading', { name: 'Quản Lý Người Dùng' })).toBeVisible({
      timeout: 20_000,
    });

    // Không còn tab Khách hàng
    await expect(page.getByRole('button', { name: /Khách hàng/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Thêm nhân viên/ })).toBeVisible();

    // Admin thấy danh sách manager/admin theo chuỗi
    await expect(page.getByText('Manager Test')).toBeVisible({ timeout: 15_000 });
  });

  test('admin tạo manager chọn "NhamNhi Cơ Sở 2" → manager login vào thẳng cơ sở 2', async ({
    page,
    browser,
  }) => {
    const email = `manager.e2e.${Date.now()}@nhamnhi.vn`;
    await createManagerViaAdmin(page, 'NhamNhi Cơ Sở 2', email);

    // Đăng nhập bằng tài khoản manager vừa tạo ở CONTEXT riêng (tránh share localStorage)
    const managerContext = await browser.newContext();
    const managerPage = await managerContext.newPage();
    await login(managerPage, email);
    await expect(managerPage).toHaveURL(/\/manager/, { timeout: 15_000 });

    // Vào thẳng cơ sở 2 (restaurantIds[0] = tenantY) — không qua màn hình chọn nhà hàng
    const auth = await waitAuthPersisted(managerPage, SEED_IDS.tenantY);
    expect(auth?.currentRestaurantId).toBe(SEED_IDS.tenantY);
    await managerContext.close();
  });
});
