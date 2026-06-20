import { Types } from 'mongoose';
import DB_Connection from '../../models/DB_Connection.js';
import type { IOrderItemDocument } from '../../models/Schema/OrderItemSchema.js';
import type { IOrder, IOrderDocument, IOrderPopulate } from '../../models/Schema/OrderSchema.js';
import type { ServiceResponse } from '../../shared/type.js';
import menuRepository from '../MenuModule/menu.repository.js';
import orderRepository from './order.repository.js';
import restaurantRepository from '../RestaurantModule/restaurant.repository.js';
import tableRepository from '../TableModule/table.repository.js';
import { getIO } from '../../configs/socketsConfig.js';
import notificationService from '../Notification/notification.service.js';
import type { INotification } from '../../models/Schema/NotificationSchema.js';

const ObjectId = Types.ObjectId;

class OrderService {
  private emitOrderUpdate({
    targetRoom,
    action,
    orderData,
    itemData,
    message,
  }: {
    targetRoom: string; // Phòng nhận tin (Có thể là phòng nhà hàng hoặc phòng của riêng đơn hàng đó)
    action: 'CREATE' | 'ADD_ITEMS' | 'UPDATE_STATUS' | 'UPDATE_ITEM' | 'CANCEL';
    orderData?: any;
    message: string;
    itemData?: any;
  }) {
    const io = getIO();
    io.to(targetRoom).emit('order_event', {
      action,
      orderData: orderData,
      itemData: itemData,
      message,
    });
  }

  private async processOrderItems(
    items: Partial<IOrderItemDocument>[],
    orderId: Types.ObjectId,
  ): Promise<{ totalAmount: number; totalCount: number; orderItems: Types.ObjectId[] }> {
    let totalAmount: number = 0;
    let totalCount: number = 0;
    const orderItems: Types.ObjectId[] = [];

    for (const item of items) {
      const menuItem = await menuRepository.findItemById(item.menuItem!.toString());
      if (!menuItem) {
        throw new Error(`Món ăn với ID ${item.menuItem} không tồn tại`);
      }

      const orderItem = await orderRepository.createOrderItem({
        ...item,
        nameSnapshot: menuItem.name,
        priceSnapshot: menuItem.price,
        order: orderId as any,
      });

      totalAmount += orderItem.priceSnapshot * orderItem.quantity;
      totalCount += orderItem.quantity;
      orderItems.push(new ObjectId(orderItem._id.toString()));
    }

    return { totalAmount, totalCount, orderItems };
  }

  async createOrderService(
    orderData: Partial<IOrderDocument>,
    items: Partial<IOrderItemDocument>[],
  ): Promise<ServiceResponse<IOrderDocument>> {
    if (orderData.orderType === 'dine-in' && !orderData.table) {
      return { code: 400, message: 'Dine-in order cần có thông tin bàn (table)' };
    }

    if (orderData.orderType === 'delivery') {
      if (
        !orderData.deliveryInfo?.name ||
        !orderData.deliveryInfo?.phone ||
        !orderData.deliveryInfo?.address
      ) {
        return { code: 400, message: 'Delivery order cần có đầy đủ thông tin giao hàng' };
      }
    }

    if (!items || items.length === 0) {
      return { code: 400, message: 'Cần chọn món trước khi order' };
    }

    const session = await DB_Connection.Order.startSession();
    session.startTransaction();
    try {
      const order = await orderRepository.createOrder(orderData, { session });
      const { totalAmount, totalCount, orderItems } = await this.processOrderItems(
        items,
        new ObjectId(order._id.toString()),
      );
      console.log(orderData);

      order.totalAmount = totalAmount;
      order.itemsCount = totalCount;
      order.items = orderItems as any;
      await order.save({ session });

      if (orderData.table) {
        await tableRepository.updateTable(orderData.table.toString(), {
          currentOrder: order._id as unknown as Types.ObjectId,
          status: 'occupied',
        });
      }

      const populatedOrder = await order.populate([
        { path: 'table', select: 'tableNumber capacity status' },
        { path: 'customer', select: 'name email phone' },
        { path: 'items' },
      ]);

      const tableData = populatedOrder.table as any;

      const orderSource =
        populatedOrder.orderType === 'dine-in'
          ? `bàn ${tableData?.tableNumber}`
          : `khách hàng ${populatedOrder.deliveryInfo?.name || 'Ẩn danh'}`;

      const targetRoom = `restaurant_${order.restaurant.toString()}`;

      if (order.paymentStatus !== 'waiting_paid') {
        this.emitOrderUpdate({
          targetRoom: targetRoom,
          action: 'CREATE',
          orderData: populatedOrder,
          message: `Có đơn hàng mới từ ${orderSource}`,
        });
      }

      const payloadNoti: Partial<INotification> = {
        restaurant: new ObjectId(order.restaurant.toString()),
        type: 'new_order',
        message: 'Vừa có một đơn hàng mới',
        data: order,
      };

      console.log('payloadNoti: ', payloadNoti);

      await notificationService.createNewNotification(payloadNoti, targetRoom);
      await session.commitTransaction();
      return { code: 201, message: 'Tạo đơn hàng thành công', data: order };
    } catch (error: any) {
      await session.abortTransaction();
      console.error('Error at createOrderService:', error);
      return { code: 500, message: `Lỗi khi tạo đơn hàng: ${error?.message}` };
    } finally {
      session.endSession();
    }
  }

  async updateStatusOrderItemService(
    itemId: string,
    status: string,
  ): Promise<ServiceResponse<IOrderItemDocument>> {
    try {
      const updateItem = await orderRepository.updateOrderItem(itemId, { status: status as any });
      if (!updateItem) return { code: 404, message: 'Không tìm thấy chi tiết món ăn' };

      const existingOrder = await orderRepository.findOrderById(updateItem.order.toString());
      if (existingOrder && existingOrder.status !== 'served') {
        await orderRepository.updateOrder(existingOrder._id.toString(), { status: 'served' });
      }

      this.emitOrderUpdate({
        targetRoom: `order_${updateItem.order.toString()}`,
        action: 'UPDATE_ITEM',
        itemData: updateItem,
        message: `Trạng thái món ăn đã được cập nhật thành ${status}`,
      });

      return { code: 200, message: 'Cập nhật trạng thái món ăn thành công', data: updateItem };
    } catch (error) {
      return { code: 500, message: `Lỗi khi cập nhật món ăn` };
    }
  }

  async addItemIntoOrder(
    items: Partial<IOrderItemDocument>[],
    orderId: string,
  ): Promise<ServiceResponse<IOrderDocument>> {
    const order = await orderRepository.findOrderById(orderId);
    if (!order) return { code: 404, message: 'Không tìm thấy thông tin đơn hàng' };
    if (order.orderType === 'delivery')
      return { code: 400, message: 'Không thể thêm món vào đơn hàng giao đi đã chốt' };

    try {
      const { totalAmount, totalCount, orderItems } = await this.processOrderItems(
        items,
        new ObjectId(order._id.toString()),
      );
      order.totalAmount += totalAmount;
      order.itemsCount += totalCount;
      order.items.push(...(orderItems as any));
      await order.save();

      const populatedOrder = await order.populate([
        { path: 'table', select: 'tableNumber capacity status' },
        { path: 'customer', select: 'name email phone' },
        { path: 'items' },
      ]);

      const tableData = populatedOrder.table as any;

      this.emitOrderUpdate({
        targetRoom: `restaurant_${order.restaurant.toString()}`,
        action: 'ADD_ITEMS',
        orderData: populatedOrder,
        message: `Bàn ${tableData?.tableNumber} đã thêm món ăn mới`,
      });

      return { code: 200, message: 'Thêm món vào Order thành công', data: order };
    } catch (error: any) {
      return { code: 500, message: error?.message || 'Lỗi khi thêm món' };
    }
  }

  async getAllOrderByRestaurant(
    restaurantId: string,
  ): Promise<ServiceResponse<IOrderDocument[] | null>> {
    const restaurant = await restaurantRepository.findRestaurantById(restaurantId);
    if (!restaurant) return { code: 404, message: 'Không tìm thấy nhà hàng' };

    // Tận dụng hàm findOrders tổng quát
    const orders = await orderRepository.findOrders({ restaurant: restaurantId });
    return { code: 200, message: 'Lấy thông tin thành công', data: orders };
  }

  async getActiveOrdersService(restaurantId: string) {
    if (!restaurantId) throw new Error('Thiếu ID nhà hàng (restaurantId)');

    // Tận dụng hàm findOrders truyền điều kiện $nin
    return await orderRepository.findOrders({
      restaurant: restaurantId,
      status: { $nin: ['paid', 'cancelled', 'delivered'] },
    });
  }

  async getAllOrderByStatusByRestaurant(
    restaurantId: string,
    status: string,
  ): Promise<ServiceResponse<IOrderDocument[] | null>> {
    const restaurant = await restaurantRepository.findRestaurantById(restaurantId);
    if (!restaurant) return { code: 404, message: 'Không tìm thấy nhà hàng' };

    // Tận dụng hàm findOrders truyền điều kiện status
    const orders = await orderRepository.findOrders({ restaurant: restaurantId, status });
    return { code: 200, message: 'Lấy thông tin thành công', data: orders };
  }

  async getDetailOrder(id: string): Promise<ServiceResponse<IOrderPopulate | null>> {
    const order = await orderRepository.findDetailOrder(id);
    if (!order) return { code: 404, message: 'Không tìm thấy thông tin đơn hàng' };
    return { code: 200, message: 'Lấy thông tin chi tiết thành công', data: order };
  }
  async getOrderByTableId(tableId: string): Promise<ServiceResponse<IOrderDocument | null>> {
    const table = await tableRepository.findTableById(tableId);
    if (!table) return { code: 404, message: 'Không tìm thấy thông tin bàn' };

    const order = await orderRepository.findOrders({
      table: tableId,
      status: { $nin: ['paid', 'cancelled'] },
    });
    if (!order || order.length === 0)
      return { code: 404, message: 'Không có đơn hàng nào đang hoạt động cho bàn này' };

    return {
      code: 200,
      message: 'Lấy thông tin đơn hàng theo bàn thành công',
      data: order[0] || null,
    };
  }

  async getMyOrdersService(customerId: string): Promise<ServiceResponse<IOrderDocument[] | null>> {
    const orders = await orderRepository.findOrders({ customer: customerId });
    if (!orders) return { code: 404, message: 'Không tìm thấy đơn hàng nào của khách hàng' };
    return { code: 200, message: 'Lấy thông tin đơn hàng của khách hàng thành công', data: orders };
  }

  async updateOrderService(
    id: string,
    orderData: Partial<IOrderDocument>,
  ): Promise<ServiceResponse<IOrderDocument | null>> {
    const existingOrder = await orderRepository.findOrderById(id);
    if (existingOrder?.status == 'paid') {
      return {
        code: 400,
        message: 'Đơn hàng đã được thanh toán không thể cập nhật lại trạng thái',
      };
    }
    if (existingOrder?.status == 'cancelled') {
      return {
        code: 400,
        message: 'Đơn hàng đã được hủy không thể cập nhật lại trạng thái',
      };
    }

    const order = await orderRepository.updateOrder(id, orderData);
    if (!order) return { code: 404, message: 'Không tìm thấy thông tin đơn hàng' };
    return { code: 200, message: 'Cập nhật đơn hàng thành công', data: order };
  }

  async updateStatusOrderService(
    id: string,
    status: string,
  ): Promise<ServiceResponse<IOrderDocument | null>> {
    const order = await orderRepository.updateOrder(id, { status: status as IOrder['status'] });
    if (!order) return { code: 404, message: 'Không tìm thấy thông tin đơn hàng' };

    return { code: 200, message: 'Cập nhật trạng thái đơn hàng thành công', data: order };
  }
}

export default new OrderService();
