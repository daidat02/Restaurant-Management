import type { Request, Response } from 'express';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';
import paymentService from './payment.service.js';
import payosService from './payos.service.js';
import type { IPayOSConfig } from '../../models/Schema/SettingSchema.js';
import { writeAuditLog } from '../../services/auditLog.service.js';
import { addJob } from '../../jobs/handlers.js';
import { QUEUE_NAMES } from '../../queues/queue.js';

type Provider = 'vn_pay' | 'momo' | 'zalopay';

class PaymentController {
  getPaymentDetail = async (req: AuthRequest, res: Response) => {
    const { paymentId } = req.params;
    try {
      const result = await paymentService.getPaymentDetailService(paymentId as string);
      res.status(result.code).json(result);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  };

  initiatePayment = async (req: AuthRequest, res: Response) => {
    const { orderId } = req.body;
    try {
      const result = await paymentService.initiatePaymentService(orderId! as string);
      res.status(result.code).json(result);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  };

  updatePaymentMethod = async (req: AuthRequest, res: Response) => {
    const { paymentId, method } = req.params;

    try {
      const result = await paymentService.updateMethodPaymentService(
        paymentId! as string,
        method as 'cash' | 'card' | 'ewallet' | 'banking',
      );
      res.status(result.code).json(result);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  };

  changePaymentStatus = async (req: AuthRequest, res: Response) => {
    const { paymentId, status } = req.body;
    try {
      const result = await paymentService.changePaymentStatusAuthorized(
        paymentId! as string,
        status as string,
      );
      console.log('result', result);
      // Thu tiền (POS) là hành động tài chính — ghi audit với targetType 'payment'
      if (result.code === 200 && status === 'captured') {
        await writeAuditLog({
          action: 'payment.captured',
          restaurant:
            result.data?.restaurant?.toString?.() || req.tenantId || req.user?.restaurantId || null,
          actor: req.user?.userId || null,
          actorInfo: { name: req.user?.name, role: req.user?.role },
          targetType: 'payment',
          targetId: paymentId || null,
          summary: result.data?.transactionId
            ? `Thu tiền ${result.data.amount}đ cho thanh toán ${result.data.transactionId}`
            : `Thu tiền ${result.data?.amount}đ`,
          meta: { amount: result.data?.amount },
        });
      }
      res.status(result.code).json(result);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  };

  refundPayment = async (req: AuthRequest, res: Response) => {
    const { paymentId } = req.params;
    const { reason } = req.body || {};
    try {
      const result = await paymentService.refundPaymentService(paymentId! as string, {
        ...(reason ? { reason: reason as string } : {}),
        ...(req.user?.userId ? { actorUserId: req.user.userId } : {}),
      });
      if (result.code === 200) {
        await writeAuditLog({
          action: 'payment.refund',
          restaurant:
            result.data?.restaurant?.toString?.() || req.tenantId || req.user?.restaurantId || null,
          actor: req.user?.userId || null,
          actorInfo: { name: req.user?.name, role: req.user?.role },
          targetType: 'payment',
          targetId: paymentId || null,
          summary: result.data?.transactionId
            ? `Hoàn tiền ${result.data.amount}đ cho thanh toán ${result.data.transactionId}`
            : `Hoàn tiền ${result.data?.amount}đ`,
          meta: { amount: result.data?.amount, reason },
        });
      }
      res.status(result.code).json(result);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  };

  ewalletCreateUrlPayment = async (req: AuthRequest, res: Response) => {
    const { orderId } = req.params;
    const { provider, method } = req.query;
    try {
      const result = await paymentService.createPaymentUrl(
        method! as string,
        provider as Provider,
        orderId!,
      );
      res.status(result.code).json(result);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  };

  paymentReturn = async (req: AuthRequest, res: Response) => {
    const vnpParams = req.query;
    try {
      const result = await paymentService.processReturnUrl(vnpParams);
      res.status(result.code).json(result);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  };

  createPayOsUrl = async (req: AuthRequest, res: Response) => {
    try {
      const { orderId } = req.params;
      const result = await payosService.createUrl({ orderId: orderId as string });
      res.status(200).json(result);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  };

  handleWebhook = async (req: Request, res: Response) => {
    try {
      // 1) Verify chữ ký SYNC (không xử lý nghiệp vụ ở đây) — lỗi → gateway biết và retry.
      const { existingPayment, webhookDataVerified } = await payosService.verifyWebhookSignature(
        req.body,
      );
      const verifiedStatus =
        webhookDataVerified?.code === '00'
          ? 'SUCCESS'
          : webhookDataVerified?.status === 'CANCELLED'
            ? 'CANCELLED'
            : 'PENDING';

      // 2) Enqueue job hoàn tất thanh toán (idempotent + atomic). Redis down → chạy inline.
      await addJob(QUEUE_NAMES.paymentWebhook, 'complete-payment', {
        provider: 'payos',
        orderCode: existingPayment?.orderCode,
        verifiedStatus,
        webhookData: webhookDataVerified,
      });

      // 3) Ack 200 ngay cho gateway (xử lý nặng chuyển xuống job/worker).
      res.status(200).json({ success: true, data: webhookDataVerified });
    } catch (error) {
      console.error('Lỗi webhook PayOS:', error);
      res.status(200).json({ success: false, error: (error as Error)?.message });
    }
  };

  hanldeCancelPayosUrl = async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const result = await payosService.cancelPayosUrl(orderId as string);
      res.status(200).json(result);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  };
  checkPayOSConnection = async (req: Request, res: Response) => {
    try {
      const { payload } = req.body;
      const result = await payosService.checkPayOSConnectionService(payload as IPayOSConfig);
      res.status(result.code).json(result);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  };
}

export default new PaymentController();
