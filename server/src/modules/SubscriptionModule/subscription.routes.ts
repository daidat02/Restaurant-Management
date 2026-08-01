import { Router } from 'express';
import subscriptionController from './subscription.controller.js';
import { verifyRole, verifyToken } from '../../middlewares/auth.middleware.js';

const router = Router();

// Thanh toán / gia hạn (chủ sở hữu nhà hàng)
router.post(
  '/subscriptions/pay',
  verifyToken,
  verifyRole(['admin']),
  subscriptionController.pay,
);
// Trạng thái thuê bao của chủ
router.get(
  '/subscriptions/me',
  verifyToken,
  verifyRole(['admin']),
  subscriptionController.me,
);

export default router;
