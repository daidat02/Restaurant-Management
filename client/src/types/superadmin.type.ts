/** Trạng thái subscription của nhà hàng. */
export type SubscriptionState = 'trial' | 'active' | 'locked';

/** KPI nền tảng trên dashboard super-admin. */
export interface IAdminKpis {
  trialOwners: number;
  activeOwners: number;
  lockedOwners: number;
  activeRestaurants: number;
  monthRevenue: number;
  mrr: number;
  arpu: number;
  newOwners30d: number;
  newRestaurants30d: number;
  monthTransactions: number;
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

/** Nhà hàng đóng góp doanh thu nhiều nhất. */
export interface ITopRestaurant {
  _id: string;
  name: string;
  totalPaid: number;
}

/** Sự kiện nổi bật gần đây (từ audit log). */
export interface IRecentEvent {
  _id: string;
  action: string;
  type: 'success' | 'warning' | 'danger' | 'info';
  summary: string;
  createdAt: string;
}

/** Payload GET /api/admin/dashboard. */
export interface IAdminDashboard {
  kpis: IAdminKpis;
  revenueByMonth: IRevenueByMonth[];
  recentOwners: IOwnerSummary[];
  expiringRestaurants: IExpiringRestaurant[];
  topRestaurants: ITopRestaurant[];
  recentEvents: IRecentEvent[];
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
  /** Danh sách gói dịch vụ (nếu backend đã seed). */
  plans?: import('./subscription.type').IPlan[];
}

/** Bản ghi audit log. */
export interface IAuditLog {
  _id: string;
  action: string;
  restaurant?: { _id: string; name: string } | string;
  actor?: { _id: string; name: string; email?: string } | string;
  actorInfo?: { name?: string; role?: string };
  /** Tên người thực hiện (populate từ User — ưu tiên hơn actorInfo). */
  actorName?: string;
  targetType: string;
  targetId?: string;
  /** Tên đối tượng bị tác động (populate theo targetType, không phải id thô). */
  target?: { id: string; name: string };
  summary: string;
  createdAt: string;
}
