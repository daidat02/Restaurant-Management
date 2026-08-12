import type { RestaurantSubscription } from './restaurant.type';

/** Trạng thái thuê bao của 1 nhà hàng thuộc chủ (GET /subscriptions/me). */
export interface ISubscriptionInfo {
  _id: string;
  name: string;
  subscription: RestaurantSubscription;
  trialEndsAt?: Date | string;
  paidUntil?: Date | string;
  /** Gói dịch vụ hiện tại (key) — so sánh khi gia hạn/chuyển gói. */
  currentPlanKey?: string;
  /** Số ngày còn lại (0 nếu locked). */
  daysLeft: number;
}

/** Giới hạn theo gói cho 1 nhà hàng (0 = không giới hạn). Mô hình trả phí theo chi nhánh nên không có giới hạn chi nhánh. */
export interface IPlanLimits {
  tables: number;
  items: number;
  staff: number;
}

/** Một gói dịch vụ (plan). */
export interface IPlan {
  _id?: string;
  key: string;
  name: string;
  description: string;
  badge: string;
  isPopular: boolean;
  isActive: boolean;
  contactOnly: boolean;
  priceMonthly: number;
  cycles: Record<'1' | '3' | '6' | '12', number>;
  features: string[];
  limits: IPlanLimits;
  sortOrder: number;
}

/** Giá chu kỳ + danh sách gói (GET /pricing). */
export interface IPricingConfig {
  cycles: Record<'1' | '3' | '6' | '12', number>;
  currency: string;
  plans?: IPlan[];
}

/** Lịch sử giao dịch của chủ (GET /subscriptions/transactions). */
export interface ITransaction {
  _id: string;
  restaurant: string | { _id: string; name: string };
  ownerId: string;
  /** Mã giao dịch dãy số hiển thị trên lịch sử. */
  transactionId?: string;
  amount: number;
  cycleMonths: 1 | 3 | 6 | 12;
  type: 'restaurant-fee' | 'trial-expire';
  status: 'paid';
  paidUntil: Date | string;
  /** Gói dịch vụ đã thanh toán. */
  planKey?: string;
  planName?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/** Phản hồi tạo link thanh toán gói cước bằng PayOS (POST /subscriptions/payos/create-url). */
export interface IPayosCreateUrlResult {
  transactionId: string;
  orderCode: number;
  checkoutUrl: string;
  qrCodeData: string;
  paymentLinkId: string;
  amount: number;
  planKey?: string | null;
  planName?: string | null;
  paidUntil: Date | string;
}

/** Phản hồi tạo link thanh toán gói cước bằng VNPay (POST /subscriptions/vnpay/create-url). */
export interface IVnpayCreateUrlResult {
  transactionId: string;
  orderCode: number;
  checkoutUrl: string;
  paymentLinkId: string;
  amount: number;
  planKey?: string | null;
  planName?: string | null;
  paidUntil: Date | string;
}
