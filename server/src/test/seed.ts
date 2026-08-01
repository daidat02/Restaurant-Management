import { Types } from 'mongoose';
import bcrypt from 'bcrypt';
import DB_Connection from '../models/DB_Connection.js';

/** Mật khẩu dùng chung cho mọi tài khoản seed. */
export const TEST_PASSWORD = 'Test@NhamNhi2026';

const oid = (hex: string) => new Types.ObjectId(hex);

/** ObjectId cố định để test ổn định (giống multi-tenant spec). */
export const SEED_IDS = {
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

  auditLogX: oid('69fccba996a14809070b9eff'),
  auditLogY: oid('69fb58d6ca9d7bade016e91f'),

  // --- Subscription owner test (T7 frontend chủ) ---
  ownerSub: oid('69fccba996a14809070b9e00'),
  tenantSubTrial: oid('69fccba996a14809070b9e01'),
  tenantSubExpiring: oid('69fccba996a14809070b9e02'),
  tenantSubLocked: oid('69fccba996a14809070b9e03'),
} as const;

const TENANT_X_USERS = [
  { _id: SEED_IDS.adminX, name: 'Admin Test', email: 'admin.test@nhamnhi.vn', role: 'admin', restaurantIds: [SEED_IDS.tenantX, SEED_IDS.tenantY] },
  { _id: SEED_IDS.managerX, name: 'Manager Test', email: 'manager.test@nhamnhi.vn', role: 'manager', restaurantIds: [SEED_IDS.tenantX] },
  { _id: SEED_IDS.staffX, name: 'Staff Test', email: 'staff.test@nhamnhi.vn', role: 'staff', restaurantIds: [SEED_IDS.tenantX] },
] as const;

const TENANT_Y_USERS = [
  { _id: SEED_IDS.staffY, name: 'Staff Y Test', email: 'staffY.test@nhamnhi.vn', role: 'staff', restaurantIds: [SEED_IDS.tenantY] },
] as const;

const PLATFORM_USERS = [
  { _id: SEED_IDS.customer, name: 'Customer Test', email: 'customer.test@nhamnhi.vn', role: 'customer', restaurantIds: [] as Types.ObjectId[] },
  { _id: SEED_IDS.superAdmin, name: 'Super Admin', email: 'super.admin@nhamnhi.vn', role: 'super-admin', restaurantIds: [] as Types.ObjectId[] },
  {
    _id: SEED_IDS.ownerSub,
    name: 'Owner Sub Test',
    email: 'owner.sub@nhamnhi.vn',
    role: 'admin',
    restaurantIds: [
      SEED_IDS.tenantSubTrial,
      SEED_IDS.tenantSubExpiring,
      SEED_IDS.tenantSubLocked,
    ] as Types.ObjectId[],
  },
] as const;

async function seedUsers(): Promise<void> {
  const hashed = await bcrypt.hash(TEST_PASSWORD, 10);
  const users = [...TENANT_X_USERS, ...TENANT_Y_USERS, ...PLATFORM_USERS].map((u) => ({
    ...u,
    password: hashed,
    isActive: true,
    notificationEnabled: true,
  }));
  await DB_Connection.User.insertMany(users);
}

async function seedRestaurants(): Promise<void> {
  const now = new Date();
  await DB_Connection.Restaurant.insertMany([
    {
      _id: SEED_IDS.tenantX,
      name: 'NhamNhi Cơ Sở 1',
      email: 'cs1@nhamnhi.vn',
      status: 'active',
      ownerId: SEED_IDS.adminX,
      subscription: 'active',
      paidUntil: new Date(now.getTime() + 30 * 24 * 3600 * 1000),
    },
    {
      _id: SEED_IDS.tenantY,
      name: 'NhamNhi Cơ Sở 2',
      email: 'cs2@nhamnhi.vn',
      status: 'active',
      ownerId: SEED_IDS.adminX,
      subscription: 'active',
      paidUntil: new Date(now.getTime() + 30 * 24 * 3600 * 1000),
    },
    // Chủ test subscription (T7): 3 nhà hàng ở 3 trạng thái
    {
      _id: SEED_IDS.tenantSubTrial,
      name: 'NhamNhi Sub Trial',
      email: 'sub.trial@nhamnhi.vn',
      status: 'active',
      ownerId: SEED_IDS.ownerSub,
      subscription: 'trial',
      trialEndsAt: new Date(now.getTime() + 10 * 24 * 3600 * 1000),
    },
    {
      _id: SEED_IDS.tenantSubExpiring,
      name: 'NhamNhi Sub Sắp Hết Hạn',
      email: 'sub.expiring@nhamnhi.vn',
      status: 'active',
      ownerId: SEED_IDS.ownerSub,
      subscription: 'trial',
      trialEndsAt: new Date(now.getTime() + 3 * 24 * 3600 * 1000),
    },
    {
      _id: SEED_IDS.tenantSubLocked,
      name: 'NhamNhi Sub Bị Khoá',
      email: 'sub.locked@nhamnhi.vn',
      status: 'active',
      ownerId: SEED_IDS.ownerSub,
      subscription: 'locked',
      paidUntil: new Date(now.getTime() - 5 * 24 * 3600 * 1000),
    },
  ]);
}

async function seedSettings(): Promise<void> {
  await DB_Connection.Setting.insertMany([
    {
      _id: SEED_IDS.settingX,
      scope: 'restaurant',
      targetModel: 'Restaurant',
      targetId: SEED_IDS.tenantX,
      paymentMethodType: 'payos',
      integrations: {
        payOS: { clientId: 'x-client', apiKey: 'x-key', checksumKey: 'x-checksum' },
      },
      systemConfig: {
        autoPushKDS: true,
        maintenanceMode: false,
        requireOtpForVoid: false,
        kitchenCode: '456734',
      },
    },
    {
      _id: SEED_IDS.settingY,
      scope: 'restaurant',
      targetModel: 'Restaurant',
      targetId: SEED_IDS.tenantY,
      paymentMethodType: 'none',
      integrations: { payOS: {} },
      systemConfig: {
        autoPushKDS: true,
        maintenanceMode: false,
        requireOtpForVoid: false,
        kitchenCode: '553572',
      },
    },
  ]);
}

async function seedTables(): Promise<void> {
  await DB_Connection.Table.insertMany([
    { _id: SEED_IDS.tableX1, restaurant: SEED_IDS.tenantX, tableNumber: '1', status: 'available' },
    { _id: SEED_IDS.tableX2, restaurant: SEED_IDS.tenantX, tableNumber: '2', status: 'available' },
    { _id: SEED_IDS.tableY1, restaurant: SEED_IDS.tenantY, tableNumber: '1', status: 'available' },
    { _id: SEED_IDS.tableY2, restaurant: SEED_IDS.tenantY, tableNumber: '2', status: 'available' },
  ]);
}

async function seedMenu(): Promise<void> {
  await DB_Connection.MenuCategory.insertMany([
    { _id: SEED_IDS.categoryX, name: 'Đồ uống', restaurant: SEED_IDS.tenantX },
    { _id: SEED_IDS.categoryY, name: 'Món chính', restaurant: SEED_IDS.tenantY },
  ]);
  await DB_Connection.MenuItem.insertMany([
    { _id: SEED_IDS.menuItemX1, category: SEED_IDS.categoryX, restaurant: SEED_IDS.tenantX, name: 'Cà phê sữa', price: 35000, isAvailable: true },
    { _id: SEED_IDS.menuItemX2, category: SEED_IDS.categoryX, restaurant: SEED_IDS.tenantX, name: 'Trà đào', price: 40000, isAvailable: true },
    { _id: SEED_IDS.menuItemY1, category: SEED_IDS.categoryY, restaurant: SEED_IDS.tenantY, name: 'Cơm tấm', price: 50000, isAvailable: true },
    { _id: SEED_IDS.menuItemY2, category: SEED_IDS.categoryY, restaurant: SEED_IDS.tenantY, name: 'Phở bò', price: 60000, isAvailable: true },
  ]);
}

async function seedOrders(): Promise<void> {
  const now = new Date();

  await DB_Connection.OrderItem.insertMany([
    {
      _id: SEED_IDS.orderItemXActive,
      order: SEED_IDS.orderXActive,
      restaurant: SEED_IDS.tenantX,
      menuItem: SEED_IDS.menuItemX1,
      nameSnapshot: 'Cà phê sữa',
      priceSnapshot: 35000,
      quantity: 2,
      status: 'preparing',
    },
    {
      _id: SEED_IDS.orderItemXPaid,
      order: SEED_IDS.orderXPaid,
      restaurant: SEED_IDS.tenantX,
      menuItem: SEED_IDS.menuItemX2,
      nameSnapshot: 'Trà đào',
      priceSnapshot: 40000,
      quantity: 1,
      status: 'served',
    },
    {
      _id: SEED_IDS.orderItemYActive,
      order: SEED_IDS.orderYActive,
      restaurant: SEED_IDS.tenantY,
      menuItem: SEED_IDS.menuItemY1,
      nameSnapshot: 'Cơm tấm',
      priceSnapshot: 50000,
      quantity: 1,
      status: 'pending',
    },
    {
      _id: SEED_IDS.orderItemYPaid,
      order: SEED_IDS.orderYPaid,
      restaurant: SEED_IDS.tenantY,
      menuItem: SEED_IDS.menuItemY2,
      nameSnapshot: 'Phở bò',
      priceSnapshot: 60000,
      quantity: 1,
      status: 'served',
    },
  ]);

  await DB_Connection.Order.insertMany([
    {
      _id: SEED_IDS.orderXActive,
      orderId: 'ORD-X-001',
      restaurant: SEED_IDS.tenantX,
      table: SEED_IDS.tableX1,
      orderType: 'dine-in',
      status: 'confirmed',
      paymentStatus: 'unpaid',
      totalAmount: 70000,
      itemsCount: 2,
      items: [SEED_IDS.orderItemXActive],
    },
    {
      _id: SEED_IDS.orderXPaid,
      orderId: 'ORD-X-002',
      restaurant: SEED_IDS.tenantX,
      table: SEED_IDS.tableX2,
      orderType: 'dine-in',
      status: 'paid',
      paymentStatus: 'paid',
      totalAmount: 40000,
      itemsCount: 1,
      items: [SEED_IDS.orderItemXPaid],
      paidAt: now,
    },
    {
      _id: SEED_IDS.orderYActive,
      orderId: 'ORD-Y-001',
      restaurant: SEED_IDS.tenantY,
      table: SEED_IDS.tableY1,
      orderType: 'dine-in',
      status: 'confirmed',
      paymentStatus: 'unpaid',
      totalAmount: 50000,
      itemsCount: 1,
      items: [SEED_IDS.orderItemYActive],
    },
    {
      _id: SEED_IDS.orderYPaid,
      orderId: 'ORD-Y-002',
      restaurant: SEED_IDS.tenantY,
      table: SEED_IDS.tableY2,
      orderType: 'dine-in',
      status: 'paid',
      paymentStatus: 'paid',
      totalAmount: 60000,
      itemsCount: 1,
      items: [SEED_IDS.orderItemYPaid],
      paidAt: now,
    },
  ]);
}

async function seedReservations(): Promise<void> {
  const now = new Date();
  await DB_Connection.Reservation.insertMany([
    {
      _id: SEED_IDS.reservationX,
      reservationId: 'RV-X-001',
      restaurant: SEED_IDS.tenantX,
      table: SEED_IDS.tableX1,
      customerInfo: { name: 'Khách A', phoneNumber: '0900000001' },
      reservationTime: '19:00',
      safe_check_time: now,
      date: now,
      partySize: 2,
      status: 'pending',
    },
    {
      _id: SEED_IDS.reservationY,
      reservationId: 'RV-Y-001',
      restaurant: SEED_IDS.tenantY,
      table: SEED_IDS.tableY1,
      customerInfo: { name: 'Khách B', phoneNumber: '0900000002' },
      reservationTime: '20:00',
      safe_check_time: now,
      date: now,
      partySize: 4,
      status: 'pending',
    },
  ]);
}

async function seedNotifications(): Promise<void> {
  await DB_Connection.Notification.insertMany([
    {
      _id: SEED_IDS.notificationX,
      restaurant: SEED_IDS.tenantX,
      user: SEED_IDS.managerX,
      type: 'new_order',
      message: 'Có đơn hàng mới',
      isRead: false,
    },
    {
      _id: SEED_IDS.notificationY,
      restaurant: SEED_IDS.tenantY,
      user: SEED_IDS.staffY,
      type: 'new_order',
      message: 'Có đơn hàng mới',
      isRead: false,
    },
  ]);
}

async function seedPayments(): Promise<void> {
  await DB_Connection.Payment.insertMany([
    {
      _id: SEED_IDS.paymentX,
      order: SEED_IDS.orderXPaid,
      restaurant: SEED_IDS.tenantX,
      orderCode: 1001,
      amount: 40000,
      method: 'cash',
      status: 'captured',
      transactionId: 'TXN-X-001',
    },
    {
      _id: SEED_IDS.paymentY,
      order: SEED_IDS.orderYPaid,
      restaurant: SEED_IDS.tenantY,
      orderCode: 2001,
      amount: 60000,
      method: 'cash',
      status: 'captured',
      transactionId: 'TXN-Y-001',
    },
  ]);
}

async function seedAuditLogs(): Promise<void> {
  await DB_Connection.AuditLog.insertMany([
    {
      _id: SEED_IDS.auditLogX,
      action: 'order.create',
      restaurant: SEED_IDS.tenantX,
      actor: SEED_IDS.adminX,
      actorInfo: { name: 'Admin Test', role: 'admin' },
      targetType: 'order',
      targetId: SEED_IDS.orderXActive,
      summary: 'Tạo đơn ORD-X-001',
    },
    {
      _id: SEED_IDS.auditLogY,
      action: 'order.create',
      restaurant: SEED_IDS.tenantY,
      actor: SEED_IDS.staffY,
      actorInfo: { name: 'Staff Y Test', role: 'staff' },
      targetType: 'order',
      targetId: SEED_IDS.orderYActive,
      summary: 'Tạo đơn ORD-Y-001',
    },
  ]);
}

/**
 * Seed toàn bộ dữ liệu chuẩn cho integration test.
 * Mỗi test file gọi lại (sau khi drop database) để đảm bảo trạng thái fresh.
 */
export async function seedDatabase(): Promise<void> {
  await seedRestaurants();
  await seedUsers();
  await seedSettings();
  await seedTables();
  await seedMenu();
  await seedOrders();
  await seedReservations();
  await seedNotifications();
  await seedPayments();
  await seedAuditLogs();
}
