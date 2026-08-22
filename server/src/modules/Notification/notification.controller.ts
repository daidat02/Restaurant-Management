import notificationService from "./notification.service.js";
import type { Request, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";

class NotificationController {
  // [GET] /api/notifications?page=1&limit=20
  async getMyNotifications(req: AuthRequest, res: Response) {
    try {
      // Lấy restaurantId từ ngữ cảnh tenant đã xác thực (req.tenantId)
      const restaurantId = req.tenantId;
      
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

  // [GET] /api/notifications?page=1&limit=20 — admin (chủ chuỗi): gộp toàn chuỗi
  async getChainNotifications(req: AuthRequest, res: Response) {
    try {
      // restaurantIds do intersectRestaurantIds ghi vào req.user.restaurantIds
      const restaurantIds = (req.user?.restaurantIds ?? []).map((id) => String(id)).filter(Boolean);

      if (restaurantIds.length === 0) {
        return res.status(200).json({ code: 200, data: [], message: "Không có thông báo" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await notificationService.getChainNotifications(restaurantIds, page, limit);
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
  async markAllAllRead(req: AuthRequest, res: Response) {
    try {
      const restaurantId = req.tenantId

      if (!restaurantId) {
        return res.status(400).json({ code: 400, message: "Không tìm thấy thông tin nhà hàng" });
      }

      const result = await notificationService.readAllRestaurantNotifications(restaurantId);
      return res.status(result.code).json(result);
    } catch (error) {
        return  res.status(500).json(error);
    }
  }

  // [GET] /api/notifications/platform — super-admin: thông báo nền tảng (restaurant = null)
  async getPlatformNotifications(req: AuthRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await notificationService.getPlatformNotifications(page, limit);
      return res.status(result.code).json(result);
    } catch (error) {
        return  res.status(500).json(error);
    }
  }

  // [POST] /api/notifications/platform/read-all — super-admin đọc tất cả thông báo nền tảng
  async markAllPlatformRead(_req: AuthRequest, res: Response) {
    try {
      const result = await notificationService.readAllPlatformNotifications();
      return res.status(result.code).json(result);
    } catch (error) {
        return  res.status(500).json(error);
    }
  }
}

export default new NotificationController();