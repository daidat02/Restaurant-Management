import { test, expect } from '@playwright/test';
import { KITCHEN_CODE_X, KITCHEN_CODE_Y } from './helpers';

test.describe('T12 — KDS (màn hình nhà bếp)', () => {
  test('nhập mã bếp X → vào dashboard X hiển thị đơn X', async ({ page }) => {
    await page.goto('/kds');
    await expect(page.getByText('Màn Hình Nhà Bếp')).toBeVisible();

    await page.getByPlaceholder('••••••').fill(KITCHEN_CODE_X);
    await page.getByRole('button', { name: 'Vào bếp' }).click();

    // Dashboard KDS hiển thị nhà hàng X
    await expect(page.getByText('Màn Hình Nhà Bếp (KDS)')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/NhamNhi Cơ Sở 1/)).toBeVisible();

    // Đơn X seed (preparing) hiển thị
    await expect(page.getByText('ORD-X-001')).toBeVisible({ timeout: 15_000 });
  });

  test('mã bếp sai → không vào được dashboard', async ({ page }) => {
    await page.goto('/kds');
    await page.getByPlaceholder('••••••').fill('000000');
    await page.getByRole('button', { name: 'Vào bếp' }).click();

    // Vẫn ở màn nhập mã, không có dashboard
    await expect(page.getByText('Màn Hình Nhà Bếp')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Màn Hình Nhà Bếp (KDS)')).not.toBeVisible();
  });

  test('mã Y khi phiên đang cần X → bị chặn (không lấy được data X)', async ({ page }) => {
    // Vào KDS bằng mã X trước
    await page.goto('/kds');
    await page.getByPlaceholder('••••••').fill(KITCHEN_CODE_X);
    await page.getByRole('button', { name: 'Vào bếp' }).click();
    await expect(page.getByText('Màn Hình Nhà Bếp (KDS)')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('ORD-X-001')).toBeVisible({ timeout: 15_000 });

    // Thoát phiên → thử vào bằng mã Y (không thuộc cơ sở X đang cần)
    await page.getByTitle('Thoát phiên nhà bếp').click();
    await expect(page.getByText('Màn Hình Nhà Bếp')).toBeVisible({ timeout: 10_000 });

    await page.getByPlaceholder('••••••').fill(KITCHEN_CODE_Y);
    await page.getByRole('button', { name: 'Vào bếp' }).click();

    // Dashboard của Y — KHÔNG hiển thị đơn X
    await expect(page.getByText('Màn Hình Nhà Bếp (KDS)')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('ORD-X-001')).not.toBeVisible({ timeout: 10_000 });
  });
});
