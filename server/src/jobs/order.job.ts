import { Types } from 'mongoose';
import { getIO } from '../configs/socketsConfig.js';
import type { INotification } from '../models/Schema/NotificationSchema.js';
import menuRepository from '../modules/MenuModule/menu.repository.js';
import orderRepository from '../modules/OrderModule/order.repository.js';
import { QUEUE_NAMES } from '../queues/queue.js';
import { addJob, registerJobHandler } from './handlers.js';

const ObjectId = Types.ObjectId;

/**
 * ==========================================
 * JOB: new-order (queue order-fanout)
 * ==========================================
 * Fan-out SAU KHI order tạo xong sync (commit DB): chạy nền, giảm tải request
 * khách giờ cao điểm. Payload carry đủ dữ liệu để job KHÔNG phải scan lại đơn
 * (menuCounts = số món MỚI vừa thêm trong request này, tránh đếm trùng khi gọi
 * add-item nhiều lần cho cùng đơn).
 *
 * Thực thi 3 side-effect:
 *   (a) emit socket `order_event` → room `restaurant_<id>` + `order_<id>`.
 *   (b) enqueue `create-notification` (new_order) để retry độc lập.
 *   (c) tăng `orderCount` của từng MenuItem (bestseller/báo cáo).
 *
 * Status-change emits (served/paid/cancelled) KHÔNG qua job — giữ sync ở
 * service (chi tiết ticket T03). Redis down → addJob chạy inline CÙNG handler.
 */

export type NewOrderAction = 'CREATE' | 'ADD_ITEMS';

export interface NewOrderData {
  orderId: string;
  restaurantId: string;
  orderType: string;
  action: NewOrderAction;
  /** Số món trong request NÀY ({menuItemId, quantity}) — source of truth soldCount. */
  menuCounts: { menuItemId: string; quantity: number }[];
}

export const newOrder = async (payload: NewOrderData): Promise<void> => {
  const { orderId, restaurantId, orderType, action, menuCounts } = payload;

  const order = await orderRepository.findOrderById(orderId);
  if (!order) {
    console.warn(`[Job new-order] Không tìm thấy đơn ${orderId} — bỏ qua fan-out.`);
    return;
  }

  const populatedOrder = await order.populate([
    { path: 'table', select: 'tableNumber capacity status' },
    { path: 'customer', select: 'name email phone' },
    { path: 'items' },
  ]);

  const tableData = (populatedOrder as any).table as any;
  const orderSource =
    orderType === 'dine-in'
      ? `bàn ${tableData?.tableNumber}`
      : `khách hàng ${(populatedOrder as any).deliveryInfo?.name || 'Ẩn danh'}`;

  const io = getIO();
  const targetRoom = `restaurant_${restaurantId}`;
  const orderRoom = `order_${orderId}`;
  const socketMessage =
    action === 'ADD_ITEMS'
      ? `Bàn ${tableData?.tableNumber} đã thêm món ăn mới`
      : `Có đơn hàng mới từ ${orderSource}`;
  // Giữ đúng thông báo cũ ở notification (khác message socket).
  const notiMessage =
    action === 'ADD_ITEMS'
      ? 'Đơn Hàng Có Sự Thay Đổi. Vui Lòng Kiểm Tra Chi Tiết'
      : 'Vừa có một đơn hàng mới';

  // (a) socket order_event — giữ nguyên quy tắc cũ: ORDER WAITING_PAID không push CREATE.
  if (action !== 'CREATE' || populatedOrder.paymentStatus !== 'waiting_paid') {
    io.to(targetRoom).emit('order_event', { action, orderData: populatedOrder, message: socketMessage });
    io.to(orderRoom).emit('order_event', { action, orderData: populatedOrder, message: socketMessage });
  }

  // (b) enqueue notification new_order (retry độc lập, không kéo theo job này).
  const payloadNoti: Partial<INotification> = {
    restaurant: new ObjectId(restaurantId),
    type: 'new_order',
    message: notiMessage,
    data: order,
  };
  await addJob(QUEUE_NAMES.notification, 'create-notification', {
    payload: payloadNoti,
    targetRoom,
  });

  // (c) tăng orderCount cho từng MenuItem (bulkWrite $inc một lần).
  if (menuCounts && menuCounts.length > 0) {
    await menuRepository.incrementOrderCounts(menuCounts);
  }

  console.log(`[Job new-order] ${orderId} — fan-out xong: socket + notification + orderCount.`);
};

registerJobHandler('new-order', newOrder);

export default newOrder;