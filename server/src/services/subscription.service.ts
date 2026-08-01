import DB_Connection from '../models/DB_Connection.js';
import type {
  IRestaurant,
  RestaurantSubscription,
} from '../models/Schema/RestaurantSchema.js';
import { writeAuditLog } from './auditLog.service.js';

export const TRIAL_DAYS = 30;
export const EXPIRING_WARNING_DAYS = 7;

export interface SubscriptionStateResult {
  restaurant: IRestaurant;
  subscription: RestaurantSubscription;
  changed: boolean;
}

/**
 * Tính toán & cập nhật trạng thái subscription của nhà hàng theo ngày hiện tại.
 * - trial & quá trialEndsAt → locked (+ audit subscription.locked + notification)
 * - active & quá paidUntil → locked (+ audit + notification)
 * - trial & còn ≤ 7 ngày → ghi nhận trạng thái expiring (audit subscription.expiring + notification) 1 lần
 * Idempotent: nếu trạng thái không đổi thì không ghi gì.
 */
export async function applySubscriptionState(restaurantId: string): Promise<SubscriptionStateResult | null> {
  const restaurant = await DB_Connection.Restaurant.findById(restaurantId).exec();
  if (!restaurant) return null;

  const now = new Date();
  const { subscription, trialEndsAt, paidUntil } = restaurant;
  const result: SubscriptionStateResult = {
    restaurant,
    subscription: subscription as RestaurantSubscription,
    changed: false,
  };

  // ---- trial hết hạn → locked ----
  if (subscription === 'trial' && trialEndsAt && now.getTime() > trialEndsAt.getTime()) {
    restaurant.subscription = 'locked';
    await restaurant.save();
    result.subscription = 'locked';
    result.changed = true;
    await writeAuditLog({
      action: 'subscription.locked',
      restaurant: String(restaurant._id),
      actor: null,
      actorInfo: { role: 'system' },
      targetType: 'restaurant',
      targetId: String(restaurant._id),
      summary: `Nhà hàng "${restaurant.name}" hết hạn dùng thử — đã khoá`,
      meta: { reason: 'trial-expired', trialEndsAt },
    });
    await createSubscriptionNotification(restaurant, 'subscription.locked', 'Trial đã hết hạn — nhà hàng bị khoá');
    return result;
  }

  // ---- active hết hạn paidUntil → locked ----
  if (subscription === 'active' && paidUntil && now.getTime() > paidUntil.getTime()) {
    restaurant.subscription = 'locked';
    await restaurant.save();
    result.subscription = 'locked';
    result.changed = true;
    await writeAuditLog({
      action: 'subscription.locked',
      restaurant: String(restaurant._id),
      actor: null,
      actorInfo: { role: 'system' },
      targetType: 'restaurant',
      targetId: String(restaurant._id),
      summary: `Nhà hàng "${restaurant.name}" hết hạn thanh toán — đã khoá`,
      meta: { reason: 'paid-expired', paidUntil },
    });
    await createSubscriptionNotification(restaurant, 'subscription.locked', 'Đã hết hạn thanh toán — nhà hàng bị khoá');
    return result;
  }

  // ---- trial sắp hết (≤ 7 ngày) → expiring ----
  if (subscription === 'trial' && trialEndsAt) {
    const remainingDays = Math.ceil(
      (trialEndsAt.getTime() - now.getTime()) / (24 * 3600 * 1000),
    );
    if (remainingDays <= EXPIRING_WARNING_DAYS && remainingDays > 0) {
      result.subscription = 'trial';
      result.changed = false;
      const exists = await DB_Connection.Notification.exists({
        restaurant: restaurant._id,
        type: 'subscription',
        'data.event': 'subscription.expiring',
      });
      if (!exists) {
        await writeAuditLog({
          action: 'subscription.expiring',
          restaurant: String(restaurant._id),
          actor: null,
          actorInfo: { role: 'system' },
          targetType: 'restaurant',
          targetId: String(restaurant._id),
          summary: `Nhà hàng "${restaurant.name}" sắp hết hạn dùng thử (còn ${remainingDays} ngày)`,
          meta: { remainingDays, trialEndsAt },
        });
        await createSubscriptionNotification(
          restaurant,
          'subscription.expiring',
          `Trial sắp hết hạn (còn ${remainingDays} ngày) — thanh toán để không bị gián đoạn`,
        );
      }
    }
  }

  return result;
}

/** Kiểm tra nhà hàng còn dùng được không (trial/active). Nếu locked → ném lỗi chuẩn RESTAURANT_LOCKED. */
export async function assertRestaurantUsable(restaurantId: string): Promise<IRestaurant> {
  const state = await applySubscriptionState(restaurantId);
  if (!state) {
    const err = new Error('Nhà hàng không tồn tại!') as any;
    err.statusCode = 404;
    throw err;
  }
  if (state.subscription === 'locked') {
    const err: any = new Error('Nhà hàng bị khoá do hết hạn thanh toán');
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
