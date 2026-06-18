import DB_Connection from '../../models/DB_Connection.js';
import orderRepository from '../OrderModule/order.repository.js';

class AnalyticsService {
  async getOverviewStats(startDate: Date, endDate: Date, restaurantId?: string) {
    const restaurantObjectId = new DB_Connection.Order.base.Types.ObjectId(restaurantId);

    // 1. TỰ ĐỘNG TÍNH TOÁN KHOẢNG THỜI GIAN KỲ TRƯỚC (Last Period)
    const timeDiff = endDate.getTime() - startDate.getTime(); // Khoảng cách mili-giây của kỳ này
    const lastStartDate = new Date(startDate.getTime() - timeDiff - 1000); // Lùi lại đúng bằng khoảng thời gian đó
    const lastEndDate = new Date(startDate.getTime() - 1000);
    // 2. GỌI REPO SONG SONG (Promise.all) ĐỂ LẤY DỮ LIỆU THÔ CỦA CẢ 2 KỲ (Tối ưu hiệu năng)
    const [currentRawStats, lastRawStats] = await Promise.all([
      orderRepository.getRawOrderStats(startDate, endDate, restaurantId),
      orderRepository.getRawOrderStats(lastStartDate, lastEndDate, restaurantId),
    ]);

    // 3. Lấy lượt đặt bàn (Giao thoa logic - làm tương tự cho cả 2 kỳ nếu cần, ở đây ví dụ cho đơn hàng)
    const totalReservations =
      (await DB_Connection.Reservation?.countDocuments({
        restaurant: restaurantObjectId,
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

  async getRevenueByHour(restaurantId: string, startDate: Date, endDate: Date) {
    // 1. Gọi Repo lấy dữ liệu các giờ có doanh thu từ DB
    const rawData = await orderRepository.getRevenueByHourStats(startDate, endDate, restaurantId);

    // 2. Tạo một Map để tra cứu nhanh dữ liệu từ DB
    const dataMap = new Map(rawData.map((item) => [item.hour, item]));

    // 3. Quy định các khung giờ hoạt động chính muốn hiển thị lên Chart (Ví dụ: Từ 9:00 sáng đến 22:00 đêm)
    // Bạn có thể đổi mảng này thành đủ 24 tiếng nếu muốn hiển thị trọn ngày
    const activeHours = [
      '09:00',
      '10:00',
      '11:00',
      '12:00',
      '13:00',
      '14:00',
      '15:00',
      '16:00',
      '17:00',
      '18:00',
      '19:00',
      '20:00',
      '21:00',
      '22:00',
    ];

    // 4. Lắp đầy các khoảng trống: Khung giờ nào DB không có thì tự cho amount = 0
    const finalChartData = activeHours.map((hour) => {
      if (dataMap.has(hour)) {
        return dataMap.get(hour);
      }
      return { hour, amount: 0, orderCount: 0 };
    });

    return finalChartData;
  }

  async getOrderChannelAnalytics(startDate: Date, endDate: Date, restaurantId?: string) {
    const rawStats = await orderRepository.getOrderChannelStats(
      startDate,
      endDate,
      restaurantId as string,
    );

    // Mẫu dữ liệu mặc định nếu nhà hàng chưa có đơn nào
    const defaultResult = [
      { channel: 'Khách quét mã QR', count: 0, percentage: 0 },
      { channel: 'Nhân viên lên đơn', count: 0, percentage: 0 },
      { channel: 'Giao hàng tận nơi', count: 0, percentage: 0 },
      { channel: 'Mua mang về', count: 0, percentage: 0 },
    ];

    if (!rawStats || rawStats.length === 0) return defaultResult;

    const { qrDineInCount, staffDineInCount, deliveryCount, toGoCount, totalValidOrders } =
      rawStats[0];

    if (totalValidOrders === 0) return defaultResult;

    // Hàm helper tính % làm tròn 1 chữ số thập phân
    const calcPercent = (count: number) => Number(((count / totalValidOrders) * 100).toFixed(1));

    return [
      {
        channel: 'Khách quét mã QR',
        count: qrDineInCount,
        percentage: calcPercent(qrDineInCount),
      },
      {
        channel: 'Nhân viên lên đơn',
        count: staffDineInCount,
        percentage: calcPercent(staffDineInCount),
      },
      {
        channel: 'Giao hàng tận nơi',
        count: deliveryCount,
        percentage: calcPercent(deliveryCount),
      },
      {
        channel: 'Mua mang về',
        count: toGoCount,
        percentage: calcPercent(toGoCount),
      },
    ];
  }

  async getBranchRevenueStatsService(startDate: Date, endDate: Date) {
    const rawStats = await orderRepository.getBranchRevenueStats(startDate, endDate);

    return rawStats;
  }
}

export default new AnalyticsService();
