import DB_Connection from '../../models/DB_Connection.js';

/** Truy vấn audit log theo restaurant (optional) + phân trang. */
export async function listAuditLogs(params: {
  restaurantId?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: any[]; total: number }> {
  const { restaurantId, page = 1, limit = 50 } = params;
  const filter: Record<string, unknown> = {};
  if (restaurantId) filter.restaurant = restaurantId;

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
