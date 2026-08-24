export interface IAnalyticQueryParams {
  restaurantId: string;
  /** Admin (chủ chuỗi): danh sách nhà hàng cần gộp. Ưu tiên hơn restaurantId khi có. */
  restaurantIds?: string[];
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

/** Một dòng trong top món bán chạy (GET /analytics/top-items). */
export interface ITopItem {
  menuItemId: string;
  itemName: string;
  quantity: number;
  revenue: number;
  orderCount: number;
}

/** Kênh đặt đơn bản nâng cao — có doanh thu kèm % (Advanced). */
export interface IOrderChannelV2 extends IOrderChannel {
  revenue: number;
  revenuePercentage: number;
}

/** Một ngày trong chuỗi xu hướng kênh (GET /analytics/channel-trend). */
export interface IChannelTrendDay {
  date: string; // 'YYYY-MM-DD'
  channels: { channel: string; label: string; revenue: number; count: number }[];
}

/** Một ô ma trận thứ × giờ (GET /analytics/hour-matrix). dow: 1=CN … 7=Thứ 7. */
export interface IHourMatrixCell {
  dow: number;
  hour: number;
  revenue: number;
  orderCount: number;
}
