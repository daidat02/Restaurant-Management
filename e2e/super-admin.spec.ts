import { test, expect } from '@playwright/test';
import {
  login,
  apiLogin,
  USERS,
  SEED_IDS,
  API_BASE,
  PASSWORD,
} from './helpers';

test.describe('T12 — Super-admin', () => {
  test('login SA → dashboard KPI + tenants + pricing + transactions + audit', async ({ page }) => {
    await login(page, USERS.superAdmin.email);
    await expect(page).toHaveURL(/\/super-admin/, { timeout: 15_000 });

    // Dashboard: heading + KPI theo mô hình subscription
    await expect(page.getByRole('heading', { name: 'Tổng Quan Hệ Thống' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('Nhà hàng hoạt động')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Tổng chủ thuê')).toBeVisible();

    // Người thuê (chủ nhà hàng)
    await page.goto('/super-admin/tenants');
    await expect(page.getByRole('heading', { name: 'Tài Khoản Người Thuê' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('Admin Test')).toBeVisible({ timeout: 15_000 });

    // Gói cước & giá
    await page.goto('/super-admin/pricing');
    await expect(page.getByRole('heading', { name: 'Gói Cước & Giá' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('1 tháng').first()).toBeVisible();

    // Lịch sử giao dịch
    await page.goto('/super-admin/transactions');
    await expect(page.getByRole('heading', { name: 'Lịch Sử Giao Dịch' })).toBeVisible({
      timeout: 20_000,
    });

    // Nhật ký hệ thống (audit log — không còn trang vận hành nhà hàng)
    await page.goto('/super-admin/audit');
    await expect(page.getByRole('heading', { name: 'Nhật Ký Hệ Thống' })).toBeVisible({
      timeout: 20_000,
    });

    // Không còn trang quản lý vận hành nhà hàng
    await page.goto('/super-admin/restaurants');
    await expect(page.getByRole('heading', { name: 'Quản Lý Nhà Hàng' })).not.toBeVisible({
      timeout: 5_000,
    });
    // Sidebar không còn mục quản lý vận hành
    await expect(page.getByRole('button', { name: 'Quản Lý Nhà Hàng' })).toHaveCount(0);
  });

  test('khoá chủ (owner block) → mọi user của chủ không đăng nhập được', async ({
    page,
    request,
  }) => {
    // Super-admin khoá chủ X (adminX) qua API endpoint mới
    const saToken = await apiLogin(request, USERS.superAdmin.email);
    const blockRes = await request.patch(`${API_BASE}/admin/users/${SEED_IDS.adminX}/block`, {
      headers: { Authorization: `Bearer ${saToken}` },
      data: { blocked: true },
    });
    expect(blockRes.status()).toBe(200);

    // Admin X không thể đăng nhập (tài khoản bị khoá) — kiểm tra cả API và UI
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: { email: USERS.admin.email, password: PASSWORD },
    });
    expect(loginRes.status()).toBe(400);

    await login(page, USERS.admin.email);
    await expect
      .poll(async () => page.url())
      .not.toMatch(/\/admin/, { timeout: 10_000 });

    // Mở khoá lại để không ảnh hưởng các test khác
    const unlockRes = await request.patch(`${API_BASE}/admin/users/${SEED_IDS.adminX}/block`, {
      headers: { Authorization: `Bearer ${saToken}` },
      data: { blocked: false },
    });
    expect(unlockRes.status()).toBe(200);

    // Sau khi mở khoá → admin X đăng nhập lại bình thường
    const reloginRes = await request.post(`${API_BASE}/auth/login`, {
      data: { email: USERS.admin.email, password: PASSWORD },
    });
    expect(reloginRes.status()).toBe(200);
  });
});
