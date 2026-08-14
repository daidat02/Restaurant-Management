import { Router } from 'express';
import paymentController from './payment.controller.js';
import {
  verifyRole,
  verifyToken,
  requireResourceTenant,
  paymentTenantResolver,
} from '../../middlewares/auth.middleware.js';
import { paymentWebhookRateLimit } from '../../middlewares/rateLimit.middleware.js';

const router = Router();

router.get(
  '/:paymentId',
  verifyToken,
  requireResourceTenant(paymentTenantResolver),
  paymentController.getPaymentDetail,
);
router.post('/initiate', verifyToken, paymentController.initiatePayment);
router.post(
  '/:paymentId/method/:method',
  verifyToken,
  paymentController.updatePaymentMethod,
);
// Hoàn tiền giao dịch đã thu (POS) — chỉ manager/admin, payment phải thuộc tenant
router.post(
  '/:paymentId/refund',
  verifyToken,
  verifyRole(['admin', 'manager']),
  requireResourceTenant(paymentTenantResolver),
  paymentController.refundPayment,
);
router.patch('/status', verifyToken, paymentController.changePaymentStatus);
router.post(
  '/ewallet/:orderId',
  verifyToken,
  verifyRole(['staff', 'customer']),
  paymentController.ewalletCreateUrlPayment,
);
router.post('/return/vnpay', paymentWebhookRateLimit, paymentController.paymentReturn);
router.post('/banking/:orderId', paymentWebhookRateLimit, paymentController.createPayOsUrl);
router.post('/webhook', paymentWebhookRateLimit, paymentController.handleWebhook);
router.post('/:orderId/cancel', paymentWebhookRateLimit, paymentController.hanldeCancelPayosUrl);
router.post('/check-connect', paymentWebhookRateLimit, paymentController.checkPayOSConnection);

export default router;
