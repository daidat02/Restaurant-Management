import { test, expect } from '@playwright/test';
import { login, USERS } from './helpers';

test('login admin thành công (smoke)', async ({ page }) => {
  await login(page, USERS.admin.email);

  // Admin (chủ chuỗi, 2 cơ sở) → vào thẳng /admin, không còn màn hình chọn nhà hàng
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
});
