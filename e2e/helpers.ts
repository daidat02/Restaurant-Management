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
export async function waitAuthPersisted(page: Page, restaurantId?: string | null) {
  await expect
    .poll(
      async () => {
        const auth = await readPersistedAuth(page);
        return auth?.token ? (auth.currentRestaurantId ?? null) : undefined;
      },
      { timeout: 10_000 },
    )
    .toEqual(restaurantId === undefined ? expect.anything() : restaurantId);
  return readPersistedAuth(page);
}

/** Seed IDs (khớp `server/src/test/seed.ts`). */
export const SEED_IDS = {
  adminX: '69fccba996a14809070b9ee1',
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
  orderItemXActive: '69fccba996a14809070b9efa',
  categoryX: '69fccba996a14809070b9ef5',
  settingX: '6a314d4142a2baf0dcd935f8',
  settingY: '6a6d6b0a660a34d8774b88b5',
  // Seed owner.sub (vòng đời mới — T04/T07)
  ownerSub: '69fccba996a14809070b9e00',
  tenantSubTrial: '69fccba996a14809070b9e01',
  tenantSubExpiring: '69fccba996a14809070b9e02',
  tenantSubLocked: '69fccba996a14809070b9e03',
  tenantSubEnterprise: '69fccba996a14809070b9e04',
  tenantSubDowngrading: '69fccba996a14809070b9e05',
  tenantSubExpired: '69fccba996a14809070b9e06',
} as const;

export const KITCHEN_CODE_X = '456734';
export const KITCHEN_CODE_Y = '553572';

export const USERS = {
  admin: { email: 'admin.test@nhahangos.me', name: 'Admin Test' },
  manager: { email: 'manager.test@nhahangos.me', name: 'Manager Test' },
  staff: { email: 'staff.test@nhahangos.me', name: 'Staff Test' },
  staffY: { email: 'staffY.test@nhahangos.me', name: 'Staff Y Test' },
  customer: { email: 'customer.test@nhahangos.me', name: 'Customer Test' },
  superAdmin: { email: 'super.admin@nhahangos.me', name: 'Super Admin' },
} as const;

/** Trang đăng nhập (route riêng — auth modal trên landing đã bị gỡ ở ticket auth-pages). */
export async function gotoLogin(page: Page) {
  await page.goto('/login');
}

/**
 * Đăng nhập bất kỳ role nào qua UI trang /login.
 * Sau khi submit, client điều hướng theo role (admin→/admin, manager→/manager...).
 */
export async function login(
  page: Page,
  email: string,
  password: string = PASSWORD,
): Promise<void> {
  await gotoLogin(page);
  await page.getByPlaceholder('ban@nhahangos.vn').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  // Submit bằng Enter trong ô mật khẩu (form submit mặc định)
  await page.getByPlaceholder('••••••••').press('Enter');
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

/** Endpoint test-only trên server e2e — đọc OTP từ Memory Server (E2E không có SMTP thật). */
export const E2E_OTP_URL = 'http://localhost:8100/__e2e__/otp';

/** Lấy mã OTP xác thực email từ endpoint test-only của server e2e. */
export async function fetchOtp(request: APIRequestContext, email: string): Promise<string> {
  const res = await request.get(`${E2E_OTP_URL}?email=${encodeURIComponent(email)}`);
  expect(res.status()).toBe(200);
  return ((await res.json()) as { data?: { otp?: string } }).data?.otp ?? '';
}

/**
 * Đăng ký owner qua API + xác thực OTP ngay (luồng mới bắt buộc verify email).
 * Sau hàm này tài khoản đăng nhập bình thường.
 */
export async function apiRegisterOwner(
  request: APIRequestContext,
  email: string,
  name = 'Chủ E2E',
): Promise<void> {
  const reg = await request.post(`${API_BASE}/auth/register-owner`, {
    data: { name, email, password: PASSWORD },
  });
  expect(reg.status()).toBe(201);
  const otp = await fetchOtp(request, email);
  const ver = await request.post(`${API_BASE}/auth/verify-otp`, {
    data: { email, otp },
  });
  expect(ver.status()).toBe(200);
}

/** Đăng ký owner qua UI (/register → /verify-otp) → tự đăng nhập → về /onboarding. */
export async function registerOwnerViaUi(page: Page, email: string, name = 'Chủ Mới E2E') {
  await page.goto('/register');
  await page.getByPlaceholder('Nguyễn Văn A').fill(name);
  await page.getByPlaceholder('ban@nhahangos.vn').fill(email);
  await page.getByPlaceholder('0xxxxxxxxx').fill('0912345678');
  await page.getByPlaceholder('Tối thiểu 6 ký tự').fill(PASSWORD);
  // Đồng ý điều khoản (checkbox duy nhất trên trang)
  await page.locator('input[type=checkbox]').check();
  await page.getByRole('button', { name: 'Đăng ký miễn phí' }).click();

  // Chuyển sang trang nhập mã OTP xác thực email
  await expect(page).toHaveURL(/\/verify-otp/, { timeout: 15_000 });
  const otp = await fetchOtp(page.request, email);
  await page.getByPlaceholder('••••••').fill(otp);
  await page.getByRole('button', { name: 'Xác thực', exact: true }).click();

  // Verify xong → auto-login → vào wizard tạo nhà hàng đầu tiên
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });
}
