import { test, expect, type APIRequestContext } from '@playwright/test';
import { login, waitAuthPersisted, apiRegisterOwner, API_BASE, PASSWORD } from './helpers';

/** Tạo admin mới (chưa có nhà hàng) qua API + verify OTP → trả email để đăng nhập. */
async function createFreshOwner(request: APIRequestContext, email: string) {
  await apiRegisterOwner(request, email);
  return email;
}

test.describe('T04 — Guard & route onboarding (blank layout)', () => {
  test('admin chưa có nhà hàng đăng nhập → /onboarding, không Sidebar/Header, /admin/* bị redirect', async ({
    page,
    request,
  }) => {
    const email = await createFreshOwner(request, `onboard.guard.${Date.now()}@nhamnhi.vn`);

    await login(page, email);
    // Guard client: admin không nhà hàng → /onboarding (KHÔNG vào /admin)
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });
    await waitAuthPersisted(page, null);

    // Blank layout: không có Sidebar/Header điều hướng
    await expect(page.getByText('Khởi tạo cơ sở mới')).toBeVisible();
    await expect(page.getByText('Người Dùng Hệ Thống')).toHaveCount(0);
    await expect(page.getByRole('navigation')).toHaveCount(0);

    // Thử vào /admin/* → bị đá về /onboarding
    await page.goto('/admin/customers');
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });
  });

  test('admin đã có nhà hàng vào /onboarding → redirect /admin; guard /admin/* không chặn', async ({
    page,
    request,
  }) => {
    // Tạo admin mới + nhà hàng đầu tiên qua API → đã có restaurantIds
    const email = await createFreshOwner(request, `onboard.hasres.${Date.now()}@nhamnhi.vn`);
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: { email, password: PASSWORD },
    });
    expect(loginRes.status()).toBe(200);
    const token = ((await loginRes.json()) as { data?: { accessToken?: string } }).data?.accessToken;
    const created = await request.post(`${API_BASE}/restaurants`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: 'Cơ sở đã có', email: 'has@nhamnhi.vn', operatingHours: '8-22' },
    });
    expect(created.status()).toBe(201);

    await login(page, email);
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
    await waitAuthPersisted(page, null);

    // Vào /onboarding → đã có nhà hàng → đá về /admin
    await page.goto('/onboarding');
    await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 });
  });
});
