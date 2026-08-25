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

  async deleteOrderItem(id: string): Promise<IOrderItemDocument | null> {
    return await DB_Connection.OrderItem.findByIdAndDelete(id).exec();
  }

  async findOrderItemById(id: string): Promise<IOrderItemDocument | null> {
    return await DB_Connection.OrderItem.findById(id).exec();
  }

  /**
   * Đếm số lượng món ăn trong một đơn hàng theo bộ lọc (Dùng để kiểm tra đơn đã phục vụ toàn bộ hay chưa)
   */
  async countOrderItems(filter: FilterQuery<IOrderItemDocument>): Promise<number> {
    return await DB_Connection.OrderItem.countDocuments(filter).exec();
  }

  /**
   * Đếm số món chưa hoàn thành (chưa served/deleted) trong một đơn —
   * dùng để chặn thanh toán khi còn món đang làm dở.
   */
  async countUnfinishedItems(orderId: string): Promise<number> {
    return await DB_Connection.OrderItem.countDocuments({
      order: orderId,
      status: { $nin: ['served', 'deleted'] },
    }).exec();
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
   * KDS: lấy danh sách đơn còn ít nhất 1 món chưa được phục vụ (pending/preparing),
   * bất kể trạng thái đơn (kể cả served/paid thanh toán trước). Chỉ loại đơn đã hủy.
   * Dựa vào trạng thái MÓN (item), không phải trạng thái đơn — đúng bản chất màn hình bếp.
   */
  async findKdsOrders(restaurantId: string): Promise<IOrderDocument[]> {
    const ObjectId = DB_Connection.Order.base.Types.ObjectId;

    // Lấy orderId từ các món chưa xong thuộc nhà hàng (join qua Order để xác định restaurant —
    // OrderItem tạo từ processOrderItems có thể không lưu trường restaurant).
    const rows = await DB_Connection.OrderItem.aggregate([
      { $match: { status: { $in: ['pending', 'preparing'] } } },
      {
        $lookup: {
          from: 'orders',
          localField: 'order',
          foreignField: '_id',
          as: 'orderRef',
        },
      },
      { $unwind: '$orderRef' },
      {
        $match: {
          'orderRef.restaurant': new ObjectId(restaurantId),
          'orderRef.status': { $ne: 'cancelled' },
        },
      },
      { $group: { _id: '$orderRef._id' } },
    ]);

    const orderIds = rows.map((r) => r._id);
    if (!orderIds || orderIds.length === 0) return [];

    return await DB_Connection.Order.find({ _id: { $in: orderIds } })
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

  async getRawOrderStats(startDate: Date, endDate: Date, restaurantIds?: string[]) {
    const matchQuery: any = {
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (restaurantIds && restaurantIds.length > 0) {
      matchQuery.restaurant = {
        $in: restaurantIds.map((id) => new DB_Connection.Order.base.Types.ObjectId(id)),
      };
    }
    const stats = await DB_Connection.Order.aggregate([
      {
        $match: matchQuery,
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: [{ $in: ['$status', ['paid', 'completed']] }, '$totalAmount', 0],
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
              $cond: [{ $in: ['$status', ['paid', 'completed']] }, 1, 0],
            },
          },
        },
      },
    ]);

    return stats[0] || null; // Trả ra object thô đầu tiên hoặc null nếu không có đơn
  }

  async getRevenueByHourStats(startDate: Date, endDate: Date, restaurantIds: string[]) {
    const matchQuery: any = {
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ['paid', 'completed'] },
    };

    if (restaurantIds && restaurantIds.length > 0) {
      matchQuery.restaurant = {
        $in: restaurantIds.map((id) => new DB_Connection.Order.base.Types.ObjectId(id)),
      };
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

  /**
   * Top món bán chạy trong kỳ (Home — mọi gói): group OrderItem theo menuItem,
   * loại item deleted/refunded, chỉ đếm đơn paid/completed.
   */
  async getTopItemsStats(
    startDate: Date,
    endDate: Date,
    restaurantIds: string[],
    limit = 5,
  ) {
    const ObjectId = DB_Connection.Order.base.Types.ObjectId;
    const matchQuery: any = {
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ['paid', 'completed'] },
    };
    if (restaurantIds && restaurantIds.length > 0) {
      matchQuery.restaurant = { $in: restaurantIds.map((id) => new ObjectId(id)) };
    }

    return await DB_Connection.Order.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'orderitems',
          localField: '_id',
          foreignField: 'order',
          as: 'items',
        },
      },
      { $unwind: '$items' },
      { $match: { 'items.status': { $nin: ['deleted', 'refunded'] } } },
      {
        $group: {
          _id: '$items.menuItem',
          itemName: { $first: '$items.nameSnapshot' },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.priceSnapshot', '$items.quantity'] } },
          orderIds: { $addToSet: '$_id' },
        },
      },
      {
        $project: {
          _id: 0,
          menuItemId: '$_id',
          itemName: 1,
          quantity: 1,
          revenue: { $round: ['$revenue'] },
          orderCount: { $size: '$orderIds' },
        },
      },
      { $sort: { quantity: -1, revenue: -1 } },
      { $limit: Math.min(Math.max(1, limit), 50) },
    ]);
  }

  /**
   * Xu hướng theo ngày × kênh (Advanced): loại cancelled, phân loại kênh giống
   * getOrderChannelStats (dine-in không staff = QR; có staff = nhân viên).
   */
  async getChannelTrendStats(startDate: Date, endDate: Date, restaurantIds: string[]) {
    const ObjectId = DB_Connection.Order.base.Types.ObjectId;
    const matchQuery: any = {
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $ne: 'cancelled' },
    };
    if (restaurantIds && restaurantIds.length > 0) {
      matchQuery.restaurant = { $in: restaurantIds.map((id) => new ObjectId(id)) };
    }

    return await DB_Connection.Order.aggregate([
      { $match: matchQuery },
      {
        $project: {
          totalAmount: 1,
          day: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+07:00' },
          },
          channel: {
            $switch: {
              branches: [
                { case: { $eq: ['$orderType', 'delivery'] }, then: 'delivery' },
                { case: { $eq: ['$orderType', 'to-go'] }, then: 'to-go' },
                {
                  case: {
                    $and: [{ $eq: ['$orderType', 'dine-in'] }, { $not: ['$staff'] }],
                  },
                  then: 'qr-dine-in',
                },
              ],
              default: 'staff-dine-in',
            },
          },
        },
      },
      {
        $group: {
          _id: { day: '$day', channel: '$channel' },
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.day': 1 } },
      {
        $project: {
          _id: 0,
          day: '$_id.day',
          channel: '$_id.channel',
          revenue: { $round: ['$revenue'] },
          count: 1,
        },
      },
    ]);
  }

  /**
   * Ma trận ngày-trong-tuần × giờ (heatmap Advanced): đủ 0–23h × 7 thứ,
   * nhóm theo createdAt (+07:00). Trả đủ dữ liệu thô — việc cắt ô rỗng là của UI.
   */
  async getHourMatrixStats(startDate: Date, endDate: Date, restaurantIds: string[]) {
    const ObjectId = DB_Connection.Order.base.Types.ObjectId;
    const matchQuery: any = {
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ['paid', 'completed'] },
    };
    if (restaurantIds && restaurantIds.length > 0) {
      matchQuery.restaurant = { $in: restaurantIds.map((id) => new ObjectId(id)) };
    }

    return await DB_Connection.Order.aggregate([
      { $match: matchQuery },
      {
        $project: {
          totalAmount: 1,
          dow: { $dayOfWeek: { date: '$createdAt', timezone: '+07:00' } }, // 1=CN .. 7=Thứ 7
          hour: { $hour: { date: '$createdAt', timezone: '+07:00' } },
        },
      },
      {
        $group: {
          _id: { dow: '$dow', hour: '$hour' },
          revenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { '_id.dow': 1, '_id.hour': 1 } },
      {
        $project: {
          _id: 0,
          dow: '$_id.dow',
          hour: '$_id.hour',
          revenue: { $round: ['$revenue'] },
          orderCount: 1,
        },
      },
    ]);
  }

  async getOrderChannelStats(startDate: Date, endDate: Date, restaurantIds: string[]) {
    const matchQuery: any = {
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $ne: 'cancelled' },
    };

    if (restaurantIds && restaurantIds.length > 0) {
      matchQuery.restaurant = {
        $in: restaurantIds.map((id) => new DB_Connection.Order.base.Types.ObjectId(id)),
      };
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
          // Doanh thu theo kênh (chỉ đơn paid/completed được tính tiền)
          qrDineInRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['paid', 'completed']] },
                    { $eq: ['$orderType', 'dine-in'] },
                    { $not: ['$staff'] },
                  ],
                },
                '$totalAmount',
                0,
              ],
            },
          },
          staffDineInRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['paid', 'completed']] },
                    { $eq: ['$orderType', 'dine-in'] },
                    { $ifNull: ['$staff', false] },
                  ],
                },
                '$totalAmount',
                0,
              ],
            },
          },
          deliveryRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['paid', 'completed']] },
                    { $eq: ['$orderType', 'delivery'] },
                  ],
                },
                '$totalAmount',
                0,
              ],
            },
          },
          toGoRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['paid', 'completed']] },
                    { $eq: ['$orderType', 'to-go'] },
                  ],
                },
                '$totalAmount',
                0,
              ],
            },
          },
          totalRevenue: {
            $sum: {
              $cond: [{ $in: ['$status', ['paid', 'completed']] }, '$totalAmount', 0],
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
          status: { $in: ['paid', 'completed'] },
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
        $sort: { revenue: -1 }, // Sắp từ doanh thu cao nhất xuống thấp nhất
      },
    ]);
  }

  /**
   * Doanh thu từng chi nhánh — lọc theo danh sách nhà hàng (admin chủ chuỗi).
   */
  async getBranchRevenueStatsByIds(startDate: Date, endDate: Date, restaurantIds: string[]) {
    const matchQuery: any = {
      status: { $in: ['paid', 'completed'] },
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (restaurantIds && restaurantIds.length > 0) {
      matchQuery.restaurant = {
        $in: restaurantIds.map((id) => new DB_Connection.Order.base.Types.ObjectId(id)),
      };
    }

    return await DB_Connection.Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$restaurant',
          revenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'restaurants',
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
        $sort: { revenue: -1 },
      },
    ]);
  }
}

export default new OrderRepository();
