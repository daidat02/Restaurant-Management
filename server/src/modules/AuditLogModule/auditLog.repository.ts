import DB_Connection from '../../models/DB_Connection.js';
import { Types } from 'mongoose';

/**
 * Resolve tên hiển thị cho target theo từng loại (không trả id thô).
 * Mỗi targetType → collection + field tên tương ứng.
 */
async function resolveTargetNames(
  logs: { targetType: string; targetId?: unknown }[],
): Promise<Map<string, string>> {
  const groups = new Map<string, Types.ObjectId[]>();
  for (const log of logs) {
    if (!log.targetId) continue;
    const key = log.targetType || 'system';
    const list = groups.get(key) ?? [];
    list.push(new Types.ObjectId(String(log.targetId)));
    groups.set(key, list);
  }

  const nameFieldByType: Record<string, { collection: keyof typeof DB_Connection; field: string }> = {
    order: { collection: 'Order', field: 'orderId' },
    table: { collection: 'Table', field: 'tableNumber' },
    menuItem: { collection: 'MenuItem', field: 'name' },
    user: { collection: 'User', field: 'name' },
    payment: { collection: 'Payment', field: 'transactionId' },
    restaurant: { collection: 'Restaurant', field: 'name' },
    subscription: { collection: 'Restaurant', field: 'name' },
    reservation: { collection: 'Reservation', field: 'reservationId' },
    setting: { collection: 'Setting', field: '_id' },
    conversation: { collection: 'Conversation', field: 'name' },
    pricing: { collection: 'PricingConfig', field: 'name' },
    refund: { collection: 'Payment', field: 'transactionId' },
  };

  const result = new Map<string, string>();
  for (const [type, ids] of groups) {
    const config = nameFieldByType[type];
    if (!config) continue;
    const model = DB_Connection[config.collection] as any;
    if (!model) continue;
    const docs = await model
      .find({ _id: { $in: ids } })
      .select(config.field)
      .lean()
      .exec();
    for (const doc of docs) {
      const value = (doc as any)[config.field];
      const label = String(value ?? doc._id);
      result.set(String(doc._id), type === 'table' ? `Bàn ${label}` : label);
    }
  }
  return result;
}

/** Truy vấn audit log theo restaurant (optional, hỗ trợ mảng $in) + phân trang. */
export async function listAuditLogs(params: {
  restaurantIds?: string[];
  /** Whitelist action được phép xem (super-admin — chỉ thấy action nền tảng). */
  allowedActions?: string[];
  page?: number;
  limit?: number;
}): Promise<{ data: any[]; total: number }> {
  const { restaurantIds, allowedActions, page = 1, limit = 50 } = params;
  const filter: Record<string, unknown> = {};
  if (restaurantIds && restaurantIds.length > 0) {
    filter.restaurant = { $in: restaurantIds };
  }
  if (allowedActions && allowedActions.length > 0) {
    filter.action = { $in: allowedActions };
  }

  const [data, total] = await Promise.all([
    DB_Connection.AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('restaurant', 'name')
      .populate('actor', 'name email')
      .lean()
      .exec(),
    DB_Connection.AuditLog.countDocuments(filter),
  ]);

  // Resolve tên cho targetId theo targetType → trả object { id, name } thay vì id thô
  const nameMap = await resolveTargetNames(
    data.map((log) => ({ targetType: (log as any).targetType, targetId: (log as any).targetId })),
  );
  const enriched = data.map((log: any) => {
    const targetName = log.targetId ? nameMap.get(String(log.targetId)) : undefined;
    return {
      ...log,
      // actor: populate trả { _id, name, email } — giữ actorInfo gốc làm fallback
      actorName: (log.actor as any)?.name ?? log.actorInfo?.name ?? undefined,
      actorEmail: (log.actor as any)?.email ?? undefined,
      target: targetName
        ? { id: String(log.targetId), name: targetName }
        : log.targetId
          ? { id: String(log.targetId), name: String(log.targetId) }
          : undefined,
    };
  });

  return { data: enriched, total };
}

/** Lịch sử thanh toán (Transaction) theo ownerId, populate tên nhà hàng + phân trang. */
export async function listPaymentLogs(params: {
  ownerId: string;
  page?: number;
  limit?: number;
}): Promise<{ data: any[]; total: number }> {
  const { ownerId, page = 1, limit = 50 } = params;
  const filter = { ownerId };
  const [data, total] = await Promise.all([
    DB_Connection.Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('restaurant', 'name')
      .lean()
      .exec(),
    DB_Connection.Transaction.countDocuments(filter),
  ]);
  return { data, total };
}
