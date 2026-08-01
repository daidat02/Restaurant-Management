import { test, expect } from '@playwright/test';
import { login, waitAuthPersisted, USERS, SEED_IDS, API_BASE } from './helpers';

test.describe('T12 — Cross-tenant (sau fix)', () => {
  test('manager X không đọc được data Y qua API', async ({ page, request }) => {
    // Manager chỉ thuộc X — token chỉ có quyền trên X
    await login(page, USERS.manager.email);
    await expect(page).toHaveURL(/\/manager/, { timeout: 15_000 });
    const auth = await waitAuthPersisted(page, SEED_IDS.tenantX);
    const token = auth.token;

    // Đọc data Y → 403 (resource không thuộc tenant X)
    const orderY = await request.get(`${API_BASE}/orders/${SEED_IDS.orderYActive}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(orderY.status()).toBe(403);

    // List table qua param Y → server lấy tenant từ token (X), không trả bàn Y
    const tableY = await request.get(`${API_BASE}/tables/restaurant/${SEED_IDS.tenantY}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(tableY.status()).toBe(200);
    const tableBody = (await tableY.json()) as { data?: { restaurant?: string }[] };
    const restaurants = (tableBody.data || []).map((t) => String(t.restaurant));
    expect(restaurants.every((r) => r === SEED_IDS.tenantX)).toBe(true);
  });

  test('manager X không vào được route quản lý Y qua UI (bị redirect)', async ({
    page,
  }) => {
    // Manager chỉ có X — cố truy cập UI quản lý data Y qua API path
    await login(page, USERS.manager.email);
    await expect(page).toHaveURL(/\/manager/, { timeout: 15_000 });
    await waitAuthPersisted(page, SEED_IDS.tenantX);

    // Cố truy cập resource Y qua UI route (order detail Y) → bị chặn/redirect, không hiện data Y
    await page.goto(`/manager/orders/edit/${SEED_IDS.orderYActive}`);
    // Không hiển thị đơn Y
    await expect(page.getByText('ORD-Y-001')).not.toBeVisible({ timeout: 10_000 });
  });
});
