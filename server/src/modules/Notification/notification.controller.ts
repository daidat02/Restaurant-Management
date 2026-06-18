import notificationService from "./notification.service.js";
import type { Request, Response } from "express";

class NotificationController {
  // [GET] /api/notifications?page=1&limit=20
  async getMyNotifications(req: Request, res: Response) {
    try {
      // Lấy restaurantId từ User đã đăng nhập (được gán từ middleware auth)
      const {restaurantId} = req.params;
      
      if (!restaurantId) {
        return res.status(400).json({ code: 400, message: "Tài khoản không thuộc nhà hàng nào" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await notificationService.getNotificationsByRestaurant(restaurantId, page, limit);
      return res.status(result.code).json(result);
    } catch (error) {
        return  res.status(500).json(error);
    }
  }

  // [PATCH] /api/notifications/:id/read
  async markAsRead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await notificationService.readSingleNotification(id || '');
      
      return res.status(result.code).json(result);
    } catch (error) {
        return  res.status(500).json(error);
    }
  }

  // [POST] /api/notifications/read-all
  async markAllAllRead(req: Request, res: Response) {
    try {
      const {restaurantId} = req.params

      if (!restaurantId) {
        return res.status(400).json({ code: 400, message: "Không tìm thấy thông tin nhà hàng" });
      }

      const result = await notificationService.readAllRestaurantNotifications(restaurantId);
      return res.status(result.code).json(result);
    } catch (error) {
        return  res.status(500).json(error);
    }
  }
}

export default new NotificationController();