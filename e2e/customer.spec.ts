import { test, expect } from '@playwright/test';
import { apiLogin, SEED_IDS, API_BASE, USERS } from './helpers';

test.describe('T12 — Khách tại bàn (scan-to-order)', () => {
  test('mở QR scan-to-order cơ sở X → màn chào khách → menu X', async ({ page }) => {
    await page.goto(
      `/scan-to-order?restaurantId=${SEED_IDS.tenantX}&tableId=${SEED_IDS.tableX2}`,
    );
    // Màn chào khách hiển thị (nút chính Xem Menu - Gọi món)
    await expect(page.getByRole('button', { name: /Xem Menu - Gọi món/ })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('button', { name: /Xem Menu - Gọi món/ }).click();
    // Bàn số hiển thị
    await expect(page.getByText(/Bàn số:/)).toBeVisible({ timeout: 15_000 });
    // Menu cơ sở X
    await expect(page.getByText('Cà phê sữa')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Trà đào')).toBeVisible();
    // KHÔNG có món của Y
    await expect(page.getByText('Cơm tấm')).not.toBeVisible();
    await expect(page.getByText('Phở bò')).not.toBeVisible();
  });

  test('thêm món X vào cart → tạo order tại bàn → vào payment', async ({ page, request }) => {
    // Tạo bàn mới qua API để đảm bảo bàn chưa có order (data chia sẻ giữa các spec)
    const token = await apiLogin(request, USERS.admin.email);
    const tableRes = await request.post(`${API_BASE}/tables/create`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        tableData: {
          restaurant: SEED_IDS.tenantX,
          tableNumber: 900 + Math.floor(Math.random() * 90),
          status: 'available',
        },
      },
    });
    expect(tableRes.status()).toBe(201);
    const table = (await tableRes.json()).data;
    expect(table._id).toBeTruthy();

    await page.goto(
      `/scan-to-order?restaurantId=${SEED_IDS.tenantX}&tableId=${table._id}`,
    );
    await expect(page.getByRole('button', { name: /Xem Menu - Gọi món/ })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('button', { name: /Xem Menu - Gọi món/ }).click();
    await expect(page.getByText('Cà phê sữa')).toBeVisible({ timeout: 15_000 });

    // Thêm 1 món vào giỏ (nút add tròn có aria-label "Thêm món <tên>")
    await page.getByRole('button', { name: 'Thêm món Cà phê sữa' }).click();

    // Chốt đơn bàn
    await page.getByRole('button', { name: /Xác nhận gửi đơn/ }).click();
    await expect(page.getByText(/Bàn số:/)).toBeVisible({ timeout: 15_000 });
    // Đơn đã gửi — trạng thái bàn ăn + nút yêu cầu thanh toán xuất hiện (desktop)
    await expect(page.getByRole('button', { name: 'Yêu cầu thanh toán' })).toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe('T12 — Khách delivery (landing page)', () => {
  test('mở trang chủ → landing hiển thị, auth modal mở được', async ({ page }) => {
    await page.goto('/');
    // Landing hiển thị đúng (route /auth cũ đã được thay bằng landing + auth modal)
    await expect(
      page.getByRole('heading', { name: /Vận hành nhà hàng của bạn trên một nền tảng duy nhất/ }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Đăng nhập' }).first().click();
    await expect(page.getByPlaceholder('quanly@nhahang.vn')).toBeVisible({ timeout: 15_000 });
  });
});
