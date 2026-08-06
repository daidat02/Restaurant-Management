import { Router } from "express";
import conversationController from "./conversation.controller.js";
import {
  verifyToken,
  verifyTenant,
  intersectRestaurantIds,
  requireResourceTenant,
  conversationTenantResolver,
} from "../../middlewares/auth.middleware.js";

const router = Router();

// Tất cả route chat đều cần đăng nhập (Q1: staff/manager/admin)

// Danh sách hội thoại của user trên toàn chuỗi nhà hàng của họ
router.get(
  "/",
  verifyToken,
  intersectRestaurantIds,
  conversationController.getConversations,
);

// Tạo hội thoại direct/group (group chỉ manager/admin — kiểm tra trong service)
router.post(
  "/",
  verifyToken,
  verifyTenant,
  conversationController.createConversation,
);

// Lịch sử tin nhắn (phân trang) — ownership tenant qua requireResourceTenant
router.get(
  "/:id/messages",
  verifyToken,
  requireResourceTenant(conversationTenantResolver),
  conversationController.getMessages,
);

// Gửi tin nhắn
router.post(
  "/:id/messages",
  verifyToken,
  requireResourceTenant(conversationTenantResolver),
  conversationController.sendMessage,
);

// Đánh dấu đã đọc
router.post(
  "/:id/read",
  verifyToken,
  requireResourceTenant(conversationTenantResolver),
  conversationController.markRead,
);

// Thêm member vào group
router.post(
  "/:id/members",
  verifyToken,
  requireResourceTenant(conversationTenantResolver),
  conversationController.addMember,
);

// Gỡ member khỏi group
router.delete(
  "/:id/members/:userId",
  verifyToken,
  requireResourceTenant(conversationTenantResolver),
  conversationController.removeMember,
);

export default router;