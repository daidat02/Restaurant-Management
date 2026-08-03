import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import createApp from '../app.js';
import { initSocket } from '../configs/socketsConfig.js';
import { SEED_IDS } from './seed.js';

/** Express app (không listen) cho supertest. */
export const app = createApp();

// Init socket giả để getIO() không throw khi controller/service emit trong test.
// Server không cần listen — chỉ cần instance io tồn tại để emit không lỗi.
initSocket(createServer(app));

export const request = supertest(app);

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret';

/** Ký access token thủ công (cùng format với auth.service.ts). */
export function signToken(
  userId: string,
  role: string,
  restaurantId?: string,
  scope?: string,
): string {
  const payload: Record<string, string> = {
    _id: userId,
    role,
    ...(scope ? { scope } : {}),
    ...(restaurantId ? { restaurantId } : {}),
  };
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '30m' });
}

/** Tạo token cho một role với tenant cụ thể (dùng userId mặc định theo SEED_IDS). */
export function tokenFor(
  role: 'admin' | 'manager' | 'staff' | 'staffY' | 'customer' | 'super-admin' | 'kds' | 'owner-sub',
  tenantId?: string,
): string {
  const idByRole: Record<string, string> = {
    admin: SEED_IDS.adminX.toString(),
    manager: SEED_IDS.managerX.toString(),
    staff: SEED_IDS.staffX.toString(),
    staffY: SEED_IDS.staffY.toString(),
    customer: SEED_IDS.customer.toString(),
    'super-admin': SEED_IDS.superAdmin.toString(),
    'owner-sub': SEED_IDS.ownerSub.toString(),
  };
  const userId = idByRole[role] ?? 'test-user-id';
  const tokenRole = role === 'staffY' ? 'staff' : role;

  if (role === 'kds') {
    return signToken(tenantId ?? SEED_IDS.tenantX.toString(), 'kds', undefined, 'kds');
  }
  return signToken(userId, tokenRole, tenantId);
}

/** Chuyển ObjectId/string thành string — dùng trong assertion URL. */
export const idOf = (oid: unknown): string => String(oid);

/** Đăng nhập thật qua endpoint /api/auth/login (verify password hash thật). */
export async function loginAs(email: string): Promise<string> {
  const res = await request.post('/api/auth/login').send({
    email,
    password: 'Test@NhamNhi2026',
  });
  return res.body?.data?.accessToken as string;
}
