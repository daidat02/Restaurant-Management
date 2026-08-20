import DB_Connection from '../models/DB_Connection.js';
import type {
  IRestaurant,
  RestaurantSubscription,
} from '../models/Schema/RestaurantSchema.js';
import { writeAuditLog } from './auditLog.service.js';
import pricingService from '../modules/SubscriptionModule/pricing.service.js';
import { sendEmailAsync } from './email.service.js';
import { APP_PUBLIC_URL } from '../configs/constants.js';

export const EXPIRING_WARNING_DAYS = 7;
export const MONTH_MS = 30 * 24 * 3600 * 1000;

export interface SubscriptionStateResult {
  restaurant: IRestaurant;
  subscription: RestaurantSubscription;
  changed: boolean;
}

/**
 * Tính toán & cập nhật trạng thái subscription của nhà hàng theo ngày hiện tại.
 * - active & quá paidUntil:
 *   - có pendingPlanKey → áp dụng gói đã lên lịch hạ cấp, tính paidUntil theo chu kỳ đã chọn.
 *   - còn lại (gói trả phí) → hạ về gói Miễn Phí, paidUntil = null. KHÔNG khoá.
 *   - đã là gói Miễn Phí → không làm gì.
 * - pending/locked: giữ nguyên (khoá thủ công hoặc chờ thanh toán).
 * Idempotent: nếu trạng thái không đổi thì không ghi gì.
 */
export async function applySubscriptionState(restaurantId: string): Promise<SubscriptionStateResult | null> {
  const restaurant = await DB_Connection.Restaurant.findById(restaurantId).exec();
  if (!restaurant) return null;

  const now = new Date();
  const { subscription, paidUntil } = restaurant;
  const result: SubscriptionStateResult = {
    restaurant,
    subscription: subscription as RestaurantSubscription,
    changed: false,
  };

  // ---- active hết hạn paidUntil → hạ gói (KHÔNG khoá) ----
  if (subscription === 'active' && paidUntil && now.getTime() > paidUntil.getTime()) {
    const freePlanKey = (await pricingService.getDefaultPlanKey()) ?? 'free';

    // Có gói đã lên lịch hạ cấp → áp dụng cuối chu kỳ
    if (restaurant.pendingPlanKey) {
      const appliedPlanKey = restaurant.pendingPlanKey;
      const cycleMonths = restaurant.pendingCycleMonths || 1;
      restaurant.currentPlanKey = appliedPlanKey;
      restaurant.paidUntil = new Date(now.getTime() + cycleMonths * MONTH_MS);
      restaurant.pendingPlanKey = undefined;
      restaurant.pendingCycleMonths = undefined;
      restaurant.expiringEmailSentAt = undefined;
      result.changed = true;
      await restaurant.save();
      const planName = (await pricingService.getPlanName(appliedPlanKey)) ?? appliedPlanKey;
      await writeAuditLog({
        action: 'subscription.downgrade',
        restaurant: String(restaurant._id),
        actor: null,
        actorInfo: { role: 'system' },
        targetType: 'restaurant',
        targetId: String(restaurant._id),
        summary: `Nhà hàng "${restaurant.name}" đã hạ xuống gói "${planName}" theo lịch trình`,
        meta: { reason: 'pending-downgrade-applied', plan: appliedPlanKey, cycleMonths },
      });
      await createSubscriptionNotification(
        restaurant,
        'subscription.downgrade',
        `Đã hạ gói xuống "${planName}" theo lịch trình (${cycleMonths} tháng)`,
      );
      await sendDowngradedEmail(restaurant, appliedPlanKey, 'pending-downgrade-applied', planName);
      return result;
    }

    // Gói trả phí hết hạn → hạ về Miễn Phí (KHÔNG khoá)
    if (restaurant.currentPlanKey && restaurant.currentPlanKey !== freePlanKey) {
      const oldPlanKey = restaurant.currentPlanKey;
      restaurant.currentPlanKey = freePlanKey;
      restaurant.paidUntil = undefined;
      restaurant.expiringEmailSentAt = undefined;
      result.changed = true;
      await restaurant.save();
      const oldPlanName = (await pricingService.getPlanName(oldPlanKey)) ?? oldPlanKey;
      await writeAuditLog({
        action: 'subscription.downgrade',
        restaurant: String(restaurant._id),
        actor: null,
        actorInfo: { role: 'system' },
        targetType: 'restaurant',
        targetId: String(restaurant._id),
        summary: `Hết hạn gói "${oldPlanName}" — nhà hàng "${restaurant.name}" đã chuyển sang gói Miễn Phí`,
        meta: { reason: 'paid-expired', plan: oldPlanKey, newPlan: freePlanKey },
      });
      await createSubscriptionNotification(
        restaurant,
        'subscription.downgrade',
        'Gói trả phí đã hết hạn — nhà hàng chuyển sang gói Miễn Phí',
      );
      await sendDowngradedEmail(restaurant, freePlanKey, 'paid-expired', oldPlanName);
      return result;
    }

    // Đã là gói Miễn Phí (không có paidUntil) → không làm gì
  }

  // ---- Cảnh báo sắp hết hạn (≤ EXPIRING_WARNING_DAYS) ----
  const nowTime = now.getTime();
  if (
    subscription === 'active' &&
    paidUntil &&
    nowTime < paidUntil.getTime() &&
    paidUntil.getTime() - nowTime <= EXPIRING_WARNING_DAYS * 24 * 3600 * 1000
  ) {
    const freePlanKey = (await pricingService.getDefaultPlanKey()) ?? 'free';
    const isPaid = restaurant.currentPlanKey && restaurant.currentPlanKey !== freePlanKey;
    if (isPaid && !restaurant.expiringEmailSentAt) {
      restaurant.expiringEmailSentAt = new Date();
      result.changed = true;
      await restaurant.save();
      const planName =
        (await pricingService.getPlanName(restaurant.currentPlanKey!)) ?? restaurant.currentPlanKey!;
      await sendOwnerEmail(restaurant, {
        template: 'subscription-expiring',
        data: {
          planName,
          daysLeft: Math.ceil((paidUntil.getTime() - nowTime) / (24 * 3600 * 1000)),
          paidUntil: paidUntil.toLocaleDateString('vi-VN'),
          billingUrl: `${APP_PUBLIC_URL}/admin/billing`,
        },
      });
    }
  } else if (paidUntil && nowTime + EXPIRING_WARNING_DAYS * 24 * 3600 * 1000 < paidUntil.getTime() && restaurant.expiringEmailSentAt) {
    // Gói được gia hạn → tái lập cờ cảnh báo (cho phép gửi lại khi sắp hết hạn lần sau).
    restaurant.expiringEmailSentAt = undefined;
    result.changed = true;
    await restaurant.save();
  }

  return result;
}

/** Gửi email hạ gói tới chủ sở hữu (nền qua queue — không chặn state). */
async function sendDowngradedEmail(
  restaurant: IRestaurant,
  newPlanKey: string,
  reason: 'paid-expired' | 'pending-downgrade-applied',
  oldPlanName?: string,
): Promise<void> {
  const newPlanName = (await pricingService.getPlanName(newPlanKey)) ?? newPlanKey;
  await sendOwnerEmail(restaurant, {
    template: 'subscription-downgraded',
    data: {
      planName: newPlanName,
      reason:
        reason === 'paid-expired'
          ? `Gói "${oldPlanName ?? 'trả phí'}" đã hết hạn thanh toán`
          : 'Hạ cấp theo lịch trình đã đăng ký',
      paidUntil: restaurant.paidUntil?.toLocaleDateString('vi-VN'),
    },
  });
}

/** Gửi email tới chủ sở hữu nhà hàng — lỗi gửi KHÔNG ảnh hưởng luồng chính. */
async function sendOwnerEmail(
  restaurant: IRestaurant,
  payload: { template: 'subscription-expiring' | 'subscription-downgraded'; data: Record<string, unknown> },
): Promise<void> {
  try {
    if (!restaurant.ownerId) return;
    const owner = (await DB_Connection.User.findById(restaurant.ownerId).lean()) as
      | { name?: string; email?: string }
      | null;
    if (!owner?.email) return;
    await sendEmailAsync({
      template: payload.template,
      to: owner.email,
      data: {
        name: owner.name || owner.email,
        restaurantName: restaurant.name,
        ...payload.data,
      },
    });
  } catch (error) {
    console.error(`[applySubscriptionState] Gửi email "${payload.template}" thất bại:`, error);
  }
}

/** Kiểm tra nhà hàng còn dùng được không (active — Miễn Phí hoặc trả phí). Nếu locked/pending → ném lỗi chuẩn RESTAURANT_LOCKED. */
export async function assertRestaurantUsable(restaurantId: string): Promise<IRestaurant> {
  const state = await applySubscriptionState(restaurantId);
  if (!state) {
    const err = new Error('Nhà hàng không tồn tại!') as any;
    err.statusCode = 404;
    throw err;
  }
  if (state.subscription === 'locked' || state.subscription === 'pending') {
    const err: any = new Error(
      state.subscription === 'pending'
        ? 'Nhà hàng đang chờ thanh toán'
        : 'Nhà hàng bị khoá do hết hạn thanh toán',
    );
    err.statusCode = 403;
    err.code = 'RESTAURANT_LOCKED';
    throw err;
  }
  return state.restaurant;
}

/** Tạo thông báo (bell) cho chủ sở hữu + các admin của nhà hàng. */
async function createSubscriptionNotification(
  restaurant: IRestaurant,
  event: string,
  message: string,
): Promise<void> {
  try {
    const targets = await DB_Connection.User.find({
      $or: [
        { _id: restaurant.ownerId },
        { restaurantIds: restaurant._id, role: 'admin' },
      ],
    })
      .select('_id')
      .lean();
    const userIds = (targets as any[]).map((u) => u._id);
    await DB_Connection.Notification.insertMany(
      userIds.map((userId) => ({
        user: userId,
        restaurant: restaurant._id,
        type: 'subscription',
        message,
        data: { event, restaurantId: String(restaurant._id) },
        isRead: false,
      })),
    );
  } catch (error) {
    console.error('createSubscriptionNotification error:', error);
  }
}
