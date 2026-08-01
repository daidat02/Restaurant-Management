import { Page, APIRequestContext, expect } from '@playwright/test';

/** API server (E2E Memory Server) + Web app. */
export const API_BASE = 'http://localhost:8100/api';
export const APP_URL = 'http://localhost:5173';

export const PASSWORD = 'Test@NhamNhi2026';

/** Đọc auth state từ redux-persist (localStorage key 'persist:root'). Poll vì persist ghi async. */
export async function readPersistedAuth(page: Page) {
  const state = await page.evaluate(() => {
    const raw = window.localStorage.getItem('persist:root');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      // redux-persist v6 lưu mỗi reducer thành JSON string
      return typeof parsed.auth === 'string' ? JSON.parse(parsed.auth) : parsed.auth;
    } catch {
      return null;
    }
  });
  return state ?? null;
}

/** Chờ auth state được persist với token đầy đủ. Trả auth object. */
export async function waitAuthPersisted(page: Page, restaurantId?: string) {
  await expect
    .poll(
      async () => {
        const auth = await readPersistedAuth(page);
        return auth?.token ? auth.currentRestaurantId ?? null : undefined;
      },
      { timeout: 10_000 },
    )
    .toEqual(restaurantId ?? expect.anything());
  return readPersistedAuth(page);
}

/** Seed IDs (khớp `server/src/test/seed.ts`). */
export const SEED_IDS = {
  tenantX: '69fccba996a14809070b9ef2',
  tenantY: '69fb58d6ca9d7bade016e912',
  tableX1: '69fccba996a14809070b9ef3',
  tableX2: '69fccba996a14809070b9ef4',
  tableY1: '69fb58d6ca9d7bade016e913',
  menuItemX1: '69fccba996a14809070b9ef6',
  menuItemX2: '69fccba996a14809070b9ef7',
  menuItemY1: '69fb58d6ca9d7bade016e916',
  orderXActive: '69fccba996a14809070b9ef8',
  orderYActive: '69fb58d6ca9d7bade016e918',
} as const;

export const KITCHEN_CODE_X = '456734';
export const KITCHEN_CODE_Y = '553572';

export const USERS = {
  admin: { email: 'admin.test@nhamnhi.vn', name: 'Admin Test' },
  manager: { email: 'manager.test@nhamnhi.vn', name: 'Manager Test' },
  staff: { email: 'staff.test@nhamnhi.vn', name: 'Staff Test' },
  staffY: { email: 'staffY.test@nhamnhi.vn', name: 'Staff Y Test' },
  customer: { email: 'customer.test@nhamnhi.vn', name: 'Customer Test' },
  superAdmin: { email: 'super.admin@nhamnhi.vn', name: 'Super Admin' },
} as const;

/** Đăng nhập admin/staff/customer qua UI. */
export async function login(
  page: Page,
  email: string,
  password: string = PASSWORD,
): Promise<void> {
  await page.goto('/auth');
  await page.getByPlaceholder('Input email').fill(email);
  await page.getByPlaceholder('Input password').fill(password);
  await page.getByRole('button', { name: 'Đăng Nhập', exact: true }).first().click();
}

/** Đăng nhập admin (2 cơ sở) và chọn 1 nhà hàng ở switcher → về /admin. */
export async function loginAdminAndSelect(
  page: Page,
  restaurantName: string,
): Promise<void> {
  await login(page, USERS.admin.email);
  await expect(page).toHaveURL(/select-restaurant/, { timeout: 15_000 });
  await page.getByRole('button', { name: restaurantName }).click();
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
}

/** Đăng nhập qua API → trả accessToken. Dùng để tạo data / verify chặn. */
export async function apiLogin(
  request: APIRequestContext,
  email: string,
  password: string = PASSWORD,
): Promise<string> {
  const res = await request.post(`${API_BASE}/auth/login`, {
    data: { email, password },
  });
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { data?: { accessToken?: string } };
  const token = body?.data?.accessToken;
  expect(token).toBeTruthy();
  return token as string;
}
