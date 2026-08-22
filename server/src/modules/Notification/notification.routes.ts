import { Router } from "express";
import notificationController from "./notification.controller.js";
import {
  verifyRole,
  verifyTenant,
  verifyToken,
  intersectRestaurantIds,
} from "../../middlewares/auth.middleware.js";

const router = Router();

// Tất cả các route thông báo đều cần đăng nhập

// ── NỀN TẢNG (super-admin) — đặt TRƯỚC route "/:restaurantId" để không bị nuốt params ──
router.get(
  "/platform",
  verifyToken,
  verifyRole(["super-admin"]),
  notificationController.getPlatformNotifications
);
router.post(
  "/platform/read-all",
  verifyToken,
  verifyRole(["super-admin"]),
  notificationController.markAllPlatformRead
);

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