import DB_Connection from '../../models/DB_Connection.js';
import orderRepository from '../OrderModule/order.repository.js';

class AnalyticsService {
  async getOverviewStats(startDate: Date, endDate: Date, restaurantIds: string[]) {
    const restaurantObjectIds = (restaurantIds || []).map(
      (id) => new DB_Connection.Order.base.Types.ObjectId(id),
    );

    // 1. TỰ ĐỘNG TÍNH TOÁN KHOẢNG THỜI GIAN KỲ TRƯỚC (Last Period)
    const timeDiff = endDate.getTime() - startDate.getTime(); // Khoảng cách mili-giây của kỳ này
    const lastStartDate = new Date(startDate.getTime() - timeDiff - 1000); // Lùi lại đúng bằng khoảng thời gian đó
    const lastEndDate = new Date(startDate.getTime() - 1000);
    // 2. GỌI REPO SONG SONG (Promise.all) ĐỂ LẤY DỮ LIỆU THÔ CỦA CẢ 2 KỲ (Tối ưu hiệu năng)
    const [currentRawStats, lastRawStats] = await Promise.all([
      orderRepository.getRawOrderStats(startDate, endDate, restaurantIds),
      orderRepository.getRawOrderStats(lastStartDate, lastEndDate, restaurantIds),
    ]);

    // 3. Lấy lượt đặt bàn (Giao thoa logic - làm tương tự cho cả 2 kỳ nếu cần, ở đây ví dụ cho đơn hàng)
    const totalReservations =
      (await DB_Connection.Reservation?.countDocuments({
        restaurant: { $in: restaurantObjectIds },
        date: { $gte: startDate, $lte: endDate },
        status: { $ne: 'cancelled' },
      })) || 0;

    // 4. BÓC TÁCH SỐ LIỆU KỲ NÀY (FALLBACK NẾU CHƯA CÓ ĐƠN)
    const current = currentRawStats || {
      totalRevenue: 0,
      totalOrders: 0,
      cancelledOrders: 0,
      paidOrdersCount: 0,
    };
    const last = lastRawStats || {
      totalRevenue: 0,
      totalOrders: 0,
      cancelledOrders: 0,
      paidOrdersCount: 0,
    };

    // 5. TÍNH TOÁN CÁC CHỈ SỐ CỦA KỲ NÀY
    const cancellationRate =
      current.totalOrders > 0
        ? Number(((current.cancelledOrders / current.totalOrders) * 100).toFixed(1))
        : 0;
    const averagePerOrder =
      current.paidOrdersCount > 0 ? Math.round(current.totalRevenue / current.paidOrdersCount) : 0;
    const lastAveragePerOrder =
      last.paidOrdersCount > 0 ? Math.round(last.totalRevenue / last.paidOrdersCount) : 0;

    // 6. HÀM HELPER TÍNH PHẦN TRĂM TĂNG TRƯỞNG TRONG SERVICE
    const calculateGrowth = (currentVal: number, lastVal: number): number => {
      if (lastVal === 0) return currentVal > 0 ? 100 : 0; // Nếu kỳ trước bằng 0 mà kỳ này tăng thì coi như tăng 100%
      return Number((((currentVal - lastVal) / lastVal) * 100).toFixed(1));
    };

    // 7. TRẢ KẾT QUẢ ĐÃ BAO GỒM % SO SÁNH CHO CONTROLLER
    return {
      // Số liệu kỳ này
      totalRevenue: current.totalRevenue,
      totalOrders: current.totalOrders,
      totalReservations,
      cancelledOrders: current.cancelledOrders,
      cancellationRate,
      averagePerOrder,

      // Số liệu tăng trưởng so với kỳ trước (%)
      growth: {
        revenue: calculateGrowth(current.totalRevenue, last.totalRevenue),
        orders: calculateGrowth(current.totalOrders, last.totalOrders),
        averagePerOrder: calculateGrowth(averagePerOrder, lastAveragePerOrder),
      },
    };
  }

  /** Top món bán chạy trong kỳ (Home — mọi gói). */
  async getTopItems(
    startDate: Date,
    endDate: Date,
    restaurantIds: string[],
    limit = 5,
  ) {
    return orderRepository.getTopItemsStats(startDate, endDate, restaurantIds, limit);
  }

  async getRevenueByHour(restaurantIds: string[], startDate: Date, endDate: Date) {
    // 1. Gọi Repo lấy dữ liệu các giờ có doanh thu từ DB
    const rawData = await orderRepository.getRevenueByHourStats(startDate, endDate, restaurantIds);

    // 2. Tạo một Map để tra cứu nhanh dữ liệu từ DB
    const dataMap = new Map(rawData.map((item) => [item.hour, item]));

    // 3. Điền đầy đủ 24 giờ (0h → 23h): khung giờ nào DB không có thì amount = 0.
    //    Việc thu gọn khoảng hiển thị (cắt giờ rỗng hai đầu) do phía UI quyết định.
    const finalChartData = Array.from({ length: 24 }, (_, h) => {
      const hour = `${h}:00`;
      return dataMap.get(hour) ?? { hour, amount: 0, orderCount: 0 };
    });

    return finalChartData;
  }

  async getOrderChannelAnalytics(startDate: Date, endDate: Date, restaurantIds: string[]) {
    const rawStats = await orderRepository.getOrderChannelStats(
      startDate,
      endDate,
      restaurantIds,
    );

    // Mẫu dữ liệu mặc định nếu nhà hàng chưa có đơn nào
    const defaultResult = [
      { channel: 'Khách quét mã QR', count: 0, percentage: 0, revenue: 0, revenuePercentage: 0 },
      { channel: 'Nhân viên lên đơn', count: 0, percentage: 0, revenue: 0, revenuePercentage: 0 },
      { channel: 'Giao hàng tận nơi', count: 0, percentage: 0, revenue: 0, revenuePercentage: 0 },
      { channel: 'Mua mang về', count: 0, percentage: 0, revenue: 0, revenuePercentage: 0 },
    ];

    if (!rawStats || rawStats.length === 0) return defaultResult;

    const {
      qrDineInCount,
      staffDineInCount,
      deliveryCount,
      toGoCount,
      qrDineInRevenue,
      staffDineInRevenue,
      deliveryRevenue,
      toGoRevenue,
      totalValidOrders,
      totalRevenue,
    } = rawStats[0];

    if (totalValidOrders === 0) return defaultResult;

    // Hàm helper tính % làm tròn 1 chữ số thập phân
    const calcPercent = (value: number, total: number) =>
      total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0;
    const roundVnd = (v: number) => Math.round(v);

    return [
      {
        channel: 'Khách quét mã QR',
        count: qrDineInCount,
        percentage: calcPercent(qrDineInCount, totalValidOrders),
        revenue: roundVnd(qrDineInRevenue),
        revenuePercentage: calcPercent(qrDineInRevenue, totalRevenue),
      },
      {
        channel: 'Nhân viên lên đơn',
        count: staffDineInCount,
        percentage: calcPercent(staffDineInCount, totalValidOrders),
        revenue: roundVnd(staffDineInRevenue),
        revenuePercentage: calcPercent(staffDineInRevenue, totalRevenue),
      },
      {
        channel: 'Giao hàng tận nơi',
        count: deliveryCount,
        percentage: calcPercent(deliveryCount, totalValidOrders),
        revenue: roundVnd(deliveryRevenue),
        revenuePercentage: calcPercent(deliveryRevenue, totalRevenue),
      },
      {
        channel: 'Mua mang về',
        count: toGoCount,
        percentage: calcPercent(toGoCount, totalValidOrders),
        revenue: roundVnd(toGoRevenue),
        revenuePercentage: calcPercent(toGoRevenue, totalRevenue),
      },
    ];
  }

  /**
   * Xu hướng doanh thu theo ngày × kênh (Advanced): điền đủ 4 kênh cho từng ngày
   * có dữ liệu trong kỳ (ngày không đơn không trả về — UI tự nối trục thời gian).
   */
  async getChannelTrend(startDate: Date, endDate: Date, restaurantIds: string[]) {
    const rawRows = await orderRepository.getChannelTrendStats(
      startDate,
      endDate,
      restaurantIds,
    );

    const CHANNEL_LABELS: Record<string, string> = {
      'qr-dine-in': 'Khách quét mã QR',
      'staff-dine-in': 'Nhân viên lên đơn',
      delivery: 'Giao hàng tận nơi',
      'to-go': 'Mua mang về',
    };

    const byDay = new Map<string, Map<string, { revenue: number; count: number }>>();
    for (const row of rawRows) {
      if (!byDay.has(row.day)) byDay.set(row.day, new Map());
      byDay.get(row.day)!.set(row.channel, { revenue: row.revenue, count: row.count });
    }

    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, channels]) => ({
        date: day,
        channels: Object.entries(CHANNEL_LABELS).map(([key, label]) => {
          const cell = channels.get(key);
          return {
            channel: key,
            label,
            revenue: cell?.revenue ?? 0,
            count: cell?.count ?? 0,
          };
        }),
      }));
  }

  /**
   * Ma trận thứ × giờ cho heatmap (Advanced). `dow` theo MongoDB $dayOfWeek:
   * 1=Chủ nhật … 7=Thứ bảy. Trả đủ ô thô, UI tự dựng ma trận + cắt rỗng.
   */
  async getHourMatrix(startDate: Date, endDate: Date, restaurantIds: string[]) {
    return orderRepository.getHourMatrixStats(startDate, endDate, restaurantIds);
  }

  async getBranchRevenueStatsService(startDate: Date, endDate: Date) {
    const rawStats = await orderRepository.getBranchRevenueStats(startDate, endDate);

    return rawStats;
  }

  /**
   * Doanh thu từng chi nhánh của chủ chuỗi (admin) — lọc theo restaurantIds.
   */
  async getBranchRevenueByIdsService(startDate: Date, endDate: Date, restaurantIds: string[]) {
    const rawStats = await orderRepository.getBranchRevenueStatsByIds(
      startDate,
      endDate,
      restaurantIds,
    );

    return rawStats;
  }

  /**
   * Dashboard gộp toàn hệ thống (chỉ super-admin): không lọc theo nhà hàng.
   */
  async getSystemOverviewService() {
    const [
      totalRestaurants,
      activeRestaurants,
      inactiveRestaurants,
      totalTenantUsers,
      totalCustomers,
      revenueStats,
      orderStats,
      reservationStats,
    ] = await Promise.all([
      DB_Connection.Restaurant.countDocuments(),
      DB_Connection.Restaurant.countDocuments({ status: 'active' }),
      DB_Connection.Restaurant.countDocuments({ status: 'inactive' }),
      DB_Connection.User.countDocuments({ role: { $in: ['admin', 'manager', 'staff', 'super-admin'] } }),
      DB_Connection.User.countDocuments({ role: 'customer' }),
      DB_Connection.Order.aggregate([
        { $match: { status: { $in: ['paid', 'completed'] } } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
      ]),
      DB_Connection.Order.aggregate([
        { $group: { _id: null, totalOrders: { $sum: 1 }, cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } } } },
      ]),
      DB_Connection.Reservation.countDocuments({ status: { $ne: 'cancelled' } }),
    ]);

    const revenue = revenueStats[0]?.totalRevenue || 0;
    const orders = orderStats[0]?.totalOrders || 0;
    const cancelledOrders = orderStats[0]?.cancelledOrders || 0;

    return {
      totalRestaurants,
      activeRestaurants,
      inactiveRestaurants,
      totalTenantUsers,
      totalCustomers,
      totalRevenue: revenue,
      totalOrders: orders,
      cancelledOrders,
      cancellationRate:
        orders > 0 ? Number(((cancelledOrders / orders) * 100).toFixed(1)) : 0,
      averagePerOrder: orders > 0 ? Math.round(revenue / orders) : 0,
      totalReservations: reservationStats,
    };
  }
}

export default new AnalyticsService();
