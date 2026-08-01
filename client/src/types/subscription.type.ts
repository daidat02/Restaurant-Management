import type { RestaurantSubscription } from './restaurant.type';

/** Trạng thái thuê bao của 1 nhà hàng thuộc chủ (GET /subscriptions/me). */
export interface ISubscriptionInfo {
  _id: string;
  name: string;
  subscription: RestaurantSubscription;
  trialEndsAt?: Date | string;
  paidUntil?: Date | string;
  /** Số ngày còn lại (0 nếu locked). */
  daysLeft: number;
}

/** Giá chu kỳ (GET /pricing). */
export interface IPricingConfig {
  cycles: Record<'1' | '3' | '6' | '12', number>;
  currency: string;
}

/** Lịch sử giao dịch của chủ (GET /subscriptions/transactions). */
export interface ITransaction {
  _id: string;
  restaurant: string | { _id: string; name: string };
  ownerId: string;
  amount: number;
  cycleMonths: 1 | 3 | 6 | 12;
  type: 'restaurant-fee' | 'trial-expire';
  status: 'paid';
  paidUntil: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}
