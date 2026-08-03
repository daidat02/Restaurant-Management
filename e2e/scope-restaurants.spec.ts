import { test, expect } from '@playwright/test';
import { login, waitAuthPersisted, USERS, SEED_IDS, apiLogin, API_BASE } from './helpers';

test.describe('T03 — Scope nhà hàng: dropdown & bộ lọc chỉ hiện chuỗi của admin/manager', () => {
  test('admin /admin/customers: bộ lọc nhà hàng chỉ liệt kê chuỗi (X, Y), không có chi nhánh chủ khác', async ({
    page,
  }) => {
    await login(page, USERS.admin.email);
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
    await waitAuthPersisted(page, null);

    await page.goto('/admin/customers');
    await expect(page.getByRole('heading', { name: 'Quản Lý Người Dùng' })).toBeVisible({
      timeout: 20_000,
    });

    // Mở bộ lọc nhà hàng (chỉ admin thấy)
    const filter = page.getByRole('combobox').filter({ hasText: 'Tất cả nhà hàng' });
    await filter.click();

    await expect(page.getByRole('option', { name: 'Tất cả nhà hàng' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'NhamNhi Cơ Sở 1' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'NhamNhi Cơ Sở 2' })).toBeVisible();
    // KHÔNG rò rỉ nhà hàng của chuỗi khác (ownerSub)
    await expect(page.getByRole('option', { name: /NhamNhi Sub/ })).toHaveCount(0);
  });

  test('admin "Thêm nhân viên": dropdown chọn nhà hàng chỉ liệt kê chuỗi của admin', async ({
    page,
  }) => {
    await login(page, USERS.admin.email);
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
    await waitAuthPersisted(page, null);

    await page.goto('/admin/customers');
    await expect(page.getByRole('heading', { name: 'Quản Lý Người Dùng' })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole('button', { name: /Thêm nhân viên/ }).click();

    // Combobox thứ 2 trong form = chọn nhà hàng (thứ 1 là vai trò)
    await page.getByRole('combobox').nth(1).click();
    await expect(page.getByRole('option', { name: 'NhamNhi Cơ Sở 1' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'NhamNhi Cơ Sở 2' })).toBeVisible();
    await expect(page.getByRole('option', { name: /NhamNhi Sub/ })).toHaveCount(0);
  });

  test('admin "Tất cả nhà hàng" → GET /auth/ trả union toàn chuỗi (staff X + staff Y)', async ({
    request,
  }) => {
    const token = await apiLogin(request, USERS.admin.email);
    const res = await request.get(`${API_BASE}/auth/`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { roles: 'staff' },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { data?: Array<{ email: string }> };
    const emails = (body?.data ?? []).map((u) => u.email);
    expect(emails).toContain(USERS.staff.email); // staff X
    // staff Y — email bị lowercase khi seed qua User model → dùng giá trị chuẩn hoá
    expect(emails).toContain('staffy.test@nhamnhi.vn'); // union toàn chuỗi
  });

  test('manager chỉ thấy chi nhánh mình qua GET /restaurants/my (không lẫn chi nhánh khác)', async ({
    request,
  }) => {
    const token = await apiLogin(request, USERS.manager.email);
    const res = await request.get(`${API_BASE}/restaurants/my`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { data?: Array<{ _id: string }> };
    const ids = (body?.data ?? []).map((r) => r._id);
    expect(ids).toEqual([SEED_IDS.tenantX]);
  });
});
