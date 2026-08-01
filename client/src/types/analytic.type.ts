export interface IAnalyticQueryParams {
  restaurantId: string;
  startDate?: string | Date; // Có thể để dạng Date hoặc chuỗi ISO String
  endDate?: string | Date;
}
export interface IOverviewStats {
  totalRevenue: number;
  totalOrders: number;
  totalReservations: number;
  cancelledOrders: number;
  cancellationRate: number;
  averagePerOrder: number;
  growth: {
    revenue: number;
    orders: number;
    averagePerOrder: number;
  };
}

export interface IRevenueHourly {
  hour: string;
  amount: number;
  orderCount: number;
}

export interface IOrderChannel {
  channel: string; // e.g., 'dine-in', 'takeaway', 'delivery'
  count: number;
  percentage: number;
}

export interface IRevenueBranch {
  revenue: number;
  orderCount: number;
  branchName: string;
  averageBill: number;
}
