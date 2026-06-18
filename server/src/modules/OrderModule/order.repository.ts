import type { IOrderDocument, IOrderPopulate } from './../../models/Schema/OrderSchema.js';
import DB_Connection from '../../models/DB_Connection.js';
import type { IOrderItemDocument } from '../../models/Schema/OrderItemSchema.js';
import type { ClientSession, FilterQuery } from 'mongoose';

class OrderRepository {
  // ==========================================
  // I. CORE CRUD (Cơ bản cho Order Item)
  // ==========================================
  async createOrderItem(
    orderItemData: Partial<IOrderItemDocument>,
    options?: { session: ClientSession },
  ): Promise<IOrderItemDocument> {
    const newOrderItem = new DB_Connection.OrderItem({ ...orderItemData });
    return await newOrderItem.save(options);
  }

  async updateOrderItem(
    id: string,
    itemData: Partial<IOrderItemDocument>,
  ): Promise<IOrderItemDocument | null> {
    return await DB_Connection.OrderItem.findByIdAndUpdate(id, itemData, { new: true }).exec();
  }

  // ==========================================
  // II. CORE CRUD (Cơ bản cho Order)
  // ==========================================
  async createOrder(
    orderData: Partial<IOrderDocument>,
    options?: { session: ClientSession },
  ): Promise<IOrderDocument> {
    const newOrder = new DB_Connection.Order({ ...orderData });
    return await newOrder.save(options);
  }

  async findOrderById(id: string): Promise<IOrderDocument | null> {
    return await DB_Connection.Order.findById(id).exec();
  }

  async updateOrder(
    id: string,
    orderData: Partial<IOrderDocument>,
    options?: { session?: ClientSession },
  ): Promise<IOrderDocument | null> {
    // Trả về dữ liệu mới sau khi update ngay lập tức thay vì save() lần 2 cồng kềnh
    return await DB_Connection.Order.findByIdAndUpdate(id, orderData, {
      new: true,
      session: options?.session ?? null,
    }).exec();
  }

  // ==========================================
  // III. QUERIES ĐẶC THÙ (Business Logic)
  // ==========================================

  /**
   * Hàm Query tổng lực: Tìm kiếm danh sách Order linh hoạt theo bộ lọc (Filter)
   * Thay thế hoàn toàn cho: findAllOrder, findOrderByStatus, findActiveOrdersByRestaurant
   */
  async findOrders(filter: FilterQuery<IOrderDocument>): Promise<IOrderDocument[]> {
    return await DB_Connection.Order.find(filter)
      .populate([
        { path: 'table', select: 'tableNumber capacity status' },
        { path: 'customer', select: 'name email phone' },
        { path: 'items' },
      ])
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Lấy chi tiết đơn hàng dạng Full Populate
   */
  async findDetailOrder(id: string): Promise<IOrderPopulate | null> {
    return await DB_Connection.Order.findById(id).populate(['table', 'restaurant', 'items']).exec();
  }

  async getRawOrderStats(startDate: Date, endDate: Date, restaurantId?: string) {
    const matchQuery: any = {
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (restaurantId) {
      matchQuery.restaurant = new DB_Connection.Order.base.Types.ObjectId(restaurantId);
    }
    console.log('restaurantId:', restaurantId);
    const stats = await DB_Connection.Order.aggregate([
      {
        $match: matchQuery,
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$totalAmount', 0],
            },
          },
          totalOrders: { $sum: 1 },
          cancelledOrders: {
            $sum: {
              $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0],
            },
          },
          paidOrdersCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, 1, 0],
            },
          },
        },
      },
    ]);

    return stats[0] || null; // Trả ra object thô đầu tiên hoặc null nếu không có đơn
  }

  async getRevenueByHourStats(startDate: Date, endDate: Date, restaurantId: string) {
    const matchQuery: any = {
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'paid',
    };

    if (restaurantId) {
      matchQuery.restaurant = new DB_Connection.Order.base.Types.ObjectId(restaurantId);
    }

    return await DB_Connection.Order.aggregate([
      {
        // Bước 1: Lọc các đơn hàng đã thanh toán thành công trong kỳ
        $match: matchQuery,
      },
      {
        // Bước 2: Bóc tách số giờ từ createdAt và cộng thêm 7 (nếu DB lưu giờ UTC và bạn muốn hiển thị giờ Việt Nam GMT+7)
        $project: {
          totalAmount: 1,
          // Cộng 7 tiếng để chuyển đổi từ UTC sang múi giờ Việt Nam trước khi lấy trường Hour
          localHour: {
            $hour: {
              date: '$createdAt',
              timezone: '+07:00', // Ép MongoDB tính toán theo múi giờ Việt Nam
            },
          },
        },
      },
      {
        // Bước 3: Gom nhóm theo số giờ vừa bóc tách
        $group: {
          _id: '$localHour',
          amount: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }, // Đếm luôn số đơn trong khung giờ đó nếu cần
        },
      },
      {
        // Bước 4: Sắp xếp theo thứ tự thời gian từ sáng đến đêm (0h -> 23h)
        $sort: { _id: 1 },
      },
      {
        // Bước 5: Định hình lại cấu trúc giống hệt biến MOCK trên Frontend của bạn
        $project: {
          _id: 0,
          hour: { $concat: [{ $toString: '$_id' }, ':00'] }, // Chuyển số 15 thành chuỗi "15:00"
          amount: 1,
          orderCount: 1,
        },
      },
    ]);
  }

  async getOrderChannelStats(startDate: Date, endDate: Date, restaurantId: string) {
    const matchQuery: any = {
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $ne: 'cancelled' },
    };

    if (restaurantId) {
      matchQuery.restaurant = new DB_Connection.Order.base.Types.ObjectId(restaurantId);
    }
    return await DB_Connection.Order.aggregate([
      {
        // Bước 1: Lọc đơn hàng hợp lệ trong kỳ (Bỏ qua đơn đã hủy để số liệu chính xác)
        $match: matchQuery,
      },
      {
        // Bước 2: Gom nhóm và dùng toán tử điều kiện để phân loại kênh
        $group: {
          _id: null,
          // Khách quét QR tại bàn (Dine-in + Không có staff)
          qrDineInCount: {
            $sum: {
              $cond: [{ $and: [{ $eq: ['$orderType', 'dine-in'] }, { $not: ['$staff'] }] }, 1, 0],
            },
          },
          // Nhân viên lên đơn tay (Dine-in + Có staff)
          staffDineInCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$orderType', 'dine-in'] }, { $ifNull: ['$staff', false] }] },
                1,
                0,
              ],
            },
          },
          // Giao hàng (Delivery)
          deliveryCount: {
            $sum: {
              $cond: [{ $eq: ['$orderType', 'delivery'] }, 1, 0],
            },
          },
          // Mua mang về (To-go)
          toGoCount: {
            $sum: {
              $cond: [{ $eq: ['$orderType', 'to-go'] }, 1, 0],
            },
          },
          // Tổng số đơn để tính tỷ lệ % ở tầng Service
          totalValidOrders: { $sum: 1 },
        },
      },
    ]);
  }

  async getBranchRevenueStats(startDate: Date, endDate: Date) {
    return await DB_Connection.Order.aggregate([
      {
        $match: {
          status: 'paid',
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$restaurant',
          revenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'restaurants', // Tên collection chứa thông tin nhà hàng trong DB
          localField: '_id',
          foreignField: '_id',
          as: 'branchInfo',
        },
      },
      {
        $unwind: { path: '$branchInfo', preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          _id: 0,
          branchName: { $ifNull: ['$branchInfo.name', 'Chi nhánh ẩn hoặc đã xóa'] },
          revenue: 1,
          orderCount: 1,
          averageBill: {
            $cond: [
              { $gt: ['$orderCount', 0] },
              { $round: [{ $divide: ['$revenue', '$orderCount'] }] },
              0,
            ],
          },
        },
      },
      {
        $sort: { revenue: -1 }, // Xếp từ doanh thu cao nhất xuống thấp nhất
      },
    ]);
  }
}

export default new OrderRepository();
