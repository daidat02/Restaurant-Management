import { test, expect, type Page } from '@playwright/test';
import { login, waitAuthPersisted, USERS, API_BASE, apiLogin } from './helpers';

/**
 * T4 — Tạo chi nhánh 2+ qua trang /admin/restaurants/new:
 * - Bấm "Thanh toán & Tạo nhà hàng" → nhà hàng tạo ở trạng thái "chờ thanh toán" (activation=pending)
 * - PaymentDialog mở với link PayOS (mock create-url — không gọi gateway thật trong E2E)
 * - Sau khi đóng dialog, chi nhánh mới hiển thị badge "Chờ thanh toán" trong danh sách
 * (customer screen KHÔNG bị ảnh hưởng — theo quyết định giữ nguyên màn hình khách.)
 */
test.describe('T4 — Tạo chi nhánh mới: trạng thái chờ thanh toán + PaymentDialog', () => {
  test('admin chọn PayOS → chi nhánh pending + dialog thanh toán hiển thị link', async ({
    page,
    request,
  }) => {
    const newName = `NhamNhi Chi Nhánh Mới ${Date.now()}`;

    // Mock PayOS create-url: E2E không gọi gateway thật, trả link/QR giả lập deterministic.
    await page.route('**/api/subscriptions/payos/create-url', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Tạo link thanh toán thành công',
          data: {
            transactionId: 'TX_E2E_PAYOS',
            orderCode: 123456789,
            checkoutUrl: 'https://pay.e2e.local/checkout',
            qrCodeData: '00020101021215pay.e2e.local',
            paymentLinkId: 'PL_E2E_PAYOS',
            amount: 299000,
            planName: 'Pro',
            paidUntil: '2027-08-17T00:00:00.000Z',
          },
        }),
      });
    });

    await login(page, USERS.admin.email);
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
    await waitAuthPersisted(page, null);

    await page.goto('/admin/restaurants');
    await expect(page.getByRole('heading', { name: 'Nhà Hàng' })).toBeVisible({
      timeout: 20_000,
    });

    // Vào trang tạo nhà hàng
    await page.getByRole('button', { name: 'Thêm nhà hàng' }).click();
    await expect(page).toHaveURL(/\/admin\/restaurants\/new/, { timeout: 15_000 });

    // Chờ gói dịch vụ + giá load (nút submit khả dụng) — PayOS là cổng mặc định
    const submitBtn = page.getByRole('button', { name: 'Thanh toán & Tạo nhà hàng' });
    await expect(submitBtn).toBeEnabled({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: /PayOS/ })).toBeVisible();

    await page.getByPlaceholder('VD: NhamNhi Cơ Sở 3').fill(newName);
    await page
      .getByPlaceholder('Số nhà, tên đường, phường/xã, quận/huyện...')
      .fill('27 Nguyễn Trãi, Quận 1, TP.HCM');

    await submitBtn.click();

    // PaymentDialog mở với nội dung thanh toán PayOS (QR + nút mở trang)
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Hoàn tất thanh toán')).toBeVisible({ timeout: 20_000 });
    await expect(dialog.getByText('Số tiền cần thanh toán')).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: 'Mở trang thanh toán PayOS' }),
    ).toBeVisible();

    // Đóng dialog → chi nhánh mới tồn tại phía server ở trạng thái pending
    await dialog.getByRole('button', { name: 'Đóng' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    const token = await apiLogin(request, USERS.admin.email);
    const res = await request.get(`${API_BASE}/subscriptions/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const subs =
      (await res.json())?.data ??
      ([] as Array<{ name: string; subscription: string }>);
    const created = (subs as Array<{ name: string; subscription: string }>).find(
      (s) => s.name === newName,
    );
    expect(created, `chi nhánh "${newName}" phải nằm trong danh sách thuê bao của chủ`).toBeTruthy();
    expect(created?.subscription).toBe('pending');

    // UI: danh sách chi nhánh hiển thị tên mới + badge "Chờ thanh toán"
    await page.goto('/admin/restaurants');
    await expect(page.getByText(newName)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Chờ thanh toán').first()).toBeVisible();
  });
});