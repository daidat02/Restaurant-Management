import { Router } from "express";
import notificationController from "./notification.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = Router();

// Tất cả các route thông báo đều cần đăng nhập

router.get("/:restaurantId",verifyToken, notificationController.getMyNotifications);
router.patch("/:id/read",verifyToken, notificationController.markAsRead);
router.post("/read-all/:restaurantId",verifyToken, notificationController.markAllAllRead);

export default router;