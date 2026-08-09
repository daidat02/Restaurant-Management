import { test, expect } from '@playwright/test';
import { login, waitAuthPersisted, USERS, SEED_IDS } from './helpers';

/**
 * Regression: mở modal thanh toán từ POS không được gọi GET /api/payments/ (id rỗng).
 * Trước đây PaymentModal render FormPayment ngay với paymentId='' trong lúc initiate đang
 * chạy async → fetchPaymentById('') → GET /api/payments/ → 404 "Cannot GET /api/payments/".
 */
test.describe('T13 — Modal thanh toán không gọi API id rỗng', () => {
  test('POS: bấm Thanh toán → modal hiện data thật, không có GET /api/payments/ rỗng', async ({
    page,
  }) => {
    const emptyPaymentsRequests: string[] = [];
    page.on('request', (req) => {
      // URL khớp chính xác /api/payments/ (không có id phía sau)
      if (/\/api\/payments\/?$/.test(new URL(req.url()).pathname)) {
        emptyPaymentsRequests.push(req.url());
      }
    });

    // Delay initiate để FormPayment mount trước khi paymentId có giá trị (tái hiện race condition).
    // Nếu PaymentModal render FormPayment ngay với paymentId rỗng → fetchPaymentById('') → GET /api/payments/.
    await page.route('**/api/payments/initiate', async (route) => {
      await new Promise((r) => setTimeout(r, 1000));
      await route.continue();
    });

    await login(page, USERS.staff.email);
    await expect(page).toHaveURL(/\/staff\/orders$/, { timeout: 15_000 });
    await waitAuthPersisted(page, SEED_IDS.tenantX);

    // Vào POS từ trang Đơn
    await page.getByRole('button', { name: /Đơn mới/ }).click();
    await expect(page).toHaveURL(/\/staff\/orders\/pos/, { timeout: 15_000 });

    // Chọn món X rồi bấm Thanh toán
    await expect(page.getByText('Cà phê sữa')).toBeVisible({ timeout: 20_000 });
    await page.getByText('Cà phê sữa').click();
    await expect(page.locator('aside').getByText('Tổng cộng')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Thanh toán' }).click();

    // Modal thanh toán mở với data thật (không phải màn hình "đang khởi tạo")
    await expect(page.getByText(/Tổng thanh toán/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Chốt tiền mặt' })).toBeVisible();

    // Không được có request GET /api/payments/ với id rỗng
    expect(emptyPaymentsRequests).toHaveLength(0);
  });
});
