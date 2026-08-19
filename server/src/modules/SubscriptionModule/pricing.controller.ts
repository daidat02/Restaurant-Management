import type { Request, Response } from 'express';
import pricingService from './pricing.service.js';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';
import { writeAuditLog } from '../../services/auditLog.service.js';

class PricingController {
  /** GET /api/pricing — đọc giá chu kỳ (public, không cần token — dùng cho landing page). */
  async getPricing(req: Request, res: Response) {
    try {
      const result = await pricingService.getPricing();
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error getting pricing:', error);
      return res.status(500).json({ message: 'Lỗi server khi lấy cấu hình giá' });
    }
  }

  /** PUT /api/admin/pricing — super-admin chỉnh giá. */
  async updatePricing(req: AuthRequest, res: Response) {
    try {
      const result = await pricingService.updatePricing(req.body as any);
      if (result.code === 200) {
        await writeAuditLog({
          action: 'pricing.update',
          actor: req.user?.userId || null,
          actorInfo: { name: req.user?.name, role: req.user?.role },
          targetType: 'pricing',
          targetId: null,
          summary: (req.body as any)?.plans
            ? 'Cập nhật danh sách gói dịch vụ'
            : 'Cập nhật giá chu kỳ thanh toán',
          meta: result.data,
        });
      }
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error updating pricing:', error);
      return res.status(500).json({ message: 'Lỗi server khi cập nhật giá' });
    }
  }
}

export default new PricingController();
