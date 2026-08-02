import { Router } from "express";
import notificationController from "./notification.controller.js";
import { verifyTenant, verifyToken, intersectRestaurantIds } from "../../middlewares/auth.middleware.js";

const router = Router();

// Tất cả các route thông báo đều cần đăng nhập

// Admin (chủ chuỗi): lấy thông báo toàn chuỗi — không cần param restaurantId.
router.get("/", verifyToken, intersectRestaurantIds, notificationController.getChainNotifications);
router.get("/:restaurantId", verifyToken, verifyTenant, notificationController.getMyNotifications);
router.patch("/:id/read", verifyToken, notificationController.markAsRead);
router.post(
  "/read-all/:restaurantId",
  verifyToken,
  verifyTenant,
  notificationController.markAllAllRead,
);

export default router;