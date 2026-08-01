import type { Request, Response } from 'express';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';
import subscriptionService from '../../services/subscription-pay.service.js';

class SubscriptionController {
  /** POST /api/subscriptions/pay — thanh toán / gia hạn mock. */
  async pay(req: AuthRequest, res: Response) {
    try {
      const { restaurantId, cycleMonths } = req.body;
      const result = await subscriptionService.payService(
        restaurantId,
        Number(cycleMonths),
        req.user?.userId,
      );
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error paying subscription:', error);
      return res.status(500).json({ message: 'Lỗi server khi thanh toán' });
    }
  }

  /** GET /api/subscriptions/me — trạng thái các nhà hàng của chủ. */
  async me(req: AuthRequest, res: Response) {
    try {
      const result = await subscriptionService.meService(req.user?.userId);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error getting my subscriptions:', error);
      return res.status(500).json({ message: 'Lỗi server khi lấy trạng thái thuê bao' });
    }
  }
}

export default new SubscriptionController();
