/**
 * SEED DỮ LIỆU TEST ĐẦY ĐỦ (cho môi trường dev/environment bất kỳ) — bản thuần JS:
 *   node scripts/seed-test-data.mjs
 * Đọc MONGODB_URL từ server/.env, xoá các collection mẫu rồi seed lại đúng bộ dữ liệu
 * như test integration (src/test/seed.ts): 2 cơ sở + 3 nhà hàng subscription, đủ role,
 * cấu hình, bàn, menu, đơn + món, đặt bàn, thông báo, thanh toán, giao dịch, audit log.
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
const oid = (hex) => new mongoose.Types.ObjectId(hex);

// ObjectId cố định giống test/seed.ts
const ID = {
  tenantX: oid('69fccba996a14809070b9ef2'),
  tenantY: oid('69fb58d6ca9d7bade016e912'),
  settingX: oid('6a314d4142a2baf0dcd935f8'),
  settingY: oid('6a6d6b0a660a34d8774b88b5'),

  adminX: oid('69fccba996a14809070b9ee1'),
  managerX: oid('69fccba996a14809070b9ee2'),
  staffX: oid('69fccba996a14809070b9ee3'),
  staffY: oid('69fb58d6ca9d7bade016e904'),
  customer: oid('69fccba996a14809070b9ee5'),
  superAdmin: oid('69fccba996a14809070b9ee6'),

  tableX1: oid('69fccba996a14809070b9ef3'),
  tableX2: oid('69fccba996a14809070b9ef4'),
  tableY1: oid('69fb58d6ca9d7bade016e913'),
  tableY2: oid('69fb58d6ca9d7bade016e914'),

  categoryX: oid('69fccba996a14809070b9ef5'),
  categoryY: oid('69fb58d6ca9d7bade016e915'),

  menuItemX1: oid('69fccba996a14809070b9ef6'),
  menuItemX2: oid('69fccba996a14809070b9ef7'),
  menuItemY1: oid('69fb58d6ca9d7bade016e916'),
  menuItemY2: oid('69fb58d6ca9d7bade016e917'),

  orderXActive: oid('69fccba996a14809070b9ef8'),
  orderXPaid: oid('69fccba996a14809070b9ef9'),
  orderYActive: oid('69fb58d6ca9d7bade016e918'),
  orderYPaid: oid('69fb58d6ca9d7bade016e919'),

  orderItemXActive: oid('69fccba996a14809070b9efa'),
  orderItemXPaid: oid('69fccba996a14809070b9efb'),
  orderItemYActive: oid('69fb58d6ca9d7bade016e91a'),
  orderItemYPaid: oid('69fb58d6ca9d7bade016e91b'),

  reservationX: oid('69fccba996a14809070b9efc'),
  reservationY: oid('69fb58d6ca9d7bade016e91c'),

  notificationX: oid('69fccba996a14809070b9efd'),
  notificationY: oid('69fb58d6ca9d7bade016e91d'),

  paymentX: oid('69fccba996a14809070b9efe'),
  paymentY: oid('69fb58d6ca9d7bade016e91e'),

  transactionX: oid('69fccba996a14809070b9e04'),
  transactionY: oid('69fccba996a14809070b9e05'),

  auditLogX: oid('69fccba996a14809070b9eff'),
  auditLogY: oid('69fb58d6ca9d7bade016e91f'),

  ownerSub: oid('69fccba996a14809070b9e00'),
  tenantSubTrial: oid('69fccba996a14809070b9e01'),
  tenantSubExpiring: oid('69fccba996a14809070b9e02'),
  tenantSubLocked: oid('69fccba996a14809070b9e03'),
};

await mongoose.connect(uri);
console.log('[seed-test-data] CONNECT OK');

const db = mongoose.connection.db;

const COLLECTIONS = [
  'users',
  'restaurants',
  'settings',
  'tables',
  'menucategories',
  'menuitems',
  'orders',
  'orderitems',
  'reservations',
  'notifications',
  'payments',
  'transactions',
  'auditlogs',
];
for (const name of COLLECTIONS) {
  await db.collection(name).deleteMany({});
  console.log(`[seed-test-data] cleared ${name}`);
}

const hashed = await bcrypt.hash(PASSWORD, 10);

// ─── 1. NHÀ HÀNG ────────────────────────────────────────────────────────────
await db.collection('restaurants').insertMany([
  {
    _id: ID.tenantX,
    name: 'NhamNhi Cơ Sở 1',
    email: 'cs1@nhahangos.me',
    status: 'active',
    ownerId: ID.adminX,
    subscription: 'active',
    paidUntil: new Date(now.getTime() + 30 * DAY),
    currentPlanKey: 'pro',
    operatingHours: '08:00 - 22:00',
    createdAt: now,
    updatedAt: now,
  },
  {
    _id: ID.tenantY,
    name: 'NhamNhi Cơ Sở 2',
    email: 'cs2@nhahangos.me',
    status: 'active',
    ownerId: ID.adminX,
    subscription: 'active',
    paidUntil: new Date(now.getTime() + 30 * DAY),
    currentPlanKey: 'pro',
    operatingHours: '08:00 - 22:00',
    createdAt: now,
    updatedAt: now,
  },
  {
    _id: ID.tenantSubTrial,
    name: 'NhamNhi Sub Trial',
    email: 'sub.trial@nhahangos.me',
    status: 'active',
    ownerId: ID.ownerSub,
    subscription: 'trial',
    trialEndsAt: new Date(now.getTime() + 10 * DAY),
    currentPlanKey: 'basic',
    operatingHours: '08:00 - 22:00',
    createdAt: now,
    updatedAt: now,
  },
  {
    _id: ID.tenantSubExpiring,
    name: 'NhamNhi Sub Sắp Hết Hạn',
    email: 'sub.expiring@nhahangos.me',
    status: 'active',
    ownerId: ID.ownerSub,
    subscription: 'trial',
    trialEndsAt: new Date(now.getTime() + 3 * DAY),
    currentPlanKey: 'basic',
    operatingHours: '08:00 - 22:00',
    createdAt: now,
    updatedAt: now,
  },
  {
    _id: ID.tenantSubLocked,
    name: 'NhamNhi Sub Bị Khoá',
    email: 'sub.locked@nhahangos.me',
    status: 'active',
    ownerId: ID.ownerSub,
    subscription: 'locked',
    paidUntil: new Date(now.getTime() - 5 * DAY),
    currentPlanKey: 'pro',
    operatingHours: '08:00 - 22:00',
    createdAt: now,
    updatedAt: now,
  },
]);
console.log('[seed-test-data] restaurants OK (5)');

// ─── 2. NGƯỜI DÙNG ──────────────────────────────────────────────────────────
await db.collection('users').insertMany([
  { _id: ID.adminX, name: 'Admin Test', email: 'admin.test@nhahangos.me', role: 'admin', restaurantIds: [ID.tenantX, ID.tenantY], password: hashed, isActive: true, notificationEnabled: true, createdAt: now, updatedAt: now },
  { _id: ID.managerX, name: 'Manager Test', email: 'manager.test@nhahangos.me', role: 'manager', restaurantIds: [ID.tenantX], password: hashed, isActive: true, notificationEnabled: true, createdAt: now, updatedAt: now },
  { _id: ID.staffX, name: 'Staff Test', email: 'staff.test@nhahangos.me', role: 'staff', restaurantIds: [ID.tenantX], password: hashed, isActive: true, notificationEnabled: true, createdAt: now, updatedAt: now },
  { _id: ID.staffY, name: 'Staff Y Test', email: 'staffY.test@nhahangos.me', role: 'staff', restaurantIds: [ID.tenantY], password: hashed, isActive: true, notificationEnabled: true, createdAt: now, updatedAt: now },
  { _id: ID.customer, name: 'Customer Test', email: 'customer.test@nhahangos.me', role: 'customer', restaurantIds: [], password: hashed, isActive: true, notificationEnabled: true, createdAt: now, updatedAt: now },
  { _id: ID.superAdmin, name: 'Super Admin', email: 'super.admin@nhahangos.me', role: 'super-admin', restaurantIds: [], password: hashed, isActive: true, notificationEnabled: true, createdAt: now, updatedAt: now },
  { _id: ID.ownerSub, name: 'Owner Sub Test', email: 'owner.sub@nhahangos.me', role: 'admin', restaurantIds: [ID.tenantSubTrial, ID.tenantSubExpiring, ID.tenantSubLocked], password: hashed, isActive: true, notificationEnabled: true, createdAt: now, updatedAt: now },
]);
console.log('[seed-test-data] users OK (7)');

// ─── 3. CẤU HÌNH (SETTING) ──────────────────────────────────────────────────
await db.collection('settings').insertMany([
  {
    _id: ID.settingX,
    scope: 'restaurant',
    targetModel: 'Restaurant',
    targetId: ID.tenantX,
    paymentMethodType: 'payos',
    integrations: { payOS: { clientId: 'x-client', apiKey: 'x-key', checksumKey: 'x-checksum' } },
    systemConfig: { autoPushKDS: true, maintenanceMode: false, requireOtpForVoid: false, kitchenCode: '456734' },
    createdAt: now,
    updatedAt: now,
  },
  {
    _id: ID.settingY,
    scope: 'restaurant',
    targetModel: 'Restaurant',
    targetId: ID.tenantY,
    paymentMethodType: 'none',
    integrations: { payOS: {} },
    systemConfig: { autoPushKDS: true, maintenanceMode: false, requireOtpForVoid: false, kitchenCode: '553572' },
    createdAt: now,
    updatedAt: now,
  },
]);
console.log('[seed-test-data] settings OK (2)');

// ─── 4. BÀN ─────────────────────────────────────────────────────────────────
await db.collection('tables').insertMany([
  { _id: ID.tableX1, restaurant: ID.tenantX, tableNumber: '1', status: 'available', createdAt: now, updatedAt: now },
  { _id: ID.tableX2, restaurant: ID.tenantX, tableNumber: '2', status: 'available', createdAt: now, updatedAt: now },
  { _id: ID.tableY1, restaurant: ID.tenantY, tableNumber: '1', status: 'available', createdAt: now, updatedAt: now },
  { _id: ID.tableY2, restaurant: ID.tenantY, tableNumber: '2', status: 'available', createdAt: now, updatedAt: now },
]);
console.log('[seed-test-data] tables OK (4)');

// ─── 5. MENU ────────────────────────────────────────────────────────────────
await db.collection('menucategories').insertMany([
  { _id: ID.categoryX, name: 'Đồ uống', restaurant: ID.tenantX, createdAt: now, updatedAt: now },
  { _id: ID.categoryY, name: 'Món chính', restaurant: ID.tenantY, createdAt: now, updatedAt: now },
]);
await db.collection('menuitems').insertMany([
  {
    _id: ID.menuItemX1,
    category: ID.categoryX,
    restaurant: ID.tenantX,
    name: 'Cà phê sữa',
    price: 35000,
    isAvailable: true,
    tags: [],
    optionGroups: [
      {
        name: 'Topping',
        type: 'multiple',
        required: false,
        min: 0,
        max: 3,
        choices: [
          { name: 'Trân châu', price: 5000 },
          { name: 'Thạch', price: 4000 },
          { name: 'Kem sữa', price: 6000 },
        ],
      },
      {
        name: 'Đường',
        type: 'single',
        required: true,
        choices: [
          { name: 'Ít đường', price: 0 },
          { name: 'Bình thường', price: 0 },
        ],
      },
    ],
    createdAt: now,
    updatedAt: now,
  },
  { _id: ID.menuItemX2, category: ID.categoryX, restaurant: ID.tenantX, name: 'Trà đào', price: 40000, isAvailable: true, tags: [], createdAt: now, updatedAt: now },
  { _id: ID.menuItemY1, category: ID.categoryY, restaurant: ID.tenantY, name: 'Cơm tấm', price: 50000, isAvailable: true, tags: [], createdAt: now, updatedAt: now },
  { _id: ID.menuItemY2, category: ID.categoryY, restaurant: ID.tenantY, name: 'Phở bò', price: 60000, isAvailable: true, tags: [], createdAt: now, updatedAt: now },
]);
console.log('[seed-test-data] menu OK (2 categories / 4 items)');

// ─── 6. MÓN TRONG ĐƠN + ĐƠN ─────────────────────────────────────────────────
await db.collection('orderitems').insertMany([
  { _id: ID.orderItemXActive, order: ID.orderXActive, restaurant: ID.tenantX, menuItem: ID.menuItemX1, nameSnapshot: 'Cà phê sữa', priceSnapshot: 35000, quantity: 2, status: 'preparing', createdAt: now, updatedAt: now },
  { _id: ID.orderItemXPaid, order: ID.orderXPaid, restaurant: ID.tenantX, menuItem: ID.menuItemX2, nameSnapshot: 'Trà đào', priceSnapshot: 40000, quantity: 1, status: 'served', createdAt: now, updatedAt: now },
  { _id: ID.orderItemYActive, order: ID.orderYActive, restaurant: ID.tenantY, menuItem: ID.menuItemY1, nameSnapshot: 'Cơm tấm', priceSnapshot: 50000, quantity: 1, status: 'pending', createdAt: now, updatedAt: now },
  { _id: ID.orderItemYPaid, order: ID.orderYPaid, restaurant: ID.tenantY, menuItem: ID.menuItemY2, nameSnapshot: 'Phở bò', priceSnapshot: 60000, quantity: 1, status: 'served', createdAt: now, updatedAt: now },
]);

await db.collection('orders').insertMany([
  { _id: ID.orderXActive, orderId: 'ORD-X-001', restaurant: ID.tenantX, table: ID.tableX1, orderType: 'dine-in', status: 'confirmed', paymentStatus: 'unpaid', totalAmount: 70000, itemsCount: 2, items: [ID.orderItemXActive], createdAt: now, updatedAt: now },
  { _id: ID.orderXPaid, orderId: 'ORD-X-002', restaurant: ID.tenantX, table: ID.tableX2, orderType: 'dine-in', status: 'paid', paymentStatus: 'paid', totalAmount: 40000, itemsCount: 1, items: [ID.orderItemXPaid], paidAt: now, createdAt: now, updatedAt: now },
  { _id: ID.orderYActive, orderId: 'ORD-Y-001', restaurant: ID.tenantY, table: ID.tableY1, orderType: 'dine-in', status: 'confirmed', paymentStatus: 'unpaid', totalAmount: 50000, itemsCount: 1, items: [ID.orderItemYActive], createdAt: now, updatedAt: now },
  { _id: ID.orderYPaid, orderId: 'ORD-Y-002', restaurant: ID.tenantY, table: ID.tableY2, orderType: 'dine-in', status: 'paid', paymentStatus: 'paid', totalAmount: 60000, itemsCount: 1, items: [ID.orderItemYPaid], paidAt: now, createdAt: now, updatedAt: now },
]);
console.log('[seed-test-data] orders OK (4 orders / 4 items)');

// ─── 7. ĐẶT BÀN ─────────────────────────────────────────────────────────────
await db.collection('reservations').insertMany([
  { _id: ID.reservationX, reservationId: 'RV-X-001', restaurant: ID.tenantX, table: ID.tableX1, customerInfo: { name: 'Khách A', phoneNumber: '0900000001' }, reservationTime: '19:00', safe_check_time: now, date: now, partySize: 2, status: 'pending', createdAt: now, updatedAt: now },
  { _id: ID.reservationY, reservationId: 'RV-Y-001', restaurant: ID.tenantY, table: ID.tableY1, customerInfo: { name: 'Khách B', phoneNumber: '0900000002' }, reservationTime: '20:00', safe_check_time: now, date: now, partySize: 4, status: 'pending', createdAt: now, updatedAt: now },
]);
console.log('[seed-test-data] reservations OK (2)');

// ─── 8. THÔNG BÁO ───────────────────────────────────────────────────────────
await db.collection('notifications').insertMany([
  { _id: ID.notificationX, restaurant: ID.tenantX, user: ID.managerX, type: 'new_order', message: 'Có đơn hàng mới', isRead: false, createdAt: now, updatedAt: now },
  { _id: ID.notificationY, restaurant: ID.tenantY, user: ID.staffY, type: 'new_order', message: 'Có đơn hàng mới', isRead: false, createdAt: now, updatedAt: now },
]);
console.log('[seed-test-data] notifications OK (2)');

// ─── 9. THANH TOÁN ──────────────────────────────────────────────────────────
await db.collection('payments').insertMany([
  { _id: ID.paymentX, order: ID.orderXPaid, restaurant: ID.tenantX, orderCode: 1001, amount: 40000, method: 'cash', status: 'captured', transactionId: 'TXN-X-001', createdAt: now, updatedAt: now },
  { _id: ID.paymentY, order: ID.orderYPaid, restaurant: ID.tenantY, orderCode: 2001, amount: 60000, method: 'cash', status: 'captured', transactionId: 'TXN-Y-001', createdAt: now, updatedAt: now },
]);
console.log('[seed-test-data] payments OK (2)');

// ─── 10. GIAO DỊCH PHÍ CHUỖI ───────────────────────────────────────────────
await db.collection('transactions').insertMany([
  { _id: ID.transactionX, restaurant: ID.tenantX, ownerId: ID.adminX, transactionId: '20260801000001', amount: 299000, cycleMonths: 1, type: 'restaurant-fee', status: 'paid', paidUntil: new Date(now.getTime() + 30 * DAY), createdAt: now, updatedAt: now },
  { _id: ID.transactionY, restaurant: ID.tenantY, ownerId: ID.adminX, transactionId: '20260801000002', amount: 299000, cycleMonths: 1, type: 'restaurant-fee', status: 'paid', paidUntil: new Date(now.getTime() + 30 * DAY), createdAt: now, updatedAt: now },
]);
console.log('[seed-test-data] transactions OK (2)');

// ─── 11. AUDIT LOG ──────────────────────────────────────────────────────────
await db.collection('auditlogs').insertMany([
  { _id: ID.auditLogX, action: 'order.create', restaurant: ID.tenantX, actor: ID.adminX, actorInfo: { name: 'Admin Test', role: 'admin' }, targetType: 'order', targetId: ID.orderXActive, summary: 'Tạo đơn ORD-X-001', createdAt: now },
  { _id: ID.auditLogY, action: 'order.create', restaurant: ID.tenantY, actor: ID.staffY, actorInfo: { name: 'Staff Y Test', role: 'staff' }, targetType: 'order', targetId: ID.orderYActive, summary: 'Tạo đơn ORD-Y-001', createdAt: now },
]);
console.log('[seed-test-data] audit logs OK (2)');

await db.collection('orders').updateMany(
  { _id: { $in: [ID.orderXActive, ID.orderXPaid] } },
  { $set: { customerByAdmin: { name: 'Khách quầy', phoneNumber: '0900000000' } } },
);

console.log('[seed-test-data] DONE');
console.log('  super-admin : super.admin@nhahangos.me / Test@NhamNhi2026');
console.log('  admin (2 CS) : admin.test@nhahangos.me   / Test@NhamNhi2026');
console.log('  manager      : manager.test@nhahangos.me  / Test@NhamNhi2026');
console.log('  staff        : staff.test@nhahangos.me    / Test@NhamNhi2026');
console.log('  staff Y      : staffY.test@nhahangos.me   / Test@NhamNhi2026');
console.log('  customer     : customer.test@nhahangos.me / Test@NhamNhi2026');
console.log('  owner (3 sub): owner.sub@nhahangos.me     / Test@NhamNhi2026');
console.log(`  kitchen code CS1=456734  CS2=553572`);

await mongoose.disconnect();
console.log('[seed-test-data] DISCONNECT OK');