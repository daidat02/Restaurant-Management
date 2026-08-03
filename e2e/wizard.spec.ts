import { test, expect } from '@playwright/test';
import { login, API_BASE, PASSWORD } from './helpers';

test.describe('T07 — Wizard onboarding 4 bước', () => {
  test('owner mới (chưa có nhà hàng) tạo cơ sở đầu tiên qua wizard → trial 30 ngày', async ({ page, request }) => {
    const unique = Date.now().toString().slice(-6);
    const ownerEmail = `wiz.owner.${unique}@nhamnhi.vn`;
    const tenantName = `NhamNhi Wizard ${unique}`;

    // Đăng ký chủ mới qua API → chưa sở hữu nhà hàng nào
    const reg = await request.post(`${API_BASE}/auth/register-owner`, {
      data: { name: 'Wizard Owner', email: ownerEmail, password: PASSWORD },
    });
    expect(reg.status()).toBe(201);

    // Login UI → guard đưa owner chưa có nhà hàng vào thẳng /onboarding (blank layout — ticket 04)
    await login(page, ownerEmail);
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Khởi tạo cơ sở mới' })).toBeVisible();

    // B1 — thông tin nhà hàng
    await page.getByPlaceholder(/VD: NhamNhi/).fill(tenantName);
    await page.getByPlaceholder(/restaurant@gmail.com/).fill(`cs${unique}@nhamnhi.vn`);
    await page.getByPlaceholder(/095/).fill('0901112222');
    await page.getByPlaceholder(/Số nhà, đường/).fill('Wizard Street 1');
    await page.getByRole('button', { name: /Tạo nhà hàng & tiếp tục/ }).click();

    // B2 — cấu hình cơ sở (mã bếp 6 số hiển thị)
    await expect(page.getByText('Cấu hình cơ sở')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /Khởi tạo cấu hình & sinh mã bếp/ }).click();
    await expect(page.getByText(/^\d{6}$/)).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /Tiếp tục tạo nhân sự/ }).click();

    // B3 — tạo 1 manager
    await expect(page.getByText('Tạo nhân sự')).toBeVisible();
    await page.getByPlaceholder('Tên nhân sự').fill('Manager Wizard');
    await page.getByPlaceholder('nhanvien@gmail.com').fill(`manager.w${unique}@nhamnhi.vn`);
    await page.getByPlaceholder('Ít nhất 6 ký tự').fill('Test@NhamNhi2026');
    await page.getByRole('button', { name: /Thêm nhân sự/ }).click();
    await expect(page.getByText(/Đã tạo \(1\)/)).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /Bỏ qua & tiếp tục/ }).click();

    // B4 — tạo bàn + QR
    await expect(page.getByRole('button', { name: /Tạo bàn & QR/ })).toBeVisible();
    await page.getByRole('button', { name: /Tạo bàn & QR/ }).click();
    await expect(page.getByText('Bàn 1')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Bàn 2')).toBeVisible();
    await page.getByRole('button', { name: /Hoàn tất & vào quản trị/ }).click();
    await page.waitForURL(/\/admin$/);

    // Xác minh tenant mới tồn tại + thuộc owner vừa đăng ký với trạng thái trial
    const restaurants = await request.get(`${API_BASE}/restaurants`);
    expect(restaurants.status()).toBe(200);
    const all = (await restaurants.json()).data || [];
    const created = all.find((r: any) => r.name === tenantName);
    expect(created).toBeTruthy();
    expect(created.status).toBe('active');
    expect(created.subscription).toBe('trial');
    expect(created.trialEndsAt).toBeTruthy();
    expect(created.ownerId).toBeTruthy();
  });
});
