import { test, expect, type Page } from '@playwright/test';
import { login, waitAuthPersisted, USERS } from './helpers';

/**
 * T11 regression: /admin/reports + /admin không được gọi API analytics liên tục.
 * Trước đây LoadingProvider tạo mới showLoading/hideLoading mỗi render → hook useAnalytic
 * tạo mới fetchDashboardData → effect chạy lại → vòng lặp vô hạn gọi API.
 */
const ANALYTICS_RE = /\/api\/analytics\//;

async function installRequestCounter(page: Page) {
  const hits: string[] = [];
  page.on('request', (req) => {
    if (ANALYTICS_RE.test(req.url())) hits.push(req.url());
  });
  return hits;
}

/** Vào trang admin, chờ data tải xong, đếm request analytics trong 3s nhàn rỗi. */
async function assertNoRefetch(page: Page, path: string, waitForText: string) {
  const hits = await installRequestCounter(page);

  await login(page, USERS.admin.email);
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
  await waitAuthPersisted(page, null);

  await page.goto(path);
  await expect(page.getByRole('heading', { name: waitForText })).toBeVisible({ timeout: 20_000 });

  // Chờ 2s để đợt fetch đầu tiên hoàn tất
  await page.waitForTimeout(2000);

  const before = hits.length;
  await page.waitForTimeout(3000);
  const after = hits.length;

  // Không được phát sinh thêm request analytics nào trong lúc nhàn rỗi
  expect(after).toBe(before);
}

test.describe('T11 — reports & dashboard không gọi lại API liên tục', () => {
  test('trang /admin/reports không refetch khi idle', async ({ page }) => {
    await assertNoRefetch(page, '/admin/reports', 'Báo Cáo Nâng Cao');
  });

  test('trang /admin (dashboard) không refetch khi idle', async ({ page }) => {
    await assertNoRefetch(page, '/admin', 'Báo Cáo & Phân Tích');
  });
});
