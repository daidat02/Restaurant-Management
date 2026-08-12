import DB_Connection from '../models/DB_Connection.js';
import type { ServiceResponse } from '../shared/type.js';
import pricingService from '../modules/SubscriptionModule/pricing.service.js';
import { writeAuditLog } from './auditLog.service.js';
import { generateTransactionId } from './transaction-id.service.js';

const VALID_CYCLES = [1, 3, 6, 12];

export interface PreparedSubscription {
  restaurant: any;
  price: number;
  planName: string | null;
  paidUntil: Date;
  wasLocked: boolean;
  cycleMonths: number;
}

/**
 * Kiểm tra quyền sở hữu + tính giá + thời gian hết hạn + ràng buộc hạ gói.
 * Dùng chung cho thanh toán mock (payService) và PayOS (createUrl/webhook).
 */
export async function prepareSubscription(
  restaurantId: string,
  cycleMonths: number,
  actorUserId: string | undefined,
  planId?: string,
): Promise<{ ok: true; data: PreparedSubscription } | { ok: false; result: ServiceResponse<any> }> {
  if (!restaurantId || !VALID_CYCLES.includes(cycleMonths)) {
    return { ok: false, result: { message: 'Thiếu thông tin hoặc chu kỳ không hợp lệ!', code: 400 } };
  }

  const restaurant = await DB_Connection.Restaurant.findById(restaurantId).exec();
  if (!restaurant) {
    return { ok: false, result: { message: 'Nhà hàng không tồn tại!', code: 404 } };
  }

  // Chỉ chủ sở hữu (admin sở hữu nhà hàng) mới được thanh toán
  if (!actorUserId || restaurant.ownerId?.toString() !== actorUserId.toString()) {
    return { ok: false, result: { message: 'Bạn không sở hữu nhà hàng này!', code: 403 } };
  }

  // Giá theo gói đã chọn (planId), fallback về giá chu kỳ mặc định.
  const price = planId
    ? await pricingService.getPlanPriceForCycle(planId, cycleMonths)
    : await pricingService.getPriceForCycle(cycleMonths);
  if (!price) {
    return { ok: false, result: { message: 'Chu kỳ thanh toán hoặc gói dịch vụ không hợp lệ!', code: 400 } };
  }
  const planName = planId ? await pricingService.getPlanName(planId) : null;

  const now = new Date();
  const wasLocked = restaurant.subscription === 'locked';
  // Gia hạn: paidUntil tối đa giữa now và paidUntil hiện tại + chu kỳ (không mất thời gian còn lại)
  const base = restaurant.paidUntil && restaurant.paidUntil.getTime() > now.getTime()
    ? restaurant.paidUntil
    : now;
  const paidUntil = new Date(base.getTime() + cycleMonths * 30 * 24 * 3600 * 1000);

  // Còn hạn (active + chưa hết hạn) thì KHÔNG được hạ xuống gói thấp hơn gói hiện tại.
  const currentPlanKey = restaurant.currentPlanKey || (await pricingService.getDefaultPlanKey());
  if (
    planId &&
    currentPlanKey &&
    restaurant.subscription === 'active' &&
    restaurant.paidUntil &&
    restaurant.paidUntil.getTime() > now.getTime()
  ) {
    const currentSort = await pricingService.getPlanSortOrder(currentPlanKey);
    const newSort = await pricingService.getPlanSortOrder(planId);
    if (newSort < currentSort) {
      return {
        ok: false,
        result: {
          message: 'Không thể hạ gói khi còn hạn! Bạn có thể nâng cấp gói cao hơn hoặc chờ hết hạn để đổi gói.',
          code: 400,
        },
      };
    }
  }

  return { ok: true, data: { restaurant, price, planName, paidUntil, wasLocked, cycleMonths } };
}

/**
 * Hoàn tất thanh toán: tạo Transaction(paid), kích hoạt nhà hàng, ghi audit.
 * Dùng chung cho thanh toán mock và webhook PayOS (khi verify thành công).
 * Nếu truyền `existingTransaction` → cập nhật bản ghi pending thành paid thay vì tạo mới.
 */
export async function completeSubscription(
  prepared: PreparedSubscription,
  actorUserId: string | undefined,
  planId?: string,
  existingTransactionId?: string,
) {
  const { restaurant, price, planName, paidUntil, wasLocked, cycleMonths } = prepared;

  const transactionData = {
    restaurant: restaurant._id,
    ownerId: restaurant.ownerId,
    amount: price,
    cycleMonths,
    type: 'restaurant-fee' as const,
    status: 'paid' as const,
    paidUntil,
    planKey: planId ?? undefined,
    planName: planName ?? undefined,
  };

  let transaction;
  if (existingTransactionId) {
    const existing = await DB_Connection.Transaction.findById(existingTransactionId).lean<{
      transactionId?: string;
    }>();
    transaction = await DB_Connection.Transaction.findByIdAndUpdate(
      existingTransactionId,
      {
        ...transactionData,
        transactionId: existing?.transactionId || (await generateTransactionId()),
        orderCode: undefined,
        paymentLinkId: undefined,
      },
      { new: true },
    );
  } else {
    const transactionId = await generateTransactionId();
    transaction = await DB_Connection.Transaction.create({ ...transactionData, transactionId });
  }

  restaurant.subscription = 'active';
  restaurant.paidUntil = paidUntil;
  restaurant.trialEndsAt = undefined;
  // Cập nhật gói hiện tại: theo gói đã chọn, hoặc gói mặc định nếu thanh toán legacy không có gói.
  const resolvedPlanKey = planId || (await pricingService.getDefaultPlanKey());
  if (resolvedPlanKey) restaurant.currentPlanKey = resolvedPlanKey;
  await restaurant.save();

  await writeAuditLog({
    action: 'transaction.create',
    restaurant: String(restaurant._id),
    actor: actorUserId || null,
    actorInfo: { role: 'admin' },
    targetType: 'restaurant',
    targetId: String(restaurant._id),
    summary: `Thanh toán ${price.toLocaleString('vi-VN')}đ cho ${cycleMonths} tháng`,
    meta: { transactionId: String(transaction._id), amount: price, cycleMonths, paidUntil },
  });
  if (wasLocked) {
    await writeAuditLog({
      action: 'subscription.unlocked',
      restaurant: String(restaurant._id),
      actor: actorUserId || null,
      actorInfo: { role: 'admin' },
      targetType: 'restaurant',
      targetId: String(restaurant._id),
      summary: `Nhà hàng "${restaurant.name}" đã mở lại sau khi thanh toán`,
    });
  }

  return { restaurant, transaction, paidUntil };
}

class SubscriptionService {
  /**
   * Thanh toán / gia hạn mock: tạo Transaction(paid), subscription → active,
   * paidUntil = max(now, paidUntil) + chu kỳ. Chỉ chủ sở hữu (admin) mới được trả cho nhà hàng của mình.
   */
  async payService(
    restaurantId: string,
    cycleMonths: number,
    actorUserId: string | undefined,
    planId?: string,
  ): Promise<ServiceResponse<any>> {
    const prepared = await prepareSubscription(restaurantId, cycleMonths, actorUserId, planId);
    if (!prepared.ok) return prepared.result;

    const result = await completeSubscription(prepared.data, actorUserId, planId);

    return {
      message: 'Thanh toán thành công! Nhà hàng đã hoạt động.',
      data: { restaurant: result.restaurant, transaction: result.transaction, paidUntil: result.paidUntil },
      code: 200,
    };
  }

  /** Trạng thái các nhà hàng của chủ (kèm số ngày còn lại). */
  async meService(ownerId: string | undefined): Promise<ServiceResponse<any>> {
    if (!ownerId) return { message: 'Thiếu chủ sở hữu!', code: 403 };
    const restaurants = await DB_Connection.Restaurant.find({ ownerId }).exec();
    const now = Date.now();
    const items = restaurants.map((r) => ({
      _id: r._id,
      name: r.name,
      subscription: r.subscription,
      trialEndsAt: r.trialEndsAt,
      paidUntil: r.paidUntil,
      currentPlanKey: r.currentPlanKey ?? undefined,
      daysLeft: r.subscription === 'trial' && r.trialEndsAt
        ? Math.ceil((r.trialEndsAt.getTime() - now) / (24 * 3600 * 1000))
        : r.subscription === 'active' && r.paidUntil
          ? Math.ceil((r.paidUntil.getTime() - now) / (24 * 3600 * 1000))
          : 0,
    }));
    return { message: 'Lấy trạng thái thuê bao thành công', data: items, code: 200 };
  }

  /** Lịch sử giao dịch của chủ sở hữu (chỉ giao dịch thuộc các nhà hàng của họ). */
  async transactionsService(ownerId: string | undefined): Promise<ServiceResponse<any>> {
    if (!ownerId) return { message: 'Thiếu chủ sở hữu!', code: 403 };
    const transactions = await DB_Connection.Transaction.find({ ownerId })
      .sort({ createdAt: -1 })
      .populate('restaurant', 'name')
      .lean();
    return {
      message: 'Lấy lịch sử giao dịch thành công',
      data: transactions,
      code: 200,
    };
  }
}

export default new SubscriptionService();
