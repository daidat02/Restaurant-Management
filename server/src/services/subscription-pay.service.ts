import DB_Connection from '../models/DB_Connection.js';
import type { ServiceResponse } from '../shared/type.js';
import pricingService from '../modules/SubscriptionModule/pricing.service.js';
import { writeAuditLog } from './auditLog.service.js';
import { generateTransactionId } from './transaction-id.service.js';
import { countResource } from './plan-gate.service.js';

const VALID_CYCLES = [1, 3, 6, 12];
const DAY_MS = 24 * 3600 * 1000;

export interface PreparedSubscription {
  restaurant: any;
  price: number;
  planName: string | null;
  paidUntil: Date;
  wasLocked: boolean;
  cycleMonths: number;
  /** Loại thay đổi: renew (mua mới/gia hạn), upgrade (nâng gói khi còn hạn), downgrade (lên lịch hạ gói cuối chu kỳ). */
  changeType: 'renew' | 'upgrade' | 'downgrade';
}

/**
 * Kiểm tra quyền sở hữu + tính giá + thời gian hết hạn.
 * Dùng chung cho thanh toán mock (payService) và PayOS (createUrl/webhook).
 * - Còn hạn & chuyển sang gói cao hơn (upgrade): hiệu lực ngay, chỉ tính phần chênh lệch thời gian còn lại,
 *   paidUntil giữ nguyên (không cộng dồn chu kỳ mới).
 * - Còn hạn & chuyển sang gói thấp hơn (downgrade): KHÔNG chặn — lưu pendingPlanKey + pendingCycleMonths,
 *   áp dụng cuối chu kỳ, KHÔNG trừ tiền, trả về changeType='downgrade' để caller không tạo thanh toán.
 * - Còn lại (renew): paidUntil = max(now, paidUntil) + chu kỳ.
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

  const now = new Date();
  const stillActive =
    restaurant.subscription === 'active' &&
    restaurant.paidUntil &&
    restaurant.paidUntil.getTime() > now.getTime();

  // ---- Downgrade: còn hạn & chuyển xuống gói thấp hơn → lưu lịch hạ cấp, không tính tiền ----
  if (stillActive && planId) {
    const currentPlanKey = restaurant.currentPlanKey || (await pricingService.getDefaultPlanKey());
    if (currentPlanKey) {
      const currentSort = await pricingService.getPlanSortOrder(currentPlanKey);
      const newSort = await pricingService.getPlanSortOrder(planId);
      const planName = await pricingService.getPlanName(planId);
      if (newSort < currentSort) {
        restaurant.pendingPlanKey = planId;
        restaurant.pendingCycleMonths = cycleMonths;
        await restaurant.save();
        return {
          ok: true,
          data: {
            restaurant,
            price: 0,
            planName,
            paidUntil: restaurant.paidUntil!,
            wasLocked: false,
            cycleMonths,
            changeType: 'downgrade',
          },
        };
      }
    }
  }

  // Giá theo gói đã chọn (planId), fallback về giá chu kỳ mặc định.
  const price = planId
    ? await pricingService.getPlanPriceForCycle(planId, cycleMonths)
    : await pricingService.getPriceForCycle(cycleMonths);
  if (!price) {
    return { ok: false, result: { message: 'Chu kỳ thanh toán hoặc gói dịch vụ không hợp lệ!', code: 400 } };
  }
  const planName = planId ? await pricingService.getPlanName(planId) : null;

  // ---- Upgrade: còn hạn & chuyển lên gói cao hơn → chỉ tính chênh lệch theo thời gian còn lại,
  //      paidUntil giữ nguyên, gói mới hiệu lực ngay (completeSubscription cập nhật currentPlanKey).
  if (stillActive && planId) {
    const currentPlanKey = restaurant.currentPlanKey || (await pricingService.getDefaultPlanKey());
    if (currentPlanKey) {
      const currentSort = await pricingService.getPlanSortOrder(currentPlanKey);
      const newSort = await pricingService.getPlanSortOrder(planId);
      if (newSort > currentSort) {
        const currentMonthly = await pricingService.getPlanPriceForCycle(currentPlanKey, 1);
        const newMonthly = await pricingService.getPlanPriceForCycle(planId, 1);
        if (currentMonthly && newMonthly && currentMonthly > 0 && newMonthly > 0) {
          const daysLeft = Math.ceil(
            (restaurant.paidUntil!.getTime() - now.getTime()) / DAY_MS,
          );
          const diffPrice = Math.round(((newMonthly - currentMonthly) * daysLeft) / 30);
          return {
            ok: true,
            data: {
              restaurant,
              price: diffPrice > 0 ? diffPrice : 0,
              planName,
              paidUntil: restaurant.paidUntil!,
              wasLocked: false,
              cycleMonths,
              changeType: 'upgrade',
            },
          };
        }
      }
    }
  }

  // ---- Renew / mua mới: paidUntil = max(now, paidUntil) + chu kỳ ----
  const wasLocked = restaurant.subscription === 'locked';
  const base = restaurant.paidUntil && restaurant.paidUntil.getTime() > now.getTime()
    ? restaurant.paidUntil
    : now;
  const paidUntil = new Date(base.getTime() + cycleMonths * 30 * DAY_MS);

  return {
    ok: true,
    data: { restaurant, price, planName, paidUntil, wasLocked, cycleMonths, changeType: 'renew' },
  };
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
  // Một khoản thanh toán mới (gia hạn/nâng cấp) thay thế mọi lịch hạ cấp đã đặt trước đó.
  restaurant.pendingPlanKey = undefined;
  restaurant.pendingCycleMonths = undefined;
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

    // Downgrade: đã lưu lịch hạ cấp (pendingPlanKey), không tạo thanh toán/transaction.
    if (prepared.data.changeType === 'downgrade') {
      return {
        message: 'Đã lên lịch hạ gói — gói mới sẽ áp dụng khi hết hạn chu kỳ hiện tại.',
        data: {
          restaurant: prepared.data.restaurant,
          pendingPlanKey: prepared.data.restaurant.pendingPlanKey,
          pendingCycleMonths: prepared.data.restaurant.pendingCycleMonths,
          paidUntil: prepared.data.paidUntil,
        },
        code: 200,
      };
    }

    const result = await completeSubscription(prepared.data, actorUserId, planId);

    return {
      message: 'Thanh toán thành công! Nhà hàng đã hoạt động.',
      data: { restaurant: result.restaurant, transaction: result.transaction, paidUntil: result.paidUntil },
      code: 200,
    };
  }

  /** Trạng thái các nhà hàng của chủ (kèm số ngày còn lại + mức sử dụng bàn/món/NV). */
  async meService(ownerId: string | undefined): Promise<ServiceResponse<any>> {
    if (!ownerId) return { message: 'Thiếu chủ sở hữu!', code: 403 };
    const restaurants = await DB_Connection.Restaurant.find({ ownerId }).exec();
    const now = Date.now();
    // Mức sử dụng hiện tại để hiển thị "Đang dùng X/Y" trên trang thanh toán.
    const usageList = await Promise.all(
      restaurants.map(async (r) => ({
        restaurantId: String(r._id),
        tables: await DB_Connection.Table.countDocuments({ restaurant: r._id }),
        items: await DB_Connection.MenuItem.countDocuments({ restaurant: r._id }),
        staff: await DB_Connection.User.countDocuments({ restaurantIds: r._id, role: 'staff' }),
        daily_orders: await countResource(String(r._id), 'daily_orders'),
        group_chats: await countResource(String(r._id), 'group_chats'),
      })),
    );
    const usageByRestaurant = new Map(usageList.map((u) => [u.restaurantId, u]));
    const items = restaurants.map((r) => {
      const usage = usageByRestaurant.get(String(r._id));
      return {
        _id: r._id,
        name: r.name,
        subscription: r.subscription,
        trialEndsAt: r.trialEndsAt,
        paidUntil: r.paidUntil,
        currentPlanKey: r.currentPlanKey ?? undefined,
        pendingPlanKey: r.pendingPlanKey ?? undefined,
        pendingCycleMonths: r.pendingCycleMonths ?? undefined,
        daysLeft: r.subscription === 'active' && r.paidUntil
          ? Math.ceil((r.paidUntil.getTime() - now) / (24 * 3600 * 1000))
          : 0,
        usage: usage
          ? {
              tables: usage.tables,
              items: usage.items,
              staff: usage.staff,
              daily_orders: usage.daily_orders,
              group_chats: usage.group_chats,
            }
          : undefined,
      };
    });
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

  /** Mức sử dụng hiện tại của 1 nhà hàng — cho gate UI (đơn/ngày, nhóm chat, bàn, món, NV). */
  async usageService(
    restaurantId: string | undefined,
    userId: string | undefined,
  ): Promise<ServiceResponse<any>> {
    if (!restaurantId || !userId) {
      return { message: 'Thiếu thông tin nhà hàng!', code: 400 };
    }
    const restaurant = await DB_Connection.Restaurant.findById(restaurantId).exec();
    if (!restaurant) return { message: 'Nhà hàng không tồn tại!', code: 404 };
    // Quyền: chủ sở hữu, hoặc manager/staff thuộc chi nhánh.
    const isOwner = String((restaurant as any).ownerId ?? '') === userId;
    if (!isOwner) {
      const member = await DB_Connection.User.findOne({ _id: userId, restaurantIds: restaurantId }).lean();
      if (!member) return { message: 'Bạn không có quyền xem nhà hàng này!', code: 403 };
    }
    const usage = {
      tables: await countResource(restaurantId, 'tables'),
      items: await countResource(restaurantId, 'items'),
      staff: await countResource(restaurantId, 'staff'),
      daily_orders: await countResource(restaurantId, 'daily_orders'),
      group_chats: await countResource(restaurantId, 'group_chats'),
    };
    return { message: 'Lấy mức sử dụng thành công', data: usage, code: 200 };
  }
}

export default new SubscriptionService();
