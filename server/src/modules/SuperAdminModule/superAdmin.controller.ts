import type { Request, Response } from 'express';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';
import superAdminService from './superAdmin.service.js';

class SuperAdminController {
  /** GET /api/admin/dashboard — KPI nền tảng. */
  async dashboard(req: AuthRequest, res: Response) {
    try {
      const result = await superAdminService.getDashboard();
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error getting super-admin dashboard:', error);
      return res.status(500).json({ message: 'Lỗi server khi lấy thống kê nền tảng' });
    }
  }

  /** GET /api/admin/tenants — danh sách chủ (kèm ?id= cho chi tiết). */
  async tenants(req: AuthRequest, res: Response) {
    try {
      const id = typeof req.query.id === 'string' ? req.query.id : undefined;
      const result = await superAdminService.getTenants(id);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error getting tenants:', error);
      return res.status(500).json({ message: 'Lỗi server khi lấy danh sách chủ' });
    }
  }

  /** GET /api/admin/transactions — lịch sử giao dịch + filter. */
  async transactions(req: AuthRequest, res: Response) {
    try {
      const filters: Record<string, string> = {};
      for (const key of ['ownerId', 'restaurantId', 'from', 'to'] as const) {
        const v = req.query[key];
        if (typeof v === 'string' && v) filters[key] = v;
      }
      const result = await superAdminService.getTransactions(filters);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error getting transactions:', error);
      return res.status(500).json({ message: 'Lỗi server khi lấy lịch sử giao dịch' });
    }
  }

  /** PATCH /api/admin/users/:id/block — khoá/mở chủ. */
  async blockOwner(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const blocked = Boolean(req.body?.blocked);
      if (typeof req.body?.blocked !== 'boolean') {
        return res.status(400).json({ message: 'Thiếu trường blocked (boolean)!' });
      }
      const result = await superAdminService.blockOwner(id, blocked, req.user?.userId);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error blocking owner:', error);
      return res.status(500).json({ message: 'Lỗi server khi khoá/mở chủ' });
    }
  }
}

export default new SuperAdminController();
