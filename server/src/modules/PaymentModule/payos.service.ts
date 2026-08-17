import { createRequire } from 'module';
import paymentRepository from './payment.repository.js';
import orderRepository from '../OrderModule/order.repository.js';
import type { IPayOSConfig } from '../../models/Schema/SettingSchema.js';
import type { ServiceResponse } from '../../shared/type.js';
import settingRepository from '../SettingModule/setting.repository.js';
import { decryptKey } from '../../configs/constants.js';

const require = createRequire(import.meta.url);
const { PayOS } = require('@payos/node');

interface CreatePaymentParams {
  orderId: string;
}

type PayOSClientCtor = new (...args: any[]) => any;

// Test hook: cho phép inject client PayOS giả (giống subscription-payos.service).
// Khi null → dùng PayOS thật. Chỉ dùng trong test, không dùng trong production.
let payOSClientOverride: PayOSClientCtor | null = null;
export const __setPayOSClient = (ctor: ((...args: any[]) => any) | null): void => {
  payOSClientOverride = ctor === null ? null : (ctor as unknown as PayOSClientCtor);
};

class PayOsService {
  // 🔥 Sửa 1: Giải mã Key và chuẩn hóa hàm getPayos
  private async getPayos(restaurantId: string) {
    const payoskey = await settingRepository.findPayOSSettingById(restaurantId);
    const { clientId, apiKey, checksumKey } = payoskey?.integrations?.payOS || {};

    if (!clientId || !apiKey || !checksumKey) {
      throw new Error('Nhà hàng chưa cấu hình cổng thanh toán PayOS');
    }

    const realApiKey = decryptKey(apiKey);
    const realChecksumKey = decryptKey(checksumKey);
    process.env.PAYOS_CLIENT_ID = clientId;
    process.env.PAYOS_API_KEY = realApiKey;
    process.env.PAYOS_CHECKSUM_KEY = realChecksumKey;
    const PayOSClient = payOSClientOverride ?? PayOS;
    return new PayOSClient(clientId, realApiKey, realChecksumKey);
  }

  async createUrl(data: CreatePaymentParams) {
    try {
      const order = await orderRepository.findOrderById(data.orderId);

      if (!order) {
        return { code: 404, message: 'Không tìm thấy đơn hàng' };
      }
      const orderIdString = order._id.toString();

      const existingPayment = await paymentRepository.findByOrderId(
        orderIdString,
        order.totalAmount,
        'initiated',
      );

      if (!existingPayment) {
        return { code: 404, message: 'Không tìm thấy thông tin thanh toán' };
      }

      const baseId = order.orderId.replace(/-/g, '');
      const shortId = baseId.slice(-6);
      const timeSuffix = String(Date.now()).slice(-4);
      const orderCode = Number(shortId + timeSuffix);

      const description = `THANH TOAN ${orderCode}`.substring(0, 25).replace(/[^a-zA-Z0-9 ]/g, '');

      const EXPIRE_IN_MINUTES = 15;
      const expiredAt = Math.floor(Date.now() / 1000) + EXPIRE_IN_MINUTES * 60;
      const paymentData = {
        orderCode,
        amount: existingPayment.amount,
        description,
        cancelUrl: 'http://localhost:3000/cancel',
        returnUrl: 'http://localhost:5173/manager/tables',
        expiredAt: expiredAt,
      };

      const payos = await this.getPayos(order.restaurant.toString());
      const paymentLinkRes = await payos.paymentRequests.create(paymentData);

      await paymentRepository.updatePayment(existingPayment._id.toString(), {
        orderCode: orderCode,
        method: 'banking',
        status: 'authorized',
      });

      return {
        success: true,
        data: {
          orderCode,
          qrCodeData: paymentLinkRes.qrCode,
          checkoutUrl: paymentLinkRes.checkoutUrl,
          paymentLinkId: paymentLinkRes.paymentLinkId,
          infoPayment: paymentLinkRes,
        },
      };
    } catch (error: any) {
      console.error('Lỗi PayOsService - createUrl:', error);
      return {
        success: false,
        message: 'Khởi tạo thanh toán PayOS thất bại',
        error: error?.message || error,
      };
    }
  }

  /**
   * Verify chữ ký webhook PayOS (SYNC tại route). KHÔNG hoàn tất thanh toán ở đây —
   * sau khi verify xong route gọi `addJob('payment-webhook','complete-payment',...)`
   * rồi ack 200. Lỗi (chữ ký sai / không tìm thấy đơn) → throw; route catch rồi vẫn ack 200
   * (no-op) vì PayOS chỉ đánh dấu webhook thành công khi nhận 2XX.
   */
  async verifyWebhookSignature(webhookData: any) {
    const { orderCode: incomingOrderCode } = webhookData?.data || webhookData;
    console.log('Incoming PayOS webhook data:', webhookData);
    const existingPayment = await paymentRepository.findPaymentByOrderCode(incomingOrderCode);
    if (!existingPayment) {
      throw new Error(`Không tìm thấy thanh toán ứng với orderCode ${incomingOrderCode}`);
    }
    const order = await orderRepository.findOrders({ _id: existingPayment.order.toString() });
    const currentOrder = order[0];
    if (!currentOrder) {
      throw new Error('Không tìm thấy đơn hàng từ webhook');
    }

    const payos = await this.getPayos(currentOrder.restaurant.toString());
    const webhookDataVerified = await payos.webhooks.verify(webhookData);
    console.log('Webhook data sau khi verify chữ ký PayOS:', webhookDataVerified);
    return { existingPayment, currentOrder, webhookDataVerified };
  }

  async checkPayOSConnectionService(payload: IPayOSConfig): Promise<ServiceResponse<boolean>> {
    const { clientId, apiKey, checksumKey } = payload;

    if (!clientId || !apiKey || !checksumKey) {
      return {
        code: 400,
        data: false,
        message: 'Vui lòng nhập đầy đủ thông tin Client ID, API Key và Checksum Key',
      };
    }
    const oldEnvClientId = process.env.PAYOS_CLIENT_ID;
    const oldEnvApiKey = process.env.PAYOS_API_KEY;
    const oldEnvChecksumKey = process.env.PAYOS_CHECKSUM_KEY;

    try {
      process.env.PAYOS_CLIENT_ID = clientId;
      process.env.PAYOS_API_KEY = apiKey;
      process.env.PAYOS_CHECKSUM_KEY = checksumKey;

      const expiredAt = Math.floor(Date.now() / 1000) + 1 * 60;

      const paymentData = {
        orderCode: Date.now(),
        amount: 2000,
        description: 'CHECK CONNECT',
        expiredAt: expiredAt,
        cancelUrl: 'http://localhost:3000/cancel',
        returnUrl: 'http://localhost:5173/manager/tables',
      };

      const tempPayOS = new PayOS(clientId, apiKey, checksumKey);

      await tempPayOS.paymentRequests.create(paymentData);

      return { code: 200, data: true, message: 'Kết nối tới cổng PayOS thành công!' };
    } catch (error: any) {
      console.error('Lỗi xác thực cổng PayOS:', error);

      return {
        code: 400,
        data: false,
        message: 'Thông tin Client ID, API Key hoặc Checksum Key không chính xác.',
      };
    } finally {
      process.env.PAYOS_CLIENT_ID = oldEnvClientId;
      process.env.PAYOS_API_KEY = oldEnvApiKey;
      process.env.PAYOS_CHECKSUM_KEY = oldEnvChecksumKey;
    }
  }

  async cancelPayosUrl(orderId: string) {
    try {
      const order = await orderRepository.findOrderById(orderId);

      if (!order) {
        return { code: 404, message: 'Không tìm thấy đơn hàng' };
      }

      const existingPayment = await paymentRepository.findByOrderId(
        orderId,
        Number(order.totalAmount),
        'authorized',
      );

      if (!existingPayment) {
        return { code: 404, message: 'Không tìm thấy thông tin thanh toán' };
      }

      const orderCode = existingPayment.orderCode;

      // 🔥 Sửa 4: Thêm `await` và nạp Id nhà hàng khi hủy link
      const payos = await this.getPayos(order.restaurant.toString());
      const cancelledPaymentLink = await payos.paymentRequests.cancel(orderCode, 'Hủy Đơn Hàng!!');

      if (cancelledPaymentLink.status == 'CANCELLED') {
        await paymentRepository.changePaymentStatus(existingPayment._id.toString(), 'cancelled');
      }

      return cancelledPaymentLink;
    } catch (error: any) {
      console.error('Lỗi khi hủy đơn:', error);
      return { success: false, error: error?.message };
    }
  }
}

export default new PayOsService();
