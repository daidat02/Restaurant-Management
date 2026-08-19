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
import { addJob } from '../../jobs/handlers.js';
import { QUEUE_NAMES } from '../../queues/queue.js';

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
    action: 'CREATE' | 'ADD_ITEMS' | 'UPDATE_STATUS' | 'UPDATE_ITEM' | 'DELETE_ITEM' | 'CANCEL';
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
  ): Promise<{
    totalAmount: number;
    totalCount: number;
    orderItems: Types.ObjectId[];
    menuCounts: { menuItemId: string; quantity: number }[];
  }> {
    let totalAmount: number = 0;
    let totalCount: number = 0;
    const orderItems: Types.ObjectId[] = [];
    const menuCounts: { menuItemId: string; quantity: number }[] = [];

    for (const item of items) {
      const menuItem = await menuRepository.findItemById(item.menuItem!.toString());
      if (!menuItem) {
        throw new Error(`Món ăn với ID ${item.menuItem} không tồn tại`);
      }

      // Snapshot toppings: đối chiếu tên lựa chọn với cấu hình optionGroups của món
      // và LẤY GIÁ TỪ SERVER (không tin giá client gửi lên — chống giả mạo giá).
      const allChoices = (menuItem.optionGroups || []).flatMap((group) => group.choices);
      const validatedToppings: { name: string; price: number }[] = [];
      for (const topping of item.toppings || []) {
        const choice = allChoices.find((c) => c.name === topping?.name);
        if (!choice) continue; // Bỏ qua topping không khớp cấu hình món
        validatedToppings.push({ name: choice.name, price: choice.price });
      }
      const toppingsPrice = validatedToppings.reduce((sum, t) => sum + t.price, 0);

      // Mỗi lần gửi bếp = tạo OrderItem MỚI (không cập nhật quantity item cũ).
      // Nếu món đã served mà gọi thêm cùng loại → bếp nhận 1 item mới (status mặc định pending),
      // chi tiết đơn/bill sẽ gộp hiển thị theo menuItem còn KDS hiển thị từng item riêng.
      const { _id: _ignored, toppings: _rawToppings, ...itemData } = item;
      const orderItem = await orderRepository.createOrderItem({
        ...itemData,
        nameSnapshot: menuItem.name,
        priceSnapshot: menuItem.price + toppingsPrice,
        ...(validatedToppings.length > 0 ? { toppings: validatedToppings } : {}),
        order: orderId as any,
      });
      totalAmount += orderItem.priceSnapshot * orderItem.quantity;
      totalCount += orderItem.quantity;
      orderItems.push(new ObjectId(orderItem._id.toString()));
      menuCounts.push({ menuItemId: menuItem._id.toString(), quantity: orderItem.quantity });
    }

    return { totalAmount, totalCount, orderItems, menuCounts };
  }

  /** Tính lại totalAmount/itemsCount từ các món CÒN HIỆU LỰC (không tính món đã soft-delete). */
  private async recalcOrderTotals(order: IOrderDocument): Promise<void> {
    const items = await DB_Connection.OrderItem.find({
      order: order._id,
      status: { $ne: 'deleted' },
    }).exec();
    order.totalAmount = items.reduce(
      (sum, i) => sum + (i.priceSnapshot || 0) * (i.quantity || 1),
      0,
    );
    order.itemsCount = items.reduce((sum, i) => sum + (i.quantity || 1), 0);
  }

  async createOrderService(
    orderData: Partial<IOrderDocument>,
    items: Partial<IOrderItemDocument>[],
  ): Promise<ServiceResponse<IOrderDocument>> {
    if (orderData.orderType === 'dine-in' && !orderData.table) {
      return { code: 400, message: 'Dine-in order cần có thông tin bàn (table)' };
    }

    // Bảo mật đa tenant: verify bàn thuộc đúng nhà hàng trước khi tạo đơn tại bàn (chống giả mạo URL/QR)
    if (orderData.orderType === 'dine-in' && orderData.table) {
      const table = await tableRepository.findTableById(orderData.table.toString());
      if (!table) return { code: 404, message: 'Không tìm thấy thông tin bàn' };

      const tableRestaurantId = table.restaurant.toString();
      const orderRestaurantId = orderData.restaurant?.toString?.() || '';
      if (orderRestaurantId && tableRestaurantId !== orderRestaurantId) {
        return { code: 400, message: 'Bàn không thuộc nhà hàng này, không thể tạo đơn' };
      }
      // Thiếu restaurantId (QR cũ): ép dùng đúng nhà hàng của bàn
      orderData.restaurant = tableRestaurantId as any;
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

    // Chặn khi nhà hàng bị khoá do hết hạn thanh toán
    if (orderData.restaurant) {
      const { assertRestaurantUsable } = await import('../../services/subscription.service.js');
      try {
        await assertRestaurantUsable(orderData.restaurant.toString());
      } catch (error: any) {
        if (error?.code === 'RESTAURANT_LOCKED') {
          return {
            code: 403,
            errorCode: 'RESTAURANT_LOCKED',
            message: 'Nhà hàng bị khoá do hết hạn thanh toán',
          };
        }
        if (error?.statusCode === 404) return { code: 404, message: error.message };
        throw error;
      }
    }

    // Gate giới hạn theo gói: số đơn tạo trong ngày (tính cả đơn hủy).
    if (orderData.restaurant) {
      const { assertLimit, countResource } = await import('../../services/plan-gate.service.js');
      try {
        const restaurantId = orderData.restaurant.toString();
        const used = await countResource(restaurantId, 'daily_orders');
        await assertLimit(restaurantId, 'daily_orders', used, 1);
      } catch (error: any) {
        if (error?.code === 'PLAN_LIMIT_REACHED') {
          return {
            code: 403,
            errorCode: 'PLAN_LIMIT_REACHED',
            message: error.message,
            meta: error.meta,
          };
        }
        throw error;
      }
    }

    const session = await DB_Connection.Order.startSession();
    session.startTransaction();
    let committed = false;
    try {
      const order = await orderRepository.createOrder(orderData, { session });
      const { totalAmount, totalCount, orderItems, menuCounts } = await this.processOrderItems(
        items,
        new ObjectId(order._id.toString()),
      );
      order.totalAmount = totalAmount;
      order.itemsCount = totalCount;
      order.items = orderItems as any;
      console.log('order before save:', order);
      const orderUpdated = await order.save({ session });

      if (orderData.table) {
        await tableRepository.updateTable(orderData.table.toString(), {
          currentOrder: orderUpdated._id as unknown as Types.ObjectId,
          status: 'occupied',
        });
      }

      await session.commitTransaction();
      committed = true;

      // Fan-out SAU commit qua queue order-fanout (T03): socket + notification + orderCount.
      // Redis down → addJob chạy inline cùng handler; lỗi inline → swallow, không ảnh hưởng response.
      await addJob(QUEUE_NAMES.orderFanOut, 'new-order', {
        orderId: order._id.toString(),
        restaurantId: order.restaurant.toString(),
        orderType: order.orderType,
        action: 'CREATE',
        menuCounts,
      });

      // Populate lại cho payload trả về (items phải là doc đầy đủ — regression test phụ thuộc).
      const populatedOrder = await orderUpdated.populate([
        { path: 'table', select: 'tableNumber capacity status' },
        { path: 'customer', select: 'name email phone' },
        { path: 'items' },
      ]);

      return { code: 201, message: 'Tạo đơn hàng thành công', data: populatedOrder };
    } catch (error: any) {
      if (!committed) {
        await session.abortTransaction();
      }
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
      const orderRoom = `order_${updateItem.order.toString()}`;

      console.log('Emitting order item update:', updateItem, 'to room:', orderRoom);

      this.emitOrderUpdate({
        targetRoom: orderRoom,
        action: 'UPDATE_ITEM',
        itemData: updateItem,
        message: `Trạng thái món ăn đã được cập nhật thành ${status}`,
      });

      // Đồng bộ trạng thái món ăn tới màn hình bếp (KDS) và màn hình quản lý của nhà hàng
      if (existingOrder) {
        const restaurantRoom = `restaurant_${existingOrder.restaurant.toString()}`;
        this.emitOrderUpdate({
          targetRoom: restaurantRoom,
          action: 'UPDATE_ITEM',
          itemData: updateItem,
          message: `Trạng thái món ăn đã được cập nhật thành ${status}`,
        });

        const orderId = existingOrder._id.toString();
        const orderItems = await DB_Connection.OrderItem.find({
          order: existingOrder._id,
          status: { $ne: 'deleted' },
        }).exec();

        // Đồng bộ trạng thái đơn theo trạng thái các món:
        //  - Toàn bộ món đã phục vụ (served) → đơn 'served'.
        //  - Còn món chưa xong nhưng đã có ít nhất 1 món phục vụ → đơn 'serving' (đang phục vụ).
        //  - Chưa có món nào phục vụ, còn món đang nấu → đơn 'preparing'.
        // KHÔNG đè lên trạng thái chốt: paid / completed / cancelled.
        // KHÔNG đưa đơn lùi về phía trước (chỉ tiến theo luồng phục vụ).

        const isTerminal = ['paid', 'completed', 'cancelled'].includes(existingOrder.status);
        if (!isTerminal) {
          // 1. Phân loại danh sách món
          const validItems = orderItems.filter(
            (i) => i.status !== 'deleted' && i.status !== 'cancelled',
          );
          const totalValid = validItems.length;

          const servedItems = validItems.filter((i) => i.status === 'served').length;
          const preparingItems = validItems.filter((i) => i.status === 'preparing').length;
          const deletedItems = orderItems.filter(
            (i) => i.status === 'deleted' || i.status === 'cancelled',
          ).length;

          let derivedStatus: string | null = null;

          if (totalValid === 0 && deletedItems > 0) {
            // TH1: Tất cả các món trong đơn đều đã bị hủy
            derivedStatus = 'cancelled'; // hoặc 'deleted' tùy enum của bạn
          } else if (totalValid > 0 && servedItems === totalValid) {
            // TH2: Tất cả các món còn hiệu lực đã phục vụ xong
            derivedStatus = 'served';
          } else if (servedItems > 0) {
            // TH3: Đã phục vụ được một số món (đang ra món dở dang)
            derivedStatus = 'serving';
          } else if (preparingItems > 0) {
            // TH4: Đang có ít nhất 1 món đang nấu
            derivedStatus = 'preparing';
          } else {
            // TH5: Chưa có món nào nấu/phục vụ (toàn bộ đang ở trạng thái 'pending' / 'waiting')
            derivedStatus = 'pending';
          }

          const flowRank: Record<string, number> = {
            pending: 0,
            confirmed: 1,
            preparing: 2,
            serving: 3,
            served: 4,
            delivered: 5,
            paid: 6,
            completed: 7,
            cancelled: 8,
          };
          const currentRank = flowRank[existingOrder.status] ?? 0;
          const derivedRank = derivedStatus ? (flowRank[derivedStatus] ?? 0) : -1;

          if (
            derivedStatus &&
            derivedRank > currentRank &&
            derivedStatus !== existingOrder.status
          ) {
            const updatedOrder = await orderRepository.updateOrder(orderId, {
              status: derivedStatus as IOrder['status'],
            });
            if (updatedOrder) {
              this.emitOrderUpdate({
                targetRoom: restaurantRoom,
                action: 'UPDATE_STATUS',
                orderData: updatedOrder,
                message: `Đơn hàng đã chuyển sang trạng thái ${derivedStatus}`,
              });
            }
          }
        }
      }

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
      const { orderItems, menuCounts } = await this.processOrderItems(
        items,
        new ObjectId(order._id.toString()),
      );

      const uniqueNewItemIds = [...new Set(orderItems.map((id) => id.toString()))];
      const existingItemIds = new Set(order.items.map((id) => id.toString()));
      const itemsToAdd = uniqueNewItemIds.filter((id) => !existingItemIds.has(id));
      order.items.push(...(itemsToAdd.map((id) => new Types.ObjectId(id)) as any));
      await order.save();

      const populatedOrder = await order.populate([
        { path: 'table', select: 'tableNumber capacity status' },
        { path: 'customer', select: 'name email phone' },
        { path: 'items' },
      ]);

      const allItems = (populatedOrder as any).items as IOrderItemDocument[];
      const activeItems = allItems.filter((item) => item.status !== 'deleted');
      populatedOrder.totalAmount = activeItems.reduce(
        (sum: number, item: IOrderItemDocument) => sum + item.priceSnapshot * item.quantity,
        0,
      );
      populatedOrder.itemsCount = activeItems.reduce(
        (sum: number, item: IOrderItemDocument) => sum + item.quantity,
        0,
      );

      // Món mới được thêm vào đơn đã phục vụ hết (served) → mở lại đơn về 'serving' (đang phục vụ)
      // vì còn món mới chưa xong. Đơn đã chốt (paid/completed) → mở lại về 'pending' để bếp nhận
      // món mới (KDS) và đơn hiển thị lại ở màn quản lý.
      if (populatedOrder.status === 'served') {
        populatedOrder.status = 'serving';
      } else if (['paid', 'completed'].includes(populatedOrder.status)) {
        populatedOrder.status = 'pending';
      }

      await populatedOrder.save();

      // Fan-out SAU khi thêm món (T03): socket ADD_ITEMS + notification + orderCount.
      // menuCounts = món MỚI trong request này (không scan lại đơn → không đếm trùng).
      await addJob(QUEUE_NAMES.orderFanOut, 'new-order', {
        orderId: order._id.toString(),
        restaurantId: order.restaurant.toString(),
        orderType: order.orderType,
        action: 'ADD_ITEMS',
        menuCounts,
      });

      return { code: 200, message: 'Thêm món vào Order thành công', data: order };
    } catch (error: any) {
      return { code: 500, message: error?.message || 'Lỗi khi thêm món' };
    }
  }

  /**
   * POS: Xoá (SOFT DELETE) một món khỏi đơn — nhân viên/thu ngân huỷ món.
   * Món KHÔNG bị xoá hẳn khỏi DB: đánh dấu status='deleted' + deletedReason/deletedAt
   * để màn chi tiết đơn còn truy vết được món đã xoá. Cập nhật totalAmount/itemsCount,
   * đồng bộ socket + bảng.
   */
  async removeItemFromOrderService(
    orderId: string,
    itemId: string,
    reason?: string,
  ): Promise<ServiceResponse<IOrderDocument | null>> {
    const order = await orderRepository.findOrderById(orderId);
    if (!order) return { code: 404, message: 'Không tìm thấy thông tin đơn hàng' };
    if (['paid', 'completed', 'cancelled'].includes(order.status)) {
      return { code: 400, message: 'Đơn hàng đã chốt, không thể xoá món' };
    }

    const item = await orderRepository.findOrderItemById(itemId);
    if (!item || item.order.toString() !== orderId) {
      return { code: 404, message: 'Không tìm thấy món ăn trong đơn' };
    }
    if (item.status === 'deleted') {
      return { code: 400, message: 'Món này đã được xoá khỏi đơn' };
    }

    // 1. SOFT DELETE món ăn
    const updatedItem = await orderRepository.updateOrderItem(itemId, {
      status: 'deleted',
      ...(reason ? { deletedReason: reason } : {}),
      deletedAt: new Date(),
    });

    // 2. Tính toán lại tổng tiền order
    await this.recalcOrderTotals(order);
    await order.save();

    // 3. Populate lại order để lấy danh sách items mới nhất
    const populatedOrder = await order.populate([
      { path: 'table', select: 'tableNumber capacity status' },
      { path: 'customer', select: 'name email phone' },
      { path: 'items' },
    ]);
    const restaurantRoom = `restaurant_${order.restaurant.toString()}`;

    // 4. Phân loại danh sách món để xử lý Auto-Update Status Order chuẩn nghiệp vụ
    const allItems = populatedOrder.items || [];

    // Lọc danh sách món hợp lệ (không bị xóa)
    const validItems = allItems.filter((i) => {
      return typeof i === 'object' && i !== null && 'status' in i && i.status !== 'deleted';
    });

    if (validItems.length === 0) {
      // TH1: Tất cả món trong đơn đều đã bị xóa -> Tự động HỦY ĐƠN
      populatedOrder.status = 'cancelled';
      await orderRepository.updateOrder(orderId, { status: 'cancelled' });
    } else {
      // TH2: Kiểm tra xem tất cả các món còn lại đã phục vụ xong chưa
      const isAllServed = validItems.every(
        (i) => typeof i === 'object' && i !== null && 'status' in i && i.status === 'served',
      );
      if (isAllServed) {
        populatedOrder.status = 'served';
        await orderRepository.updateOrder(orderId, { status: 'served' });
        this.emitOrderUpdate({
          targetRoom: restaurantRoom,
          action: 'UPDATE_STATUS',
          orderData: populatedOrder,
          message: 'Món ăn đã được xoá khỏi đơn hàng',
        });
      }
    }

    // 5. Bắn Socket event real-time (Truyền updatedItem có status 'deleted' chuẩn)
    console.log('Emitting order item delete:', updatedItem || item, 'to room:', restaurantRoom);

    this.emitOrderUpdate({
      targetRoom: restaurantRoom,
      action: 'DELETE_ITEM',
      orderData: populatedOrder,
      itemData: updatedItem || { ...item.toObject(), status: 'deleted' },
      message: 'Món ăn đã được xoá khỏi đơn hàng',
    });

    // 6. Trả về populatedOrder đầy đủ thông tin cho client
    return { code: 200, message: 'Xoá món khỏi đơn thành công', data: populatedOrder };
  }

  /**
   * POS: Cập nhật món trong đơn — số lượng / giá bán / ghi chú (thu ngân chỉnh món).
   */
  async updateOrderItemService(
    orderId: string,
    itemId: string,
    updateData: { quantity?: number; price?: number; note?: string },
  ): Promise<ServiceResponse<IOrderDocument | null>> {
    const order = await orderRepository.findOrderById(orderId);
    if (!order) return { code: 404, message: 'Không tìm thấy thông tin đơn hàng' };
    if (order.status === 'paid' || order.status === 'completed' || order.status === 'cancelled') {
      return { code: 400, message: 'Đơn hàng đã chốt, không thể sửa món' };
    }

    const item = await orderRepository.findOrderItemById(itemId);
    if (!item || item.order.toString() !== orderId) {
      return { code: 404, message: 'Không tìm thấy món ăn trong đơn' };
    }
    if (item.status === 'deleted') {
      return { code: 400, message: 'Món đã bị xoá khỏi đơn, không thể sửa' };
    }

    const patch: Partial<IOrderItemDocument> = {};
    if (updateData.quantity !== undefined) {
      if (!Number.isFinite(updateData.quantity) || updateData.quantity < 1) {
        return { code: 400, message: 'Số lượng món không hợp lệ' };
      }
      patch.quantity = updateData.quantity;
    }
    if (updateData.price !== undefined) {
      if (!Number.isFinite(updateData.price) || updateData.price < 0) {
        return { code: 400, message: 'Giá bán không hợp lệ' };
      }
      patch.priceSnapshot = updateData.price;
    }
    if (updateData.note !== undefined) {
      patch.note = updateData.note;
    }

    const updatedItem = await orderRepository.updateOrderItem(itemId, patch);
    if (!updatedItem) return { code: 404, message: 'Không tìm thấy món ăn trong đơn' };

    // Tính lại tổng từ danh sách món còn hiệu lực (không tính món đã xoá)
    await this.recalcOrderTotals(order);
    await order.save();

    const populatedOrder = await order.populate([
      { path: 'table', select: 'tableNumber capacity status' },
      { path: 'customer', select: 'name email phone' },
      { path: 'items' },
    ]);

    this.emitOrderUpdate({
      targetRoom: `restaurant_${order.restaurant.toString()}`,
      action: 'UPDATE_ITEM',
      orderData: populatedOrder,
      itemData: updatedItem,
      message: 'Món ăn trong đơn đã được cập nhật',
    });

    return { code: 200, message: 'Cập nhật món trong đơn thành công', data: order };
  }

  /**
   * POS: Chuyển đơn sang bàn khác — chỉ đơn dine-in, bàn đích cùng nhà hàng & đang trống.
   */
  async moveOrderToTableService(
    orderId: string,
    targetTableId: string,
  ): Promise<ServiceResponse<IOrderDocument | null>> {
    const order = await orderRepository.findOrderById(orderId);
    if (!order) return { code: 404, message: 'Không tìm thấy thông tin đơn hàng' };
    if (order.orderType !== 'dine-in') {
      return { code: 400, message: 'Chỉ chuyển được đơn tại bàn (dine-in)' };
    }
    if (order.status === 'paid' || order.status === 'completed' || order.status === 'cancelled') {
      return { code: 400, message: 'Đơn hàng đã chốt, không thể chuyển bàn' };
    }
    if (order.table && order.table.toString() === targetTableId) {
      return { code: 400, message: 'Đơn đang ở chính bàn này' };
    }

    const targetTable = await tableRepository.findTableById(targetTableId);
    if (!targetTable) return { code: 404, message: 'Không tìm thấy bàn đích' };
    if (targetTable.restaurant.toString() !== order.restaurant.toString()) {
      return { code: 400, message: 'Bàn đích không thuộc nhà hàng này' };
    }
    if (targetTable.currentOrder && targetTable.currentOrder.toString() !== orderId) {
      return { code: 400, message: 'Bàn đích đang có đơn khác' };
    }

    // Trả bàn cũ về trạng thái trống nếu không còn đơn nào treo
    const oldTableId = order.table?.toString();
    order.table = new ObjectId(targetTableId) as any;
    await order.save();

    await tableRepository.updateTable(targetTableId, {
      currentOrder: order._id as unknown as Types.ObjectId,
      status: 'occupied',
    });
    if (oldTableId) {
      const stillActive = await orderRepository.findOrders({
        table: oldTableId,
        status: { $nin: ['paid', 'completed', 'cancelled'] },
        _id: { $ne: order._id },
      });
      if (!stillActive || stillActive.length === 0) {
        await tableRepository.updateTable(oldTableId, {
          currentOrder: null,
          status: 'available',
        });
      }
    }

    const populatedOrder = await order.populate([
      { path: 'table', select: 'tableNumber capacity status' },
      { path: 'customer', select: 'name email phone' },
      { path: 'items' },
    ]);

    this.emitOrderUpdate({
      targetRoom: `restaurant_${order.restaurant.toString()}`,
      action: 'UPDATE_STATUS',
      orderData: populatedOrder,
      message: 'Đơn hàng đã được chuyển sang bàn khác',
    });

    return { code: 200, message: 'Chuyển bàn thành công', data: order };
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

    // Đơn hiện tại = mọi đơn CHƯA chốt: chỉ loại completed / cancelled.
    // paid (đã thanh toán nhưng chưa hoàn thành — to-go/delivery) vẫn hiện trên trang order.
    return await orderRepository.findOrders({
      restaurant: restaurantId,
      status: { $nin: ['completed', 'cancelled'] },
    });
  }

  /**
   * KDS: danh sách đơn còn món chưa được phục vụ — bất kể trạng thái đơn
   * (kể cả served / paid thanh toán trước). Dựa trên trạng thái món, không phải trạng thái đơn.
   */
  async getKdsOrdersService(restaurantId: string): Promise<IOrderDocument[]> {
    if (!restaurantId) throw new Error('Thiếu ID nhà hàng (restaurantId)');
    return await orderRepository.findKdsOrders(restaurantId);
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
      status: { $nin: ['paid', 'completed', 'cancelled'] },
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
    if (!customerId || !/^[0-9a-fA-F]{24}$/.test(customerId)) {
      return { code: 200, message: 'Chưa có thông tin khách hàng hợp lệ', data: [] };
    }
    const orders = await orderRepository.findOrders({ customer: customerId });
    if (!orders) return { code: 404, message: 'Không tìm thấy đơn hàng nào của khách hàng' };
    return { code: 200, message: 'Lấy thông tin đơn hàng của khách hàng thành công', data: orders };
  }

  async updateOrderService(
    id: string,
    orderData: Partial<IOrderDocument>,
  ): Promise<ServiceResponse<IOrderDocument | null>> {
    const existingOrder = await orderRepository.findOrderById(id);
    if (existingOrder?.status == 'paid' || existingOrder?.status == 'completed') {
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
    const validStatuses: IOrder['status'][] = [
      'pending',
      'confirmed',
      'preparing',
      'serving',
      'served',
      'delivered',
      'paid',
      'completed',
      'cancelled',
    ];
    if (!validStatuses.includes(status as IOrder['status'])) {
      return { code: 400, message: 'Trạng thái đơn hàng không hợp lệ' };
    }

    const order = await orderRepository.updateOrder(id, { status: status as IOrder['status'] });
    if (!order) return { code: 404, message: 'Không tìm thấy thông tin đơn hàng' };

    // Đồng bộ trạng thái đơn hàng tới màn hình bếp (KDS) và màn hình quản lý của nhà hàng
    this.emitOrderUpdate({
      targetRoom: `restaurant_${order.restaurant.toString()}`,
      action: 'UPDATE_STATUS',
      orderData: order,
      message: 'Trạng thái đơn hàng đã được cập nhật',
    });

    return { code: 200, message: 'Cập nhật trạng thái đơn hàng thành công', data: order };
  }

  /**
   * Khách tại bàn gọi nhân viên / yêu cầu thanh toán.
   * Public endpoint (không cần token) — nên dựa vào table để xác định đúng nhà hàng (chống giả mạo).
   */
  async tableRequestService(
    type: 'call_staff' | 'payment_request',
    payload: { tableId?: string; restaurantId?: string },
  ): Promise<ServiceResponse<INotification | null>> {
    const tableId = payload?.tableId;
    if (!tableId) return { code: 400, message: 'Thiếu thông tin bàn (tableId)' };

    const table = await tableRepository.findTableById(tableId);
    if (!table) return { code: 404, message: 'Không tìm thấy thông tin bàn' };

    // Bảo mật đa tenant: nhà hàng thật lấy từ bàn, không tin tưởng restaurantId từ client
    const restaurantId = table.restaurant.toString();
    if (payload?.restaurantId && payload.restaurantId !== restaurantId) {
      return { code: 400, message: 'Bàn không thuộc nhà hàng này' };
    }

    const tableNumber = table.tableNumber;
    const isPayment = type === 'payment_request';
    const message = isPayment
      ? `Khách yêu cầu thanh toán tại bàn ${tableNumber}`
      : `Khách gọi nhân viên tại bàn ${tableNumber}`;

    const payloadNoti: Partial<INotification> = {
      restaurant: new ObjectId(restaurantId),
      type,
      message,
      data: { tableId, tableNumber },
    };

    await notificationService.createNewNotification(payloadNoti, `restaurant_${restaurantId}`);
    return { code: 200, message: message, data: payloadNoti as INotification };
  }
}

export default new OrderService();
