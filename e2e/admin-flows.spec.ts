import { test, expect } from '@playwright/test';
import { login, waitAuthPersisted, USERS, SEED_IDS } from './helpers';

test.describe('T12/T13 — Admin & manager flows', () => {
  test('menu: thêm món mới (manager cơ sở X)', async ({ page }) => {
    await login(page, USERS.manager.email);
    await expect(page).toHaveURL(/\/manager/, { timeout: 15_000 });
    await waitAuthPersisted(page, SEED_IDS.tenantX);

    await page.goto('/manager/menu/items');
    await expect(page.getByRole('heading', { name: 'Quản Lý Thực Đơn' })).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole('button', { name: /Thêm món mới/ }).click();
    await expect(page).toHaveURL(/menu\/items\/create/, { timeout: 15_000 });

    // Điền form
    const uniqueName = `Món E2E ${Date.now()}`;
    await page.getByPlaceholder('VD: Cà phê sữa đá, Lẩu Thái...').fill(uniqueName);
    await page.getByPlaceholder('0').first().fill('55000');
    // Danh mục: chọn danh mục X ("Đồ uống") — trigger là Radix combobox
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /Đồ uống/ }).click();

    await page.getByRole('button', { name: /Lưu món/ }).click();

    // Quay lại danh sách, món mới xuất hiện
    await expect(page.getByRole('heading', { name: 'Quản Lý Thực Đơn' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 15_000 });
  });

  test('POS: thêm món vào bill (staff cơ sở X)', async ({ page }) => {
    await login(page, USERS.staff.email);
    await expect(page).toHaveURL(/\/staff\/orders$/, { timeout: 15_000 });
    await waitAuthPersisted(page, SEED_IDS.tenantX);

    // Vào POS từ trang Đơn (bấm "+ Đơn mới")
    await page.getByRole('button', { name: /Đơn mới/ }).click();
    await expect(page).toHaveURL(/\/staff\/orders\/pos/, { timeout: 15_000 });

    // Chọn món X — món có optionGroups → modal chọn option mở ra, phải xác nhận mới vào bill
    await expect(page.getByText('Cà phê sữa')).toBeVisible({ timeout: 20_000 });
    await page.getByText('Cà phê sữa').click();

    // Modal option: group single bắt buộc tự chọn sẵn → bấm Thêm vào đơn luôn
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Thêm vào đơn' }).click();

    // Panel bill hiển thị món đã chọn (tiền format vi-VN: 35.000đ)
    const bill = page.locator('aside');
    await expect(bill.getByText('Tổng cộng')).toBeVisible({ timeout: 15_000 });
    await expect(bill.getByText('35.000đ').first()).toBeVisible();
  });

  test('order: đổi status pending → confirmed (manager X)', async ({ page, request }) => {
    // Dùng API tạo order fresh cho X để đổi status
    const token = await loginManagerAndGetToken(page);

    const createRes = await request.post('http://localhost:8100/api/orders', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        restaurant: SEED_IDS.tenantX,
        table: SEED_IDS.tableX2,
        orderType: 'dine-in',
        items: [
          {
            menuItem: SEED_IDS.menuItemX1,
            nameSnapshot: 'Cà phê sữa',
            priceSnapshot: 35000,
            quantity: 1,
          },
        ],
        totalAmount: 35000,
      },
    });
    expect(createRes.status()).toBe(201);
    const order = (await createRes.json()).data;
    expect(order._id).toBeTruthy();

    // Vào trang chi tiết đơn vừa tạo
    await page.goto(`/manager/orders/edit/${order._id}`);
    await expect(page.getByText('Cập nhật trạng thái')).toBeVisible({ timeout: 20_000 });

    // Đổi status qua select trạng thái (stepper đã thay bằng Select theo loại đơn)
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Đã xác nhận' }).click();

    // Xác nhận status thực sự đổi qua API (poll vì request async)
    await expect
      .poll(
        async () => {
          const res = await request.get(
            `http://localhost:8100/api/orders/${order._id}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (res.status() !== 200) return null;
          const body = (await res.json()) as { data?: { status?: string } };
          return body?.data?.status ?? null;
        },
        { timeout: 15_000 },
      )
      .toBe('confirmed');
  });

  test('reservation: đơn đặt bàn X hiển thị (manager X)', async ({ page, request }) => {
    // Tạo reservation qua API để data ổn định, sau đó verify UI hiển thị
    const token = await loginManagerAndGetToken(page);
    const now = new Date();
    const createRes = await request.post('http://localhost:8100/api/reservations/create', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        restaurant: SEED_IDS.tenantX,
        table: SEED_IDS.tableX2,
        customerInfo: { name: 'Khách E2E', phoneNumber: '0900000999' },
        reservationTime: '19:30',
        date: now.toISOString(),
        partySize: 2,
        status: 'pending',
      },
    });
    expect(createRes.status()).toBe(201);

    await page.goto('/manager/reservations');
    await expect(page.getByText('Quản Lý Đặt Bàn')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Khách E2E')).toBeVisible({ timeout: 15_000 });
  });
});

/** Login manager qua UI (cơ sở X) và trả token từ localStorage. */
async function loginManagerAndGetToken(
  page: import('@playwright/test').Page,
): Promise<string> {
  await login(page, USERS.manager.email);
  await expect(page).toHaveURL(/\/manager/, { timeout: 15_000 });
  const auth = await waitAuthPersisted(page, SEED_IDS.tenantX);
  return auth.token;
}
