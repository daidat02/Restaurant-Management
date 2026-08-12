import qs from 'qs';
import crypto from 'crypto';
import moment from 'moment';
import DB_Connection from '../models/DB_Connection.js';
import settingRepository from '../modules/SettingModule/setting.repository.js';
import { decryptKey } from '../configs/constants.js';
import { getIO } from '../configs/socketsConfig.js';
import {
  prepareSubscription,
  completeSubscription,
  type PreparedSubscription,
} from './subscription-pay.service.js';
import type { ServiceResponse } from '../shared/type.js';
import { generateTransactionId } from './transaction-id.service.js';

type VnpayServiceResult<T = any> = ServiceResponse<T> & { success?: boolean; error?: any };

const VNP_URL = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const VNP_RETURN_URL =
  process.env.SUBSCRIPTION_VNP_RETURN_URL ||
  'http://localhost:5173/manager/pricing?vnpay=return';

/** Sắp xếp object theo key (chuẩn VNPay). */
function sortObject(obj: Record<string, any>): Record<string, string> {
  const sorted: Record<string, string> = {};
  Object.keys(obj)
    .filter((k) => obj[k] !== undefined && obj[k] !== null && obj[k] !== '')
    .sort()
    .forEach((k) => {
      sorted[k] = encodeURIComponent(String(obj[k])).replace(/%20/g, '+');
    });
  return sorted;
}

class SubscriptionVnpayService {
  /** Nạp cấu hình cổng VNPay nền tảng (gateway.vnpay) từ bản ghi scope='platform'. */
  private async getGatewayVnpay() {
    const setting = await settingRepository.findGatewaySetting();
    const vnpay = setting?.gateway?.vnpay;
    const merchant = vnpay?.merchant;
    const checksumKey = vnpay?.checksumKey;
    if (!merchant || !checksumKey) {
      throw new Error('Cổng thanh toán VNPay hệ thống chưa được cấu hình');
    }
    return { merchant, secretKey: decryptKey(checksumKey) };
  }

  private async getDefaultPlanKey() {
    const pricingService = (await import('../modules/SubscriptionModule/pricing.service.js'))
      .default;
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
   * Tạo link thanh toán VNPay cho gói cước / gia hạn.
   * Tạo Transaction status='pending' với orderCode → build URL VNPay → trả paymentUrl.
   */
  async createUrl(
    restaurantId: string,
    cycleMonths: number,
    actorUserId: string | undefined,
    planId?: string,
    ipAddr = '127.0.0.1',
  ): Promise<VnpayServiceResult> {
    try {
      const prepared = await prepareSubscription(restaurantId, cycleMonths, actorUserId, planId);
      if (!prepared.ok) return prepared.result;
      const data = prepared.data as PreparedSubscription;

      const { merchant, secretKey } = await this.getGatewayVnpay();

      // Gói hiệu lực: planId hoặc gói hiện tại (fallback mặc định).
      const resolvedPlanKey =
        planId || data.restaurant.currentPlanKey || (await this.getDefaultPlanKey());

      // Mã đơn duy nhất theo chuẩn VNPay: yyyyMMddHHmmss + random + restaurant suffix
      const dateFormat = moment().format('YYYYMMDDHHmmss');
      const restSuffix = data.restaurant._id.toString().replace(/[^0-9]/g, '').slice(-4).padStart(4, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const orderCode = `${dateFormat}${random}${restSuffix}`;
      const numericCode = Number(orderCode.slice(-9));

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
        orderCode: numericCode,
      });

      const vnpParams: Record<string, any> = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: merchant,
        vnp_Locale: 'vn',
        vnp_CurrCode: 'VND',
        vnp_TxnRef: orderCode,
        vnp_OrderInfo: `THANH TOAN GOI CUOC ${restSuffix}`.substring(0, 100),
        vnp_OrderType: 'other',
        vnp_Amount: Math.round(data.price * 100),
        vnp_IpAddr: ipAddr,
        vnp_CreateDate: dateFormat,
        vnp_ReturnUrl: VNP_RETURN_URL,
      };

      const sorted = sortObject(vnpParams);
      const signData = qs.stringify(sorted, { encode: false });
      const secureHash = crypto
        .createHmac('sha512', secretKey)
        .update(Buffer.from(signData, 'utf-8'))
        .digest('hex');
      const paymentUrl = `${VNP_URL}?${qs.stringify(sorted, { encode: false })}&vnp_SecureHash=${secureHash}`;

      await DB_Connection.Transaction.findByIdAndUpdate(transaction._id, {
        paymentLinkId: `VNPAY-${orderCode}`,
      });

      return {
        success: true,
        message: 'Tạo link thanh toán gói cước VNPay thành công',
        data: {
          transactionId: String(transaction._id),
          orderCode: numericCode,
          checkoutUrl: paymentUrl,
          paymentLinkId: `VNPAY-${orderCode}`,
          amount: data.price,
          planKey: resolvedPlanKey ?? null,
          planName: data.planName ?? null,
          paidUntil: data.paidUntil,
        },
        code: 200,
      };
    } catch (error: any) {
      console.error('Lỗi SubscriptionVnpayService - createUrl:', error);
      return {
        success: false,
        message: 'Khởi tạo thanh toán gói cước VNPay thất bại',
        error: error?.message || error,
        code: 500,
      };
    }
  }

  /**
   * Xử lý kết quả trả về từ VNPay (return URL).
   * Verify chữ ký → tìm Transaction theo vnp_TxnRef → code '00' hoàn tất; ngược lại cancelled.
   */
  async handleReturn(vnpParams: any): Promise<VnpayServiceResult> {
    try {
      const { merchant, secretKey } = await this.getGatewayVnpay();

      const secureHash = vnpParams.vnp_SecureHash;
      if (!secureHash) {
        return { success: false, message: 'Thiếu chữ ký VNPay', code: 400 };
      }
      const paramsCopy = { ...vnpParams };
      delete paramsCopy.vnp_SecureHash;
      delete paramsCopy.vnp_SecureHashType;

      const sorted = sortObject(paramsCopy);
      const signData = qs.stringify(sorted, { encode: false });
      const checksum = crypto
        .createHmac('sha512', secretKey)
        .update(Buffer.from(signData, 'utf-8'))
        .digest('hex');

      if (checksum !== secureHash) {
        return { success: false, message: 'Chữ ký VNPay không hợp lệ', code: 400 };
      }

      const txnRef = vnpParams.vnp_TxnRef;
      const numericCode = Number(String(txnRef).slice(-9));
      const responseCode = vnpParams.vnp_ResponseCode;

      const transaction = await DB_Connection.Transaction.findOne({ orderCode: numericCode });
      if (!transaction) {
        return { success: false, message: 'Không tìm thấy giao dịch từ VNPay', code: 404 };
      }

      if (responseCode === '00') {
        const restaurant = await DB_Connection.Restaurant.findById(transaction.restaurant).exec();
        if (!restaurant) {
          return { success: false, message: 'Không tìm thấy nhà hàng từ giao dịch', code: 404 };
        }
        const prepared: PreparedSubscription = {
          restaurant,
          price: transaction.amount,
          planName: transaction.planName ?? null,
          paidUntil: transaction.paidUntil,
          wasLocked: restaurant.subscription === 'locked',
          cycleMonths: transaction.cycleMonths,
        };
        await completeSubscription(prepared, undefined, transaction.planKey, transaction._id.toString());
        this.emitPaymentEvent(
          String(restaurant._id),
          String(transaction._id),
          'success',
          { responseCode, txnRef, amount: transaction.amount },
        );
        return {
          success: true,
          message: 'Thanh toán gói cước VNPay thành công',
          data: { responseCode, txnRef, amount: transaction.amount },
          code: 200,
        };
      }

      await DB_Connection.Transaction.findByIdAndUpdate(transaction._id, { status: 'cancelled' });
      const restaurant = await DB_Connection.Restaurant.findById(transaction.restaurant).exec();
      this.emitPaymentEvent(
        restaurant ? String(restaurant._id) : '',
        String(transaction._id),
        'cancelled',
        { responseCode, txnRef },
      );
      return {
        success: false,
        message: 'Thanh toán gói cước VNPay bị hủy hoặc thất bại',
        data: { responseCode, txnRef },
        code: 200,
      };
    } catch (error: any) {
      console.error('Lỗi SubscriptionVnpayService - handleReturn:', error);
      return {
        success: false,
        message: 'Xử lý trả về VNPay gói cước thất bại',
        error: error?.message || error,
        code: 500,
      };
    }
  }
}

export default new SubscriptionVnpayService();
