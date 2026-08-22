/**
 * Catalog action chuẩn cho AuditLog.
 * Quy ước: `entity.action` dạng kebab-case (KHÔNG dùng UPPERCASE như socket action).
 * Dùng cho mọi nơi gọi `writeAuditLog` để action nhất quán, dễ lọc/hiển thị tiếng Việt.
 */

/**
 * Nhóm action là dữ liệu VẬN HÀNH của tenant — super-admin KHÔNG được xem,
 * chỉ admin (chủ chuỗi) và manager (chi nhánh) thấy trong phạm vi tenant của mình.
 *
 * @deprecated Thay bằng whitelist `SUPER_ADMIN_ALLOWED_ACTIONS` (PA-6) — action mới
 * mặc định KHÔNG lộ cho super-admin tới khi được thêm vào danh sách cho phép.
 */
export const SUPER_ADMIN_RESTRICTED_PREFIXES = ['order.'] as const;

/**
 * Whitelist action NỀN TẢNG super-admin được xem trong /api/audit-logs (PA-6).
 * Ngoài danh sách này (order.*, kds-code, nhân sự tenant, menu/bàn/đặt chỗ...)
 * super-admin không thấy — kể cả action mới thêm sau này.
 */
export const SUPER_ADMIN_ALLOWED_ACTIONS = [
  // Tài khoản chủ / người dùng nền tảng
  'user.register',
  'user.block',
  'user.unblock',
  // Nhà hàng (tenant lifecycle)
  'restaurant.create',
  'restaurant.delete',
  'restaurant.lock',
  'restaurant.unlock',
  // Thuê bao & giao dịch gói cước
  'subscription.trial.started',
  'subscription.locked',
  'subscription.unlocked',
  'subscription.expiring',
  'subscription.downgrade',
  'subscription.renewed',
  'subscription.upgraded',
  'transaction.create',
  // Cấu hình nền tảng
  'pricing.create',
  'pricing.update',
  'setting.gateway.update',
] as const;

export const AuditAction = {
  // ============ USER ============
  userRegister: 'user.register',
  userCreate: 'user.create',
  userUpdate: 'user.update',
  userUpdateRole: 'user.update.role',
  userDelete: 'user.delete',
  userBlock: 'user.block',
  userUnblock: 'user.unblock',
  userSwitchTenant: 'user.switch-tenant',

  // ============ RESTAURANT ============
  restaurantCreate: 'restaurant.create',
  restaurantUpdate: 'restaurant.update',
  restaurantDelete: 'restaurant.delete',
  restaurantLock: 'restaurant.lock',
  restaurantUnlock: 'restaurant.unlock',

  // ============ SUBSCRIPTION / TRANSACTION ============
  subscriptionTrialStarted: 'subscription.trial.started',
  subscriptionLocked: 'subscription.locked',
  subscriptionUnlocked: 'subscription.unlocked',
  subscriptionExpiring: 'subscription.expiring',
  subscriptionRenewed: 'subscription.renewed',
  subscriptionUpgraded: 'subscription.upgraded',
  transactionCreate: 'transaction.create',

  // ============ PAYMENT ============
  paymentCaptured: 'payment.captured',
  paymentRefund: 'payment.refund',

  // ============ ORDER ============
  orderCreate: 'order.create',
  orderUpdate: 'order.update',
  orderUpdateStatus: 'order.update.status',
  orderItemUpdate: 'order.item.update',
  orderItemRemove: 'order.item.remove',
  orderMoveTable: 'order.move.table',

  // ============ MENU ============
  menuItemUpdate: 'menuItem.update',

  // ============ TABLE ============
  tableUpdate: 'table.update',

  // ============ RESERVATION ============
  reservationUpdate: 'reservation.update',

  // ============ SETTING / GATEWAY ============
  settingKdsCodeGenerate: 'setting.kds-code.generate',
  settingPayosUpdate: 'setting.payos.update',
  gatewayUpdate: 'setting.gateway.update',

  // ============ PRICING ============
  pricingCreate: 'pricing.create',
  pricingUpdate: 'pricing.update',
} as const;

export type AuditActionKey = (typeof AuditAction)[keyof typeof AuditAction];
