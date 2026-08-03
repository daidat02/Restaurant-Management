import DB_Connection from '../../models/DB_Connection.js';

/** Truy vấn audit log theo restaurant (optional, hỗ trợ mảng $in) + phân trang. */
export async function listAuditLogs(params: {
  restaurantIds?: string[];
  page?: number;
  limit?: number;
}): Promise<{ data: any[]; total: number }> {
  const { restaurantIds, page = 1, limit = 50 } = params;
  const filter: Record<string, unknown> = {};
  if (restaurantIds && restaurantIds.length > 0) {
    filter.restaurant = { $in: restaurantIds };
  }

  const [data, total] = await Promise.all([
    DB_Connection.AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec(),
    DB_Connection.AuditLog.countDocuments(filter),
  ]);
  return { data, total };
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
