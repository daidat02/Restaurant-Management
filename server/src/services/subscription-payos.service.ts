import { createRequire } from 'module';
import DB_Connection from '../models/DB_Connection.js';
import settingRepository, {
  PLATFORM_GATEWAY_TARGET_ID,
} from '../modules/SettingModule/setting.repository.js';
import { decryptKey } from '../configs/constants.js';
import { getIO } from '../configs/socketsConfig.js';
import {
  prepareSubscription,
  completeSubscription,
  type PreparedSubscription,
} from './subscription-pay.service.js';
import pricingService from '../modules/SubscriptionModule/pricing.service.js';
import type { ServiceResponse } from '../shared/type.js';
import { generateTransactionId } from './transaction-id.service.js';

type PayosServiceResult<T = any> = ServiceResponse<T> & { success?: boolean; error?: any };

const require = createRequire(import.meta.url);
let PayOSClient: any = require('@payos/node')?.PayOS;

/** Cho phép test inject client PayOS mock. */
export function __setPayOSClient(client: any) {
  PayOSClient = client;
}

/** URL trả về & hủy (nên cấu hình theo môi trường). */
const RETURN_URL = process.env.SUBSCRIPTION_RETURN_URL || 'http://localhost:5173/manager/pricing';
const CANCEL_URL = process.env.SUBSCRIPTION_CANCEL_URL || 'http://localhost:5173/manager/pricing';
const EXPIRE_IN_MINUTES = 15;

class SubscriptionPayosService {
  /** Nạp cấu hình cổng PayOS toàn hệ thống (scope='platform') — dùng để thu phí gói cước. */
  private async getPlatformPayos() {
    const setting = await settingRepository.findGatewaySetting();
    const payos = setting?.gateway?.payos;
    if (!payos?.clientId || !payos?.apiKey || !payos?.checksumKey) {
      throw new Error('Cổng thanh toán PayOS hệ thống chưa được cấu hình');
    }
    const apiKey = decryptKey(payos.apiKey);
    const checksumKey = decryptKey(payos.checksumKey);

    process.env.PAYOS_CLIENT_ID = payos.clientId;
    process.env.PAYOS_API_KEY = apiKey;
    process.env.PAYOS_CHECKSUM_KEY = checksumKey;
    return new PayOSClient(payos.clientId, apiKey, checksumKey);
  }

  /** Tạo mã đơn PayOS duy nhất (6 chữ số thời gian + 6 số cuối restaurant). */
  private generateOrderCode(restaurantId: string): number {
    const timeSuffix = String(Date.now()).slice(-6);
    const restSuffix = restaurantId
      .replace(/[^0-9]/g, '')
      .slice(-6)
      .padStart(6, '0');
    const orderCode = Number(timeSuffix + restSuffix.slice(-6));
    return orderCode > 9007199254740991 ? Number(String(orderCode).slice(-10)) : orderCode;
  }

  private async getDefaultPlanKey(): Promise<string | undefined> {
    return pricingService.getDefaultPlanKey();
  }

  /** Phát sự kiện socket khi thanh toán gói cước có kết quả. */
  private emitPaymentEvent(
    restaurantId: string,
    transactionId: string,
    status: 'success' | 'cancelled',
    data: any,
  ) {
    const io = getIO();
    console.log(
      `Emitting subscription payment event for restaurant ${restaurantId}, transaction ${transactionId}, status ${status}`,
    );
    io.to(`subscription_payment_${transactionId}`).emit('subscription_payment_event', {
      status,
      transactionId,
      data,
    });
    io.to(`restaurant_${restaurantId}`).emit('subscription_event', {
      action: status === 'success' ? 'PAID' : 'CANCELLED',
      transactionId,
      restaurantId,
      message:
        status === 'success'
          ? 'Thanh toán gói cước thành công — gói đã kích hoạt'
          : 'Thanh toán gói cước bị hủy',
      data,
    });
  }

  /**
   * Tạo link thanh toán PayOS cho gói cước / gia hạn.
   * Tạo Transaction status='pending' với orderCode → tạo link → trả checkoutUrl + qrCode.
   * Truyền `existingTransactionId` → khởi tạo lại link cho giao dịch pending có sẵn
   * (giữ nguyên transactionId, cấp orderCode mới — dùng khi đơn cũ hết hạn/bị bỏ qua).
   */
  async createUrl(
    restaurantId: string,
    cycleMonths: number,
    actorUserId: string | undefined,
    planId?: string,
    existingTransactionId?: string,
  ): Promise<PayosServiceResult> {
    try {
      if (existingTransactionId) {
        return await this.recreateUrl(existingTransactionId, actorUserId);
      }
      const prepared = await prepareSubscription(restaurantId, cycleMonths, actorUserId, planId);
      if (!prepared.ok) return prepared.result;
      const data = prepared.data as PreparedSubscription;

      // Downgrade: đã lưu lịch hạ cấp (pendingPlanKey) trong prepareSubscription — không tạo link thanh toán.
      if (data.changeType === 'downgrade') {
        return {
          success: true,
          message: 'Đã lên lịch hạ gói — gói mới sẽ áp dụng khi hết hạn chu kỳ hiện tại.',
          data: {
            transactionId: null,
            orderCode: null,
            pendingPlanKey: data.restaurant.pendingPlanKey,
            pendingCycleMonths: data.restaurant.pendingCycleMonths,
            paidUntil: data.paidUntil,
          },
          code: 200,
        };
      }

      const orderCode = this.generateOrderCode(data.restaurant._id.toString());

      // Gói hiệu lực: planId hoặc gói hiện tại của nhà hàng (fallback gói mặc định).
      const resolvedPlanKey =
        planId || data.restaurant.currentPlanKey || (await this.getDefaultPlanKey());

      // Tạo bản ghi pending để truy vết khi webhook về.
      const transaction = await DB_Connection.Transaction.create({
        restaurant: data.restaurant._id,
        ownerId: data.restaurant.ownerId,
        transactionId: await generateTransactionId(),
        amount: data.price,
        cycleMonths: data.cycleMonths,
        type: 'restaurant-fee',
        status: 'pending',
        paidUntil: data.paidUntil,
        planKey: resolvedPlanKey ?? undefined,
        planName: data.planName ?? undefined,
        orderCode,
      });

      const description = `GOI CUOC ${orderCode}`.substring(0, 25).replace(/[^a-zA-Z0-9 ]/g, '');
      const expiredAt = Math.floor(Date.now() / 1000) + EXPIRE_IN_MINUTES * 60;

      const paymentData = {
        orderCode,
        amount: data.price,
        description,
        cancelUrl: CANCEL_URL,
        returnUrl: RETURN_URL,
        expiredAt,
      };

      const payos = await this.getPlatformPayos();
      const paymentLinkRes = await payos.paymentRequests.create(paymentData);

      console.log('PayOS createUrl result:', paymentLinkRes);
      await DB_Connection.Transaction.findByIdAndUpdate(transaction._id, {
        paymentLinkId: paymentLinkRes.paymentLinkId,
      });

      return {
        success: true,
        message: 'Tạo link thanh toán gói cước thành công',
        data: {
          transactionId: String(transaction._id),
          orderCode,
          checkoutUrl: paymentLinkRes.checkoutUrl,
          qrCodeData: paymentLinkRes.qrCode,
          paymentLinkId: paymentLinkRes.paymentLinkId,
          amount: data.price,
          planKey: resolvedPlanKey ?? null,
          planName: data.planName ?? null,
          paidUntil: data.paidUntil,
        },
        code: 200,
      };
    } catch (error: any) {
      console.error('Lỗi SubscriptionPayosService - createUrl:', error);
      return {
        success: false,
        message: 'Khởi tạo thanh toán gói cước PayOS thất bại',
        error: error?.message || error,
        code: 500,
      };
    }
  }

  /**
   * Khởi tạo lại link PayOS cho 1 giao dịch đang chờ: giữ nguyên transactionId,
   * cấp orderCode mới (link cũ có thể đã hết hạn) — số tiền/chu kỳ lấy từ bản ghi cũ.
   */
  private async recreateUrl(
    existingTransactionId: string,
    actorUserId: string | undefined,
  ): Promise<PayosServiceResult> {
    const transaction = await DB_Connection.Transaction.findById(existingTransactionId);
    if (!transaction || String(transaction.ownerId) !== String(actorUserId)) {
      return {
        success: false,
        message: 'Không tìm thấy giao dịch hoặc bạn không có quyền thao tác!',
        code: 403,
      };
    }
    if (transaction.status !== 'pending') {
      return {
        success: false,
        message: 'Giao dịch này đã được xử lý, không thể thanh toán lại!',
        code: 400,
      };
    }

    const orderCode = this.generateOrderCode(String(transaction.restaurant));
    const description = `GOI CUOC ${orderCode}`.substring(0, 25).replace(/[^a-zA-Z0-9 ]/g, '');
    const expiredAt = Math.floor(Date.now() / 1000) + EXPIRE_IN_MINUTES * 60;

    const payos = await this.getPlatformPayos();
    const paymentLinkRes = await payos.paymentRequests.create({
      orderCode,
      amount: transaction.amount,
      description,
      cancelUrl: CANCEL_URL,
      returnUrl: RETURN_URL,
      expiredAt,
    });

    await DB_Connection.Transaction.findByIdAndUpdate(transaction._id, {
      orderCode,
      paymentLinkId: paymentLinkRes.paymentLinkId,
    });

    return {
      success: true,
      message: 'Khởi tạo lại link thanh toán thành công',
      data: {
        transactionId: String(transaction._id),
        orderCode,
        checkoutUrl: paymentLinkRes.checkoutUrl,
        qrCodeData: paymentLinkRes.qrCode,
        paymentLinkId: paymentLinkRes.paymentLinkId,
        amount: transaction.amount,
        planKey: transaction.planKey ?? null,
        planName: transaction.planName ?? null,
        paidUntil: transaction.paidUntil,
      },
      code: 200,
    };
  }

  /**
   * Huỷ thanh toán của 1 giao dịch pending: gọi PayOS huỷ link theo orderCode
   * (lỗi từ PayOS — hết hạn/huỷ trước đó — không chặn việc huỷ cục bộ),
   * đánh dấu cancelled và phát sự kiện socket cho client đang lắng nghe.
   */
  async cancelPayment(
    transactionId: string,
    actorUserId: string | undefined,
  ): Promise<PayosServiceResult> {
    try {
      const transaction = await DB_Connection.Transaction.findById(transactionId);
      if (!transaction || String(transaction.ownerId) !== String(actorUserId)) {
        return {
          success: false,
          message: 'Không tìm thấy giao dịch hoặc bạn không có quyền thao tác!',
          code: 403,
        };
      }
      if (transaction.status !== 'pending') {
        return { success: false, message: 'Giao dịch này đã được xử lý!', code: 400 };
      }
      const restaurantIdStr = String(transaction.restaurant);

      let detail = 'Đơn không có liên kết PayOS để huỷ';
      if (transaction.orderCode) {
        try {
          const payos = await this.getPlatformPayos();
          await payos.paymentRequests.cancel(
            transaction.orderCode,
            'Nguoi dung huy don goi cuoc',
          );
          detail = 'Đã huỷ liên kết thanh toán trên PayOS';
        } catch (err: any) {
          console.warn(
            '[SubscriptionPayosService] Huỷ trên PayOS thất bại (bỏ qua):',
            err?.message || err,
          );
          detail = 'Liên kết PayOS không còn hiệu lực — đã huỷ cục bộ';
        }
      }

      await DB_Connection.Transaction.findByIdAndUpdate(transaction._id, { status: 'cancelled' });
      this.emitPaymentEvent(restaurantIdStr, String(transaction._id), 'cancelled', {
        reason: 'user-cancelled',
      });

      return {
        success: true,
        message: 'Đã huỷ đơn thanh toán gói cước',
        data: { transactionId: String(transaction._id), status: 'cancelled', detail },
        code: 200,
      };
    } catch (error: any) {
      console.error('Lỗi SubscriptionPayosService - cancelPayment:', error);
      return {
        success: false,
        message: 'Huỷ thanh toán gói cước thất bại',
        error: error?.message || error,
        code: 500,
      };
    }
  }

  /**
   * Webhook PayOS cho gói cước: verify chữ ký → tìm Transaction theo orderCode
   * → nếu code='00' hoàn tất thanh toán; CANCELLED → đánh dấu cancelled.
   */
  async handleWebhook(webhookData: any): Promise<any> {
    try {
      const payos = await this.getPlatformPayos();
      const { orderCode } = webhookData?.data || webhookData;

      console.log('PayOS webhook received:', webhookData);
      if (!orderCode) {
        return { success: true, message: 'Không tìm thấy orderCode', code: 404 };
      }

      const transaction = await DB_Connection.Transaction.findOne({ orderCode: orderCode });
      if (!transaction) {
        throw new Error('Không tìm thấy giao dịch từ webhook');
      }
      const verified = await payos.webhooks.verify(webhookData);
      const code = verified?.code ?? (verified as any)?.data?.code;

      if (code === '00' || status === 'PAID') {
        const restaurant = await DB_Connection.Restaurant.findById(transaction.restaurant).exec();
        if (!restaurant) {
          throw new Error('Không tìm thấy nhà hàng từ giao dịch');
        }
        const prepared: PreparedSubscription = {
          restaurant,
          price: transaction.amount,
          planName: transaction.planName ?? null,
          paidUntil: transaction.paidUntil,
          wasLocked: restaurant.subscription === 'locked',
          cycleMonths: transaction.cycleMonths,
          changeType: 'renew',
        };
        // Webhook → actor là hệ thống, ghi null actor.
        await completeSubscription(
          prepared,
          undefined,
          transaction.planKey,
          transaction._id.toString(),
        );
        this.emitPaymentEvent(String(restaurant._id), String(transaction._id), 'success', verified);
        return {
          success: true,
          message: 'Thanh toán gói cước thành công',
          data: verified,
          code: 200,
        };
      }

      if (status === 'CANCELLED' || code !== '00') {
        await DB_Connection.Transaction.findByIdAndUpdate(transaction._id, { status: 'cancelled' });
        const restaurant = await DB_Connection.Restaurant.findById(transaction.restaurant).exec();
        this.emitPaymentEvent(
          restaurant ? String(restaurant._id) : '',
          String(transaction._id),
          'cancelled',
          verified,
        );
        return {
          success: true,
          message: 'Thanh toán gói cước đã bị hủy',
          data: verified,
          code: 200,
        };
      }

      return { success: true, message: 'Webhook nhận được', data: verified, code: 200 };
    } catch (error: any) {
      console.error('Lỗi SubscriptionPayosService - handleWebhook:', error);
      return {
        success: false,
        message: 'Xử lý webhook PayOS gói cước thất bại',
        error: error?.message || error,
        code: 200,
      };
    }
  }
}

export default new SubscriptionPayosService();
