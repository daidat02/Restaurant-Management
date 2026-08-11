import type { Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import conversationService from "./conversation.service.js";
import messageService from "./message.service.js";

class ConversationController {
  // [GET] /api/conversations — danh sách hội thoại của user (multi-tenant)
  async getConversations(req: AuthRequest, res: Response) {
    try {
      const userId = String(req.user?.userId ?? "");
      const restaurantIds = (req.user?.restaurantIds ?? [])
        .map((id) => String(id))
        .filter(Boolean);

      if (!userId || restaurantIds.length === 0) {
        return res.status(200).json({ code: 200, data: [], message: "Không có hội thoại" });
      }

      const result = await conversationService.getConversations(userId, restaurantIds);
      return res.status(result.code).json(result);
    } catch (error) {
      return res.status(500).json({ code: 500, message: "Lỗi máy chủ nội bộ", error });
    }
  }

  // [POST] /api/conversations — tạo direct/group (tenant từ req.tenantId)
  async createConversation(req: AuthRequest, res: Response) {
    try {
      const userId = String(req.user?.userId ?? "");
      const role = String(req.user?.role ?? "");
      const restaurantId = req.tenantId ?? "";

      if (!restaurantId) {
        return res.status(400).json({ code: 400, message: "Thiếu thông tin nhà hàng" });
      }

      const result = await conversationService.createConversation(
        userId,
        role,
        restaurantId,
        req.body ?? {},
      );
      return res.status(result.code).json(result);
    } catch (error) {
      return res.status(500).json({ code: 500, message: "Lỗi máy chủ nội bộ", error });
    }
  }

  // [GET] /api/conversations/direct/:userId — tìm hội thoại 1-1 với user (trả null nếu chưa có)
  async getDirectConversation(req: AuthRequest, res: Response) {
    try {
      const userId = String(req.user?.userId ?? "");
      const role = String(req.user?.role ?? "");
      const restaurantId = req.tenantId ?? "";

      const result = await conversationService.getDirectConversation(
        userId,
        role,
        req.params.userId ?? "",
        restaurantId,
      );
      return res.status(result.code).json(result);
    } catch (error) {
      return res.status(500).json({ code: 500, message: "Lỗi máy chủ nội bộ", error });
    }
  }

  // [GET] /api/conversations/:id/messages — phân trang tin nhắn
  async getMessages(req: AuthRequest, res: Response) {
    try {
      const userId = String(req.user?.userId ?? "");
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await conversationService.getMessages(
        req.params.id ?? "",
        userId,
        page,
        limit,
      );
      return res.status(result.code).json(result);
    } catch (error) {
      return res.status(500).json({ code: 500, message: "Lỗi máy chủ nội bộ", error });
    }
  }

  // [POST] /api/conversations/:id/messages — gửi tin nhắn
  async sendMessage(req: AuthRequest, res: Response) {
    try {
      const userId = String(req.user?.userId ?? "");
      const role = String(req.user?.role ?? "");
      const text = req.body?.text ?? "";

      const result = await messageService.sendMessage(req.params.id ?? "", userId, role, text);
      return res.status(result.code).json(result);
    } catch (error) {
      return res.status(500).json({ code: 500, message: "Lỗi máy chủ nội bộ", error });
    }
  }

   // [POST] /api/conversations/:id/read — đánh dấu đã đọc
  async markRead(req: AuthRequest, res: Response) {
    try {
      const userId = String(req.user?.userId ?? "");

      const result = await conversationService.markRead(req.params.id ?? "", userId);
      return res.status(result.code).json(result);
    } catch (error) {
      return res.status(500).json({ code: 500, message: "Lỗi máy chủ nội bộ", error });
    }
  }

  // [POST] /api/conversations/:id/members — thêm member vào group
  async addMember(req: AuthRequest, res: Response) {
    try {
      const userId = String(req.user?.userId ?? "");

      const result = await conversationService.addMember(
        req.params.id ?? "",
        userId,
        req.body ?? {},
      );
      return res.status(result.code).json(result);
    } catch (error) {
      return res.status(500).json({ code: 500, message: "Lỗi máy chủ nội bộ", error });
    }
  }

  // [DELETE] /api/conversations/:id/members/:userId — gỡ member khỏi group
  async removeMember(req: AuthRequest, res: Response) {
    try {
      const userId = String(req.user?.userId ?? "");

      const result = await conversationService.removeMember(
        req.params.id ?? "",
        userId,
        req.params.userId ?? "",
      );
      return res.status(result.code).json(result);
    } catch (error) {
      return res.status(500).json({ code: 500, message: "Lỗi máy chủ nội bộ", error });
    }
  }
}

export default new ConversationController();