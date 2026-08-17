import { test, expect } from '@playwright/test';
import { login, waitAuthPersisted, USERS, SEED_IDS, API_BASE, apiLogin } from './helpers';

/**
 * Regression: mở modal thanh toán không được gọi GET /api/payments/ (id rỗng).
 * Trước đây PaymentModal render FormPayment ngay với paymentId='' trong lúc initiate đang
 * chạy async → fetchPaymentById('') → GET /api/payments/ → 404 "Cannot GET /api/payments/".
 */
test.describe('T13 — Modal thanh toán không gọi API id rỗng', () => {
  test('Đơn: bấm Thanh toán → modal hiện data thật, không có GET /api/payments/ rỗng', async ({
    page,
    request,
  }) => {
    const emptyPaymentsRequests: string[] = [];
    page.on('request', (req) => {
      // URL khớp chính xác /api/payments/ (không có id phía sau)
      if (/\/api\/payments\/?$/.test(new URL(req.url()).pathname)) {
        emptyPaymentsRequests.push(req.url());
      }
    });

    // Delay initiate để FormPayment mount trước khi paymentId có giá trị (tái hiện race condition).
    await page.route('**/api/payments/initiate', async (route) => {
      await new Promise((r) => setTimeout(r, 1000));
      await route.continue();
    });

    // Đưa order seed X về trạng thái served (đơn + món) → nút "Thanh toán" hiển thị + initiate được.
    const token = await apiLogin(request, USERS.staff.email);
    const itemStatusRes = await request.post(
      `${API_BASE}/orders/item/${SEED_IDS.orderItemXActive}/served`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(itemStatusRes.status()).toBe(200);
    const statusRes = await request.put(`${API_BASE}/orders/${SEED_IDS.orderXActive}/status`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { status: 'served' },
    });
    expect(statusRes.status()).toBe(200);
    const orderCheck = await request.get(`${API_BASE}/orders/${SEED_IDS.orderXActive}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect((await orderCheck.json())?.data?.status).toBe('served');

    await login(page, USERS.staff.email);
    await expect(page).toHaveURL(/\/staff\/orders$/, { timeout: 15_000 });
    await waitAuthPersisted(page, SEED_IDS.tenantX);
    // Tải lại để chắc chắn list order mới nhất (status served)
    await page.reload();
    // Bấm Thanh toán trên card đơn đã served (ORD-X-001) — tránh nhầm các đơn khác
    const servedCard = page
      .locator('div.rounded-2xl')
      .filter({ hasText: 'ORD-X-001' })
      .first();
    await expect(servedCard.getByRole('button', { name: 'Thanh toán' })).toBeVisible({
      timeout: 15_000,
    });
    await servedCard.getByRole('button', { name: 'Thanh toán' }).click();

    // Modal thanh toán mở với data thật (không phải màn hình "đang khởi tạo")
    await expect(page.getByText(/Tổng thanh toán/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Chốt tiền mặt' })).toBeVisible();

    // Không được có request GET /api/payments/ với id rỗng
    expect(emptyPaymentsRequests).toHaveLength(0);
  });
});
