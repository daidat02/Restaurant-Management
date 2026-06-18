import { Router } from 'express';
import paymentController from './payment.controller.js';
import { verifyRole, verifyToken } from '../../middlewares/auth.middleware.js';

const router = Router();

router.get('/:paymentId', verifyToken, paymentController.getPaymentDetail);
router.post('/initiate', verifyToken, paymentController.initiatePayment);
router.post('/:paymentId/method/:method', verifyToken, paymentController.updatePaymentMethod);
router.patch('/status', verifyToken, paymentController.changePaymentStatus);
router.post(
  '/ewallet/:orderId',
  verifyToken,
  verifyRole(['staff', 'customer']),
  paymentController.ewalletCreateUrlPayment,
);
router.post('/return/vnpay', paymentController.paymentReturn);
router.post('/banking/:orderId', paymentController.createPayOsUrl);
router.post('/webhook', paymentController.handleWebhook);
router.post('/:orderId/cancel', paymentController.hanldeCancelPayosUrl);
router.post('/check-connect', paymentController.checkPayOSConnection);

export default router;
