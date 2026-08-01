/** Trạng thái subscription của nhà hàng. */
export type SubscriptionState = 'trial' | 'active' | 'locked';

/** 4 KPI nền tảng trên dashboard super-admin. */
export interface IAdminKpis {
  trialOwners: number;
  activeOwners: number;
  activeRestaurants: number;
  monthRevenue: number;
}

/** Doanh thu từng tháng (cho biểu đồ 6 tháng). */
export interface IRevenueByMonth {
  month: string;
  total: number;
}

/** Chủ nhà hàng (role admin) kèm tóm tắt thanh toán. */
export interface IOwnerSummary {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
  restaurantCount: number;
  state: SubscriptionState;
  totalPaid: number;
  createdAt?: string;
}

/** Nhà hàng sắp hết hạn (trial hoặc paidUntil ≤ 7 ngày). */
export interface IExpiringRestaurant {
  _id: string;
  name: string;
  subscription: SubscriptionState;
  trialEndsAt?: string;
  paidUntil?: string;
  ownerId?: { _id: string; name: string; email: string };
}

/** Payload GET /api/admin/dashboard. */
export interface IAdminDashboard {
  kpis: IAdminKpis;
  revenueByMonth: IRevenueByMonth[];
  recentOwners: IOwnerSummary[];
  expiringRestaurants: IExpiringRestaurant[];
}

/** Nhà hàng của 1 chủ (trong chi tiết chủ). */
export interface ITenantRestaurant {
  _id: string;
  name: string;
  status: string;
  subscription: SubscriptionState;
  trialEndsAt?: string;
  paidUntil?: string;
  createdAt?: string;
}

/** Giao dịch thanh toán (subscription fee). */
export interface ITransaction {
  _id: string;
  restaurant: { _id: string; name: string } | string;
  ownerId: { _id: string; name: string; email: string } | string;
  amount: number;
  cycleMonths: number;
  type: 'restaurant-fee' | 'trial-expire';
  status: string;
  paidUntil: string;
  createdAt: string;
}

/** Chi tiết 1 chủ (owner + nhà hàng + giao dịch). */
export interface ITenantDetail {
  owner: { _id: string; name: string; email: string; isActive: boolean; createdAt?: string };
  restaurants: ITenantRestaurant[];
  transactions: ITransaction[];
}

/** Cấu hình giá chu kỳ (PricingConfig). */
export interface IPricingConfig {
  cycles: Record<string, number>;
  currency: string;
}

/** Bản ghi audit log. */
export interface IAuditLog {
  _id: string;
  action: string;
  restaurant?: { _id: string; name: string } | string;
  actor?: string;
  actorInfo?: { name?: string; role?: string };
  targetType: string;
  targetId?: string;
  summary: string;
  createdAt: string;
}
