import type { RestaurantSubscription } from './restaurant.type';

/** Mức sử dụng hiện tại của 1 nhà hàng (bàn/món/NV/đơn/nhóm) — để hiển thị "Đang dùng X/Y". */
export interface IPlanUsage {
  tables: number;
  items: number;
  staff: number;
  daily_orders?: number;
  group_chats?: number;
}

/** Trạng thái thuê bao của 1 nhà hàng thuộc chủ (GET /subscriptions/me). */
export interface ISubscriptionInfo {
  _id: string;
  name: string;
  subscription: RestaurantSubscription;
  trialEndsAt?: Date | string;
  paidUntil?: Date | string;
  /** Gói dịch vụ hiện tại (key) — so sánh khi gia hạn/chuyển gói. */
  currentPlanKey?: string;
  /** Gói được lên lịch hạ cấp (áp dụng cuối chu kỳ). */
  pendingPlanKey?: string;
  /** Chu kỳ (tháng) đã chọn khi lên lịch hạ cấp. */
  pendingCycleMonths?: number;
  /** Số ngày còn lại (0 nếu locked). */
  daysLeft: number;
  /** Mức sử dụng bàn/món/NV (nếu server trả). */
  usage?: IPlanUsage;
}

/** Giới hạn theo gói cho 1 nhà hàng (0 = không giới hạn). Mô hình trả phí theo chi nhánh nên không có giới hạn chi nhánh. */
export interface IPlanLimits {
  tables: number;
  items: number;
  staff: number;
  /** Số đơn tối đa mỗi ngày (0 = không giới hạn). */
  daily_orders: number;
  /** Số hội thoại nhóm tối đa (0 = không giới hạn). */
  group_chats: number;
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
  /** Key tính năng ĐƯỢC CẤP cho gói — nguồn gate UX (giống server FEATURE_CATALOG). */
  featureKeys?: string[];
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
  status: 'pending' | 'paid' | 'cancelled';
  paidUntil: Date | string;
  /** Gói dịch vụ đã thanh toán. */
  planKey?: string;
  planName?: string;
  /** Mã đơn PayOS — có trên giao dịch pending chờ chuyển khoản. */
  orderCode?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/** Phản hồi tạo link thanh toán gói cước bằng PayOS (POST /subscriptions/payos/create-url). */
export interface IPayosCreateUrlResult {
  transactionId: string | null;
  orderCode: number | null;
  checkoutUrl?: string;
  qrCodeData?: string;
  paymentLinkId?: string;
  amount: number;
  planKey?: string | null;
  planName?: string | null;
  paidUntil: Date | string;
  /** Downgrade: gói đã lên lịch hạ cấp (không có link thanh toán). */
  pendingPlanKey?: string | null;
  pendingCycleMonths?: number | null;
}

/** Phản hồi tạo link thanh toán gói cước bằng VNPay (POST /subscriptions/vnpay/create-url). */
export interface IVnpayCreateUrlResult {
  transactionId: string | null;
  orderCode: number | null;
  checkoutUrl?: string;
  paymentLinkId?: string;
  amount: number;
  planKey?: string | null;
  planName?: string | null;
  paidUntil: Date | string;
  /** Downgrade: gói đã lên lịch hạ cấp (không có link thanh toán). */
  pendingPlanKey?: string | null;
  pendingCycleMonths?: number | null;
}
