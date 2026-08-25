import type { Request, Response } from 'express';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';
import orderService from './order.service.js';
import orderRepository from './order.repository.js';
import { generateId } from '../../configs/constants.js';
import { writeAuditLog } from '../../services/auditLog.service.js';

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

  async getKdsOrders(req: AuthRequest, res: Response) {
    try {
      const restaurantId = req.tenantId;

      const orders = await orderService.getKdsOrdersService(restaurantId || '');

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách đơn cho màn hình bếp thành công',
        data: orders,
      });
    } catch (error: any) {
      console.error('Lỗi getKdsOrders:', error);
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
      // Realtime UI đã do service phát (order_event UPDATE_STATUS tới room nhà hàng).
      // Bell notification cho đơn chỉ thuộc luồng CREATE/ADD_ITEMS qua queue order-fanout —
      // KHÔNG tạo notification ở đây (trước đây thiếu trường restaurant nên rò vào feed
      // nền tảng của super-admin do query { restaurant: null } match cả field bị thiếu).
      if (result.code === 200) {
        const resRestaurantId = result.data?.restaurant?.toString?.() || '';
        await writeAuditLog({
          action: 'order.update.status',
          restaurant: resRestaurantId || req.tenantId || req.user?.restaurantId || null,
          actor: req.user?.userId || null,
          actorInfo: { name: req.user?.name, role: req.user?.role },
          targetType: 'order',
          targetId: id || null,
          summary: `Cập nhật trạng thái đơn → ${status}`,
          meta: { status },
        });
      }
      res.status(result.code).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server...' });
    }
  }

  // ============ POS: thao tác món/đơn (staff & manager) ============

  async removeItemFromOrder(req: AuthRequest, res: Response) {
    const { id, itemId } = req.params;
    const reason = req.body?.reason as string | undefined;
    try {
      const result = await orderService.removeItemFromOrderService(id || '', itemId || '', reason);
      const resRestaurantId = result.data?.restaurant?.toString?.() || '';
      if (result.code === 200) {
        // Món vẫn còn trong DB sau soft delete → query lại để lấy tên cho audit log.
        const item = await orderRepository.findOrderItemById(itemId || '');
        const itemName = item?.nameSnapshot || '';
        const reasonText = reason?.trim() ? ` (lý do: ${reason.trim()})` : '';
        await writeAuditLog({
          action: 'order.item.remove',
          restaurant: resRestaurantId || req.tenantId || req.user?.restaurantId || null,
          actor: req.user?.userId || null,
          actorInfo: { name: req.user?.name, role: req.user?.role },
          targetType: 'order',
          targetId: id || null,
          summary: itemName
            ? `Xoá món ${itemName} khỏi đơn${reasonText}`
            : `Xoá món khỏi đơn${reasonText}`,
          meta: { itemId, reason: reason?.trim() || '' },
        });
      }
      res.status(result.code).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server...' });
    }
  }

  async updateOrderItem(req: AuthRequest, res: Response) {
    const { id, itemId } = req.params;
    const updateData = req.body || {};
    try {
      const result = await orderService.updateOrderItemService(id || '', itemId || '', updateData);
      const resRestaurantId = result.data?.restaurant?.toString?.() || '';
      if (result.code === 200) {
        const itemName =
          (result.data?.items as any[])?.find?.((i) => i._id?.toString?.() === itemId)?.nameSnapshot ||
          (result.data?.items as any[])?.find?.((i) => i._id?.toString?.() === itemId)?.name;
        await writeAuditLog({
          action: 'order.item.update',
          restaurant: resRestaurantId || req.tenantId || req.user?.restaurantId || null,
          actor: req.user?.userId || null,
          actorInfo: { name: req.user?.name, role: req.user?.role },
          targetType: 'order',
          targetId: id || null,
          summary: itemName ? `Sửa món ${itemName} trong đơn` : 'Sửa món trong đơn',
          meta: { itemId, ...updateData },
        });
      }
      res.status(result.code).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server...' });
    }
  }

  async moveOrderToTable(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { targetTableId } = req.body || {};
    try {
      const result = await orderService.moveOrderToTableService(id || '', targetTableId || '');
      const resRestaurantId = result.data?.restaurant?.toString?.() || '';
      if (result.code === 200) {
        const targetTableNumber = (result.data?.table as any)?.tableNumber;
        await writeAuditLog({
          action: 'order.move.table',
          restaurant: resRestaurantId || req.tenantId || req.user?.restaurantId || null,
          actor: req.user?.userId || null,
          actorInfo: { name: req.user?.name, role: req.user?.role },
          targetType: 'order',
          targetId: id || null,
          summary: targetTableNumber
            ? `Chuyển đơn sang bàn ${targetTableNumber}`
            : 'Chuyển đơn sang bàn khác',
          meta: { targetTableId },
        });
      }
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

  // Khách tại bàn gọi nhân viên (public — không cần token)
  async callStaff(req: Request, res: Response) {
    try {
      const result = await orderService.tableRequestService('call_staff', req.body);
      res.status(result.code).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server...' });
    }
  }

  // Khách tại bàn yêu cầu thanh toán (public — không cần token)
  async requestPayment(req: Request, res: Response) {
    try {
      const result = await orderService.tableRequestService('payment_request', req.body);
      res.status(result.code).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server...' });
    }
  }
}

export default new OrderController();
