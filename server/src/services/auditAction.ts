/**
 * Catalog action chuẩn cho AuditLog.
 * Quy ước: `entity.action` dạng kebab-case (KHÔNG dùng UPPERCASE như socket action).
 * Dùng cho mọi nơi gọi `writeAuditLog` để action nhất quán, dễ lọc/hiển thị tiếng Việt.
 */

/**
 * Nhóm action là dữ liệu VẬN HÀNH của tenant (order.*...) — super-admin KHÔNG được xem,
 * chỉ admin (chủ chuỗi) và manager (chi nhánh) thấy trong phạm vi tenant của mình.
 */
export const SUPER_ADMIN_RESTRICTED_PREFIXES = ['order.'] as const;

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
