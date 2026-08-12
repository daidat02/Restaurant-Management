import { Router } from 'express';
import subscriptionController from './subscription.controller.js';
import { verifyRole, verifyToken } from '../../middlewares/auth.middleware.js';
import { paymentWebhookRateLimit } from '../../middlewares/rateLimit.middleware.js';

const router = Router();

// Thanh toán / gia hạn mock (chủ sở hữu nhà hàng)
router.post('/pay', verifyToken, verifyRole(['admin']), subscriptionController.pay);
// Tạo link thanh toán gói cước bằng PayOS (chủ sở hữu nhà hàng)
router.post(
  '/payos/create-url',
  verifyToken,
  verifyRole(['admin']),
  subscriptionController.payosCreateUrl,
);
// Webhook PayOS cho gói cước (public, rate-limit mạnh)
router.post('/webhook', paymentWebhookRateLimit, subscriptionController.payosWebhook);
// Tạo link thanh toán gói cước bằng VNPay (chủ sở hữu nhà hàng)
router.post(
  '/vnpay/create-url',
  verifyToken,
  verifyRole(['admin']),
  subscriptionController.vnpayCreateUrl,
);
// Kết quả trả về từ VNPay (public — VNPay redirect trình duyệt về đây)
router.get('/vnpay/return', paymentWebhookRateLimit, subscriptionController.vnpayReturn);
// Trạng thái thuê bao của chủ
router.get('/me', verifyToken, verifyRole(['admin']), subscriptionController.me);
// Lịch sử giao dịch của chủ
router.get(
  '/transactions',
  verifyToken,
  verifyRole(['admin']),
  subscriptionController.transactions,
);

export default router;
