import type { Request, Response } from 'express';
import auditLogService from './auditLog.service.js';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';

class AuditLogController {
  /**
   * GET /api/audit-logs
   * - super-admin: quyền nền tảng — xem mọi log, filter restaurantId tùy ý.
   * - admin (chủ chuỗi): chỉ thấy log của các chi nhánh trong restaurantIds của mình
   *   (đã được intersectRestaurantIds lọc, ngoài phạm vi → 403).
   */
  async getAuditLogs(req: AuthRequest, res: Response) {
    try {
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;

      let restaurantIds: string[] | undefined;
      if (req.user?.role === 'super-admin') {
        const restaurantId = (req.query.restaurantId as string) || undefined;
        if (restaurantId) restaurantIds = [restaurantId];
      } else {
        // admin: danh sách chi nhánh đã intersect (mặc định toàn chuỗi)
        restaurantIds = req.user?.restaurantIds;
      }

      const result = await auditLogService.getAuditLogs({
        ...(restaurantIds && restaurantIds.length > 0 ? { restaurantIds } : {}),
        ...(page !== undefined ? { page } : {}),
        ...(limit !== undefined ? { limit } : {}),
      });
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error getting audit logs:', error);
      return res.status(500).json({ message: 'Lỗi server khi lấy audit log' });
    }
  }

  /** GET /api/audit-logs/payments — admin: lịch sử thanh toán mọi chi nhánh của chủ. */
  async getPaymentLogs(req: AuthRequest, res: Response) {
    try {
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const ownerId = req.user?.userId;
      if (!ownerId) {
        return res.status(403).json({ message: 'Bạn không có quyền truy cập!' });
      }
      const result = await auditLogService.getPaymentLogs({
        ownerId,
        ...(page !== undefined ? { page } : {}),
        ...(limit !== undefined ? { limit } : {}),
      });
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error getting payment logs:', error);
      return res.status(500).json({ message: 'Lỗi server khi lấy lịch sử thanh toán' });
    }
  }
}

export default new AuditLogController();
