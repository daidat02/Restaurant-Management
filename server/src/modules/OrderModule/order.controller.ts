import type { Request, Response } from 'express';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';
import orderService from './order.service.js';
import { getIO } from '../../configs/socketsConfig.js';
import notificationRepository from '../Notification/notification.repository.js';
import { generateId } from '../../configs/constants.js';

class OrderController {
  async createOrder(req: AuthRequest, res: Response) {
    const { items, ...orderData } = req.body;
    const orderId = generateId();
    const tableId = req.query.tableId || req.body.table;
    const restaurantId = req.query.restaurantId || req.body.restaurant;
    try {
      const result = await orderService.createOrderService(
        {
          orderId,
          ...orderData,
          table: tableId as string,
          restaurant: restaurantId as string,
        },
        items,
      );
      res.status(result.code).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server...' });
    }
  }

  async addItemIntoOrder(req: AuthRequest, res: Response) {
    const { items, orderId } = req.body;
    try {
      const result = await orderService.addItemIntoOrder(items, orderId);
      res.status(result.code).json(result);
      const notification = await notificationRepository.createNotification({
        type: 'new_order',
        message: 'Đơn Hàng Có Sự Thay Đổi. Vui Lòng Kiểm Tra Chi Tiết',
        data: result.data,
      });
      const resRestaurantId = result.data?.restaurant?.toString?.() || '';
      if (resRestaurantId) getIO().to(`restaurant_${resRestaurantId}`).emit('new_Notification', notification);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Lỗi server...' });
    }
  }
  async updateOrederItemStatus(req: Request, res: Response) {
    const { itemId, status } = req.params;
    try {
      const result = await orderService.updateStatusOrderItemService(itemId || '', status || '');
      res.status(result.code).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server...' });
    }
  }

  async getAllOrderByRestaurant(req: AuthRequest, res: Response) {
    const restaurantId = req.tenantId;
    try {
      const result = await orderService.getAllOrderByRestaurant(restaurantId || '');
      res.status(result.code).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server...' });
    }
  }
  async getActiveOrders(req: AuthRequest, res: Response) {
    try {
      const restaurantId = req.tenantId;

      const orders = await orderService.getActiveOrdersService(restaurantId || '');

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách đơn hiện tại thành công',
        data: orders,
      });
    } catch (error: any) {
      console.error('Lỗi getActiveOrders:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi server nội bộ',
      });
    }
  }

  async getAllOrderStatusByRestaurant(req: AuthRequest, res: Response) {
    const { status } = req.params;
    const restaurantId = req.tenantId;
    console.log('status:', status);
    try {
      const result = await orderService.getAllOrderByStatusByRestaurant(
        restaurantId || '',
        status || '',
      );
      res.status(result.code).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server...' });
    }
  }

  async getDetailOrder(req: AuthRequest, res: Response) {
    const { id } = req.params;
    try {
      const result = await orderService.getDetailOrder(id || '');
      res.status(result.code).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server...' });
    }
  }

  async updateOrder(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const orderData = req.body;
    try {
      const result = await orderService.updateOrderService(id || '', orderData);
      res.status(result.code).json(result);

      const notification = await notificationRepository.createNotification({
        type: 'new_order',
        message: 'Đơn Hàng Có Sự Thay Đổi. Vui Lòng Kiểm Tra Chi Tiết',
        data: result.data,
      });
      const resRestaurantId = result.data?.restaurant?.toString?.() || '';
      if (resRestaurantId) getIO().to(`restaurant_${resRestaurantId}`).emit('new_Notification', notification);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Lỗi server...' });
    }
  }

  async updateStatusOrder(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { status } = req.body;
    try {
      const result = await orderService.updateStatusOrderService(id || '', status || '');
      const notification = await notificationRepository.createNotification({
        type: 'new_order',
        message: 'Trạng Thái Đơn Hàng Đã Thay Đổi. Vui Lòng Kiểm Tra Chi Tiết',
        data: result.data,
      });
      const resRestaurantId = result.data?.restaurant?.toString?.() || '';
      if (resRestaurantId) getIO().to(`restaurant_${resRestaurantId}`).emit('new_Notification', notification);
      res.status(result.code).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server...' });
    }
  }

  async getOrderByTableId(req: AuthRequest, res: Response) {
    const { tableId } = req.params;
    try {
      const result = await orderService.getOrderByTableId(tableId || '');

      // Public endpoint (khách tại bàn): che thông tin nhạy cảm nếu request không có tenant hợp lệ.
      const order = result.data as any;
      const orderTenant = order?.restaurant?.toString?.() ?? order?.restaurant ?? '';
      const hasTenant = Boolean(req.user?.restaurantId) && req.user?.restaurantId === orderTenant;
      if (result.code === 200 && order && !hasTenant) {
        const { customer, staff, deliveryInfo, notes, reservation, ...safe } = order.toObject
          ? order.toObject()
          : order;
        result.data = safe;
      }

      res.status(result.code).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server...' });
    }
  }

  async getMyOrders(req: AuthRequest, res: Response) {
    const userId = req.user?.userId || '';
    try {
      const result = await orderService.getMyOrdersService(userId);
      res.status(result.code).json(result);
    } catch (error) {
      console.log('error:', error);
      res.status(500).json({ message: 'Lỗi server... 1' });
    }
  }
}

export default new OrderController();
