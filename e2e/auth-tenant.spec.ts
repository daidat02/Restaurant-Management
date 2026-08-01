import { test, expect } from '@playwright/test';
import {
  login,
  loginAdminAndSelect,
  waitAuthPersisted,
  USERS,
  SEED_IDS,
} from './helpers';

test.describe('T12 — Auth & tenant switcher', () => {
  test('admin login → /select-restaurant hiện 2 cơ sở', async ({ page }) => {
    await login(page, USERS.admin.email);
    await expect(page).toHaveURL(/select-restaurant/, { timeout: 15_000 });
    await expect(page.getByRole('button', { name: /NhamNhi Cơ Sở 1/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /NhamNhi Cơ Sở 2/ })).toBeVisible();
  });

  test('chọn cơ sở Y → vào /admin, reload giữ Y (redux-persist)', async ({ page }) => {
    await loginAdminAndSelect(page, /NhamNhi Cơ Sở 2/);
    await waitAuthPersisted(page, SEED_IDS.tenantY);

    await page.reload();
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
    await waitAuthPersisted(page, SEED_IDS.tenantY);
  });

  test('manager chỉ có cơ sở X — không thấy Y ở switcher', async ({ page }) => {
    await login(page, USERS.manager.email);
    // Manager có 1 nhà hàng → tự chọn X, không bị bắt qua switcher
    await expect(page).toHaveURL(/\/manager/, { timeout: 15_000 });
    await waitAuthPersisted(page, SEED_IDS.tenantX);
  });

  test('manager không đọc được data Y qua API', async ({ page, request }) => {
    // Login manager qua UI → token trong localStorage → gọi API data Y phải 403
    await login(page, USERS.manager.email);
    await expect(page).toHaveURL(/\/manager/, { timeout: 15_000 });
    const auth = await waitAuthPersisted(page, SEED_IDS.tenantX);
    const token = auth.token;
    expect(token).toBeTruthy();

    const res = await request.get(`${'http://localhost:8100/api'}/orders/${SEED_IDS.orderYActive}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
  });

  test('staff login → vào POS tự động (cơ sở X)', async ({ page }) => {
    await login(page, USERS.staff.email);
    await expect(page).toHaveURL(/\/staff\/orders\/pos/, { timeout: 15_000 });
  });
});
