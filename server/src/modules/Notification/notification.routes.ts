import { Router } from "express";
import notificationController from "./notification.controller.js";
import { verifyTenant, verifyToken } from "../../middlewares/auth.middleware.js";

const router = Router();

// Tất cả các route thông báo đều cần đăng nhập

router.get("/:restaurantId", verifyToken, verifyTenant, notificationController.getMyNotifications);
router.patch("/:id/read", verifyToken, notificationController.markAsRead);
router.post(
  "/read-all/:restaurantId",
  verifyToken,
  verifyTenant,
  notificationController.markAllAllRead,
);

export default router;