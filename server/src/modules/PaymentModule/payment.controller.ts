import type { Request, Response } from 'express';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';
import paymentService from './payment.service.js';
import payosService from './payos.service.js';
import type { IPayOSConfig } from '../../models/Schema/SettingSchema.js';

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
      const result = await payosService.handleWebhook(req.body);
      console.log(result);
      res.status(200).json(result);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
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
