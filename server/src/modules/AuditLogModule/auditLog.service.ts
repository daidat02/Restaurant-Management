import { listAuditLogs, listPaymentLogs } from './auditLog.repository.js';

class AuditLogService {
  async getAuditLogs(params: {
    restaurantIds?: string[];
    allowedActions?: string[];
    action?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ code: number; message: string; data?: any[]; total?: number }> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(params.limit) || 50));
    const { data, total } = await listAuditLogs({
      ...(params.restaurantIds && params.restaurantIds.length > 0
        ? { restaurantIds: params.restaurantIds }
        : {}),
      ...(params.allowedActions && params.allowedActions.length > 0
        ? { allowedActions: params.allowedActions }
        : {}),
      ...(params.action ? { action: params.action } : {}),
      ...(params.startDate ? { startDate: params.startDate } : {}),
      ...(params.endDate ? { endDate: params.endDate } : {}),
      ...(params.search ? { search: params.search } : {}),
      page,
      limit,
    });
    return {
      code: 200,
      message: 'Lấy danh sách audit log thành công',
      data,
      total,
    };
  }

  /** Lịch sử thanh toán mọi chi nhánh của chủ (Transaction theo ownerId). */
  async getPaymentLogs(params: {
    ownerId: string;
    restaurantId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ code: number; message: string; data?: any[]; total?: number }> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(params.limit) || 50));
    const { data, total } = await listPaymentLogs({
      ownerId: params.ownerId,
      ...(params.restaurantId ? { restaurantId: params.restaurantId } : {}),
      ...(params.startDate ? { startDate: params.startDate } : {}),
      ...(params.endDate ? { endDate: params.endDate } : {}),
      page,
      limit,
    });
    return {
      code: 200,
      message: 'Lấy lịch sử thanh toán thành công',
      data,
      total,
    };
  }
}

export default new AuditLogService();
