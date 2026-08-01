import type { Request, Response } from 'express';
import auditLogService from './auditLog.service.js';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';

class AuditLogController {
  /** GET /api/audit-logs — chỉ super-admin (quyền nền tảng). */
  async getAuditLogs(req: AuthRequest, res: Response) {
    try {
      const restaurantId = (req.query.restaurantId as string) || undefined;
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const result = await auditLogService.getAuditLogs({
        ...(restaurantId ? { restaurantId } : {}),
        ...(page !== undefined ? { page } : {}),
        ...(limit !== undefined ? { limit } : {}),
      });
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error getting audit logs:', error);
      return res.status(500).json({ message: 'Lỗi server khi lấy audit log' });
    }
  }
}

export default new AuditLogController();
