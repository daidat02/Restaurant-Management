import DB_Connection from '../models/DB_Connection.js';
import type {
  IRestaurant,
  RestaurantSubscription,
} from '../models/Schema/RestaurantSchema.js';
import { writeAuditLog } from './auditLog.service.js';
import pricingService from '../modules/SubscriptionModule/pricing.service.js';

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
      return result;
    }

    // Gói trả phí hết hạn → hạ về Miễn Phí (KHÔNG khoá)
    if (restaurant.currentPlanKey && restaurant.currentPlanKey !== freePlanKey) {
      const oldPlanKey = restaurant.currentPlanKey;
      restaurant.currentPlanKey = freePlanKey;
      restaurant.paidUntil = undefined;
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
      return result;
    }

    // Đã là gói Miễn Phí (không có paidUntil) → không làm gì
  }

  return result;
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
