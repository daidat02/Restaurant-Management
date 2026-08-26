import type { Request, Response } from 'express';
import auditLogService from './auditLog.service.js';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';
import { SUPER_ADMIN_ALLOWED_ACTIONS } from '../../services/auditAction.js';
import DB_Connection from '../../models/DB_Connection.js';

class AuditLogController {
  /**
   * GET /api/audit-logs
   * - super-admin: quyền nền tảng — CHỈ thấy action trong whitelist
   *   (SUPER_ADMIN_ALLOWED_ACTIONS), filter restaurantId tùy ý.
   * - admin (chủ chuỗi): chỉ thấy log của các chi nhánh trong restaurantIds của mình
   *   (đã được intersectRestaurantIds lọc, ngoài phạm vi → 403).
   * - manager (chi nhánh): chỉ thấy log của chi nhánh mình (intersectRestaurantIds giới hạn).
   */
  async getAuditLogs(req: AuthRequest, res: Response) {
    try {
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;

      // Filter nâng cao (client gửi ngày dạng yyyy-MM-dd)
      const action = (req.query.action as string) || undefined;
      const search = (req.query.search as string) || undefined;
      const parseDay = (raw: string | undefined, endOfDay: boolean): Date | undefined => {
        if (!raw) return undefined;
        const d = new Date(`${raw}T${endOfDay ? '23:59:59.999' : '00:00:00'}`);
        return Number.isNaN(d.getTime()) ? undefined : d;
      };
      const startDate = parseDay(req.query.startDate as string | undefined, false);
      const endDate = parseDay(req.query.endDate as string | undefined, true);

      let restaurantIds: string[] | undefined;
      let allowedActions: string[] | undefined;
      if (req.user?.role === 'super-admin') {
        const restaurantId = (req.query.restaurantId as string) || undefined;
        if (restaurantId) restaurantIds = [restaurantId];
        allowedActions = [...SUPER_ADMIN_ALLOWED_ACTIONS];
      } else {
        // admin/manager: phạm vi = danh sách chi nhánh CỦA CHÍNH USER trong DB
        // (token chỉ chứa restaurantId đơn — KHÔNG có restaurantIds, phải tra DB).
        const user = (await DB_Connection.User.findById(req.user?.userId)
          .select('restaurantIds')
          .lean()) as { restaurantIds?: unknown[] } | null;
        const ownIds = (user?.restaurantIds ?? []).map((id: unknown) => String(id));
        const requestedBranch = (req.query.restaurantId as string) || undefined;
        if (requestedBranch && ownIds.includes(String(requestedBranch))) {
          // Thu hẹp xuống 1 chi nhánh thuộc quyền — chống soi chéo tenant
          restaurantIds = [requestedBranch];
        } else if (ownIds.length > 0) {
          restaurantIds = ownIds;
        }
      }

      const result = await auditLogService.getAuditLogs({
        ...(restaurantIds && restaurantIds.length > 0 ? { restaurantIds } : {}),
        ...(allowedActions && allowedActions.length > 0 ? { allowedActions } : {}),
        ...(action ? { action } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(search ? { search } : {}),
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

      // Filter nâng cao (ngày yyyy-MM-dd; restaurantId phải thuộc chuỗi của chủ)
      const parseDay = (raw: string | undefined, endOfDay: boolean): Date | undefined => {
        if (!raw) return undefined;
        const d = new Date(`${raw}T${endOfDay ? '23:59:59.999' : '00:00:00'}`);
        return Number.isNaN(d.getTime()) ? undefined : d;
      };
      const startDate = parseDay(req.query.startDate as string | undefined, false);
      const endDate = parseDay(req.query.endDate as string | undefined, true);
      // restaurantId phải thuộc chuỗi của chủ — danh sách chi nhánh tra từ DB (token không chứa)
      const user = (await DB_Connection.User.findById(ownerId)
        .select('restaurantIds')
        .lean()) as { restaurantIds?: unknown[] } | null;
      const ownIds = (user?.restaurantIds ?? []).map((id: unknown) => String(id));
      const requestedBranch = (req.query.restaurantId as string) || undefined;
      const restaurantId =
        requestedBranch && ownIds.includes(String(requestedBranch)) ? requestedBranch : undefined;

      const result = await auditLogService.getPaymentLogs({
        ownerId,
        ...(restaurantId ? { restaurantId } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
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
