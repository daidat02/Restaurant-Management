import paymentRepository from '../modules/PaymentModule/payment.repository.js';
import paymentService from '../modules/PaymentModule/payment.service.js';
import orderRepository from '../modules/OrderModule/order.repository.js';
import { getIO } from '../configs/socketsConfig.js';
import { writeAuditLog } from '../services/auditLog.service.js';
import { registerJobHandler } from './handlers.js';

/**
 * ==========================================
 * JOB: complete-payment (queue payment-webhook)
 * ==========================================
 * Route PayOS /webhook verify chữ ký SYNC rồi `addJob('payment-webhook',
 * 'complete-payment', { provider, orderCode, verifiedStatus })` và ack 200.
 *
 * Job này HOÀN TẤT thanh toán với idempotency + atomic claim:
 *   - idempotent guard: payment đã `captured` → no-op (webhook gửi lại).
 *   - atomic claim: findOneAndUpdate({_id, status:'authorized'},{status:'captured'}),
 *     update=0 → đã có job khác xử lý → bỏ qua (không double-complete).
 *   - CANCELLED từ gateway → đánh dấu `cancelled`.
 *   - Redis down → addJob chạy inline CÙNG handler này (cùng logic worker).
 */

export const PAYMENT_VERIFIED_SUCCESS = 'SUCCESS' as const;
export const PAYMENT_VERIFIED_CANCELLED = 'CANCELLED' as const;

export type VerifiedPaymentStatus =
  | typeof PAYMENT_VERIFIED_SUCCESS
  | typeof PAYMENT_VERIFIED_CANCELLED
  | 'PENDING';

export interface CompletePaymentData {
  provider: 'payos' | 'vnpay';
  orderCode: number;
  verifiedStatus: VerifiedPaymentStatus;
}

const completePayment = async (payload: CompletePaymentData): Promise<void> => {
  const { orderCode, verifiedStatus } = payload;

  const existingPayment = await paymentRepository.findPaymentByOrderCode(orderCode);
  if (!existingPayment) {
    const message = `Không tìm thấy thanh toán ứng với orderCode ${orderCode}`;
    console.error(`[Job complete-payment] ${message}`);
    throw new Error(message);
  }

  // Trạng thái gateway không phải SUCCESS/CANCELLED (VD: PENDING/PROCESSING) → chưa cần làm gì.
  if (verifiedStatus !== PAYMENT_VERIFIED_SUCCESS && verifiedStatus !== PAYMENT_VERIFIED_CANCELLED) {
    console.warn(`[Job complete-payment] orderCode ${orderCode} — verifiedStatus=${verifiedStatus}, bỏ qua.`);
    return;
  }

  const paymentId = existingPayment._id.toString();

  if (verifiedStatus === PAYMENT_VERIFIED_CANCELLED) {
    if (existingPayment.status !== 'cancelled') {
      await paymentRepository.changePaymentStatus(paymentId, 'cancelled');
      console.log(`[Job complete-payment] orderCode ${orderCode} → cancelled.`);
    }
    return;
  }

  // Idempotent guard: đã hoàn tất → webhook gửi trùng → no-op ack.
  if (existingPayment.status === 'captured') {
    console.warn(`[Job complete-payment] orderCode ${orderCode} đã captured, bỏ qua (idempotent).`);
    return;
  }

  // Atomic claim: chỉ job đầu tiên giành quyền hoàn tất capture.
  const claimed = await paymentRepository.claimCaptured(paymentId);
  if (!claimed) {
    console.warn(`[Job complete-payment] orderCode ${orderCode} — claim thất bại (đã xử lý bởi job khác).`);
    return;
  }

  // Chốt đơn + giải phóng bàn + cập nhật payment (trong transaction của service).
  const result = await paymentService.changePaymentStatusAuthorized(paymentId, 'captured');
  if (result.code !== 200) {
    // Đơn chưa đủ điều kiện hoặc lỗi DB → trả payment về 'authorized' để retry thử lại.
    await paymentRepository.updatePayment(paymentId, { status: 'authorized' });
    throw new Error(result.message || `Không thể hoàn tất thanh toán orderCode ${orderCode}`);
  }

  // Emit socket (chuyển từ payos.service.handleWebhook → job).
  const order = await orderRepository.findOrders({ _id: existingPayment.order.toString() });
  const currentOrder = order[0];
  const io = getIO();
  io.to(`payment_${existingPayment._id}`).emit('payment_success', { orderCode });
  if (currentOrder) {
    io.to(`restaurant_${currentOrder.restaurant.toString()}`).emit('order_event', {
      action: 'CREATE',
      orderData: currentOrder,
      message: 'Có đơn giao hàng mới',
    });
  }

  // Ghi audit (hoàn tất thanh toán gateway).
  await writeAuditLog({
    action: 'payment.captured',
    restaurant: currentOrder?.restaurant?.toString() || null,
    targetType: 'payment',
    targetId: paymentId,
    summary: `Hoàn tất thanh toán PayOS orderCode ${orderCode} (${existingPayment.amount}đ)`,
    meta: { provider: payload.provider, orderCode, amount: existingPayment.amount },
  });

  console.log(`[Job complete-payment] orderCode ${orderCode} → captured, đã emit socket.`);
};

registerJobHandler('complete-payment', completePayment);

export default completePayment;