import type { Request, Response } from 'express';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';
import subscriptionService from '../../services/subscription-pay.service.js';
import subscriptionPayosService from '../../services/subscription-payos.service.js';
import subscriptionVnpayService from '../../services/subscription-vnpay.service.js';

class SubscriptionController {
  /** POST /api/subscriptions/pay — thanh toán / gia hạn mock. */
  async pay(req: AuthRequest, res: Response) {
    try {
      const { restaurantId, cycleMonths, planId } = req.body;
      const result = await subscriptionService.payService(
        restaurantId,
        Number(cycleMonths),
        req.user?.userId,
        planId,
      );
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error paying subscription:', error);
      return res.status(500).json({ message: 'Lỗi server khi thanh toán' });
    }
  }

  /** POST /api/subscriptions/payos/create-url — tạo link thanh toán gói cước bằng PayOS. */
  async payosCreateUrl(req: AuthRequest, res: Response) {
    try {
      const { restaurantId, cycleMonths, planId, transactionId } = req.body;
      const result = await subscriptionPayosService.createUrl(
        restaurantId,
        Number(cycleMonths),
        req.user?.userId,
        planId,
        transactionId,
      );
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error creating PayOS subscription URL:', error);
      return res.status(500).json({ message: 'Lỗi server khi tạo link thanh toán gói cước' });
    }
  }

  /** POST /api/subscriptions/payos/cancel — huỷ thanh toán PayOS của 1 giao dịch pending. */
  async payosCancel(req: AuthRequest, res: Response) {
    try {
      const { transactionId } = req.body;
      const result = await subscriptionPayosService.cancelPayment(transactionId, req.user?.userId);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error cancelling PayOS subscription payment:', error);
      return res.status(500).json({ message: 'Lỗi server khi huỷ thanh toán gói cước' });
    }
  }

  /** POST /api/subscriptions/payos/webhook — webhook PayOS cho gói cước. */
  async payosWebhook(req: Request, res: Response) {
    try {
      const result = await subscriptionPayosService.handleWebhook(req.body);
      console.log('PayOS subscription webhook handled:', result);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error handling PayOS subscription webhook:', error);
      return res.status(500).json({ message: 'Lỗi server ' });
    }
  }

  /** POST /api/subscriptions/vnpay/create-url — tạo link thanh toán gói cước bằng VNPay. */
  async vnpayCreateUrl(req: AuthRequest, res: Response) {
    try {
      const { restaurantId, cycleMonths, planId } = req.body;
      const result = await subscriptionVnpayService.createUrl(
        restaurantId,
        Number(cycleMonths),
        req.user?.userId,
        planId,
        req.ip,
      );
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error creating VNPay subscription URL:', error);
      return res.status(500).json({ message: 'Lỗi server khi tạo link thanh toán gói cước VNPay' });
    }
  }

  /** GET /api/subscriptions/vnpay/return — kết quả trả về từ VNPay (public). */
  async vnpayReturn(req: Request, res: Response) {
    try {
      const result = await subscriptionVnpayService.handleReturn(req.query);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error handling VNPay subscription return:', error);
      return res.status(500).json({ message: 'Lỗi server khi xử lý kết quả VNPay gói cước' });
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

  /** GET /api/subscriptions/transactions — lịch sử giao dịch của chủ. */
  async transactions(req: AuthRequest, res: Response) {
    try {
      const result = await subscriptionService.transactionsService(req.user?.userId);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error getting my transactions:', error);
      return res.status(500).json({ message: 'Lỗi server khi lấy lịch sử giao dịch' });
    }
  }

  /** GET /api/subscriptions/usage?restaurantId= — mức sử dụng hiện tại của 1 nhà hàng (gate UI). */
  async usage(req: AuthRequest, res: Response) {
    try {
      const result = await subscriptionService.usageService(
        (req.query.restaurantId as string) || undefined,
        req.user?.userId,
      );
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error getting subscription usage:', error);
      return res.status(500).json({ message: 'Lỗi server khi lấy mức sử dụng' });
    }
  }
}

export default new SubscriptionController();
