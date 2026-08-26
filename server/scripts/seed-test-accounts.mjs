/**
 * SEED TÀI KHOẢN TEST (production / bất kỳ env nào) — bản thuần JS, không cần build:
 *   node scripts/seed-test-accounts.mjs
 * Đọc MONGODB_URL từ server/.env, tạo/đồng bộ (upsert theo email) tài khoản test
 * cho từng role + nhà hàng mẫu + cấu hình (kitchen code, bàn, menu) để chạy thử
 * toàn bộ luồng vận hành. IDEMPOTENT: chạy lại nhiều lần không tạo trùng.
 *
 * Mật khẩu dùng chung: Test@NhamNhi2026
 */
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');

const loadEnv = (p) => {
  const out = {};
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
};

const env = loadEnv(envPath);
const uri = env.MONGODB_URL;
if (!uri) throw new Error('Thiếu MONGODB_URL trong server/.env');

const PASSWORD = 'Test@NhamNhi2026';
const DAY = 24 * 3600 * 1000;
const now = new Date();

await mongoose.connect(uri);
console.log('[seed-test-accounts] CONNECT OK');

const db = mongoose.connection.db;
const users = db.collection('users');
const restaurants = db.collection('restaurants');
const settings = db.collection('settings');
const tables = db.collection('tables');
const categories = db.collection('menucategories');
const menuItems = db.collection('menuitems');

const hashed = await bcrypt.hash(PASSWORD, 10);

/** Upsert nhà hàng theo email (unique giữa các nhà hàng test) → trả _id thật. */
async function upsertRestaurant(name, email, data) {
  const filter = { email };
  await restaurants.updateOne(
    filter,
    {
      $set: {
        name,
        email,
        status: 'active',
        operatingHours: '08:00 - 22:00',
        ...data,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
  const doc = await restaurants.findOne(filter);
  return doc._id;
}

/** Upsert user theo email, gắn restaurantIds bằng _id thật. */
async function upsertUser(name, email, role, restaurantIds, extra = {}) {
  const filter = { email };
  await users.updateOne(
    filter,
    {
      $set: {
        name,
        email,
        role,
        restaurantIds,
        password: hashed,
        isActive: true,
        notificationEnabled: true,
        ...extra,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
  const doc = await users.findOne(filter);
  return doc._id;
}

// ─── 1. NHÀ HÀNG ────────────────────────────────────────────────────────────
// Chủ admin.test: 2 cơ sở đang active (test tenant switcher + multi-tenant)
const tenantX = await upsertRestaurant(
  'NhamNhi TEST Cơ Sở 1',
  'test.cs1@nhahangos.me',
  { subscription: 'active', paidUntil: new Date(now.getTime() + 30 * DAY) },
);
const tenantY = await upsertRestaurant(
  'NhamNhi TEST Cơ Sở 2',
  'test.cs2@nhahangos.me',
  { subscription: 'active', paidUntil: new Date(now.getTime() + 30 * DAY) },
);
// Chủ owner.sub: 3 nhà hàng ở 3 trạng thái subscription (test banner/billing)
const tenantSubTrial = await upsertRestaurant(
  'NhamNhi TEST Sub Trial',
  'test.sub.trial@nhahangos.me',
  { subscription: 'trial', trialEndsAt: new Date(now.getTime() + 10 * DAY) },
);
const tenantSubExpiring = await upsertRestaurant(
  'NhamNhi TEST Sub Sắp Hết Hạn',
  'test.sub.expiring@nhahangos.me',
  { subscription: 'trial', trialEndsAt: new Date(now.getTime() + 3 * DAY) },
);
const tenantSubLocked = await upsertRestaurant(
  'NhamNhi TEST Sub Bị Khoá',
  'test.sub.locked@nhahangos.me',
  { subscription: 'locked', paidUntil: new Date(now.getTime() - 5 * DAY) },
);

// ─── 2. NGƯỜI DÙNG (từng role) ─────────────────────────────────────────────
const idSuperAdmin = await upsertUser('Super Admin Test', 'super.admin@nhahangos.me', 'super-admin', []);
const idAdmin = await upsertUser('Admin Test', 'admin.test@nhahangos.me', 'admin', [tenantX, tenantY]);
const idManager = await upsertUser('Manager Test', 'manager.test@nhahangos.me', 'manager', [tenantX]);
const idStaff = await upsertUser('Staff Test', 'staff.test@nhahangos.me', 'staff', [tenantX]);
const idCustomer = await upsertUser('Customer Test', 'customer.test@nhahangos.me', 'customer', []);
// Chủ có 3 nhà hàng subscription để test trial / sắp hết hạn / bị khoá
const idOwnerSub = await upsertUser('Owner Sub Test', 'owner.sub@nhahangos.me', 'admin', [
  tenantSubTrial,
  tenantSubExpiring,
  tenantSubLocked,
]);
await restaurants.updateMany(
  { _id: { $in: [tenantSubTrial, tenantSubExpiring, tenantSubLocked] } },
  { $set: { ownerId: idOwnerSub } },
);
await restaurants.updateMany(
  { _id: { $in: [tenantX, tenantY] } },
  { $set: { ownerId: idAdmin } },
);

// ─── 3. CẤU HÌNH NHÀ HÀNG (kitchen code + bàn + menu) ──────────────────────
await settings.updateOne(
  { scope: 'restaurant', targetModel: 'Restaurant', targetId: tenantX },
  {
    $set: {
      scope: 'restaurant',
      targetModel: 'Restaurant',
      targetId: tenantX,
      paymentMethodType: 'none',
      systemConfig: { autoPushKDS: true, maintenanceMode: false, requireOtpForVoid: true, kitchenCode: '456734' },
      menuConfig: { allowToGo: true, autoHideOut: false },
    },
    $setOnInsert: { createdAt: now },
  },
  { upsert: true },
);
await settings.updateOne(
  { scope: 'restaurant', targetModel: 'Restaurant', targetId: tenantY },
  {
    $set: {
      scope: 'restaurant',
      targetModel: 'Restaurant',
      targetId: tenantY,
      paymentMethodType: 'none',
      systemConfig: { autoPushKDS: true, maintenanceMode: false, requireOtpForVoid: true, kitchenCode: '553572' },
      menuConfig: { allowToGo: true, autoHideOut: false },
    },
    $setOnInsert: { createdAt: now },
  },
  { upsert: true },
);

for (const [restaurantId, tableNumber] of [[tenantX, '1'], [tenantX, '2'], [tenantY, '1'], [tenantY, '2']]) {
  await tables.updateOne(
    { restaurant: restaurantId, tableNumber },
    { $set: { restaurant: restaurantId, tableNumber, status: 'available' }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
}

let categoryX = await categories.findOne({ restaurant: tenantX, name: 'Đồ uống' });
if (!categoryX) {
  const r = await categories.insertOne({ restaurant: tenantX, name: 'Đồ uống', createdAt: now });
  categoryX = { _id: r.insertedId };
}
for (const [name, price] of [['Cà phê sữa', 35000], ['Trà đào', 40000]]) {
  await menuItems.updateOne(
    { restaurant: tenantX, name },
    {
      $set: { restaurant: tenantX, category: categoryX._id, name, price, isAvailable: true },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
}

console.log('[seed-test-accounts] DONE');
console.log('  super-admin : super.admin@nhahangos.me / Test@NhamNhi2026');
console.log('  admin (2 CS) : admin.test@nhahangos.me   / Test@NhamNhi2026');
console.log('  manager      : manager.test@nhahangos.me  / Test@NhamNhi2026');
console.log('  staff        : staff.test@nhahangos.me    / Test@NhamNhi2026');
console.log('  customer     : customer.test@nhahangos.me / Test@NhamNhi2026');
console.log('  owner (3 sub): owner.sub@nhahangos.me     / Test@NhamNhi2026');
console.log(`  kitchen code CS1=456734  CS2=553572`);
console.log(`  id admin=${idAdmin} manager=${idManager} staff=${idStaff} superAdmin=${idSuperAdmin} customer=${idCustomer} ownerSub=${idOwnerSub}`);

await mongoose.disconnect();
console.log('[seed-test-accounts] DISCONNECT OK');
