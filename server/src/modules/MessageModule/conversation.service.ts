import type { Types } from "mongoose";
import { getIO } from "../../configs/socketsConfig.js";
import DB_Connection from "../../models/DB_Connection.js";
import type {
  IConversation,
  IConversationMember,
} from "../../models/Schema/ConversationSchema.js";
import type { ServiceResponse } from "../../shared/type.js";
import conversationRepository from "./conversation.repository.js";
import messageRepository from "./message.repository.js";

// Q1: chỉ staff/manager/admin nhắn tin nội bộ
const ALLOWED_ROLES = ["staff", "manager", "admin"];

interface ConversationView {
  _id: string;
  type: "direct" | "group";
  restaurantId: string;
  name: string | undefined;
  createdBy: string;
  lastMessage: IConversation["lastMessage"];
  memberCount: number;
  otherMember:
    | {
        userId: string;
        name: string;
        avatar: string;
        role: string;
      }
    | undefined;
  unreadCount: number;
  updatedAt: Date | undefined;
}

const userIdOf = (m: IConversationMember): string => {
  const id = (m.userId as any)?._id ?? m.userId;
  return String(id);
};

const memberOf = (conv: IConversation, userId: string): IConversationMember | undefined =>
  conv.members.find((m) => userIdOf(m) === String(userId));

const isEmployeeUser = (user: any): boolean =>
  user && user.isActive !== false && ALLOWED_ROLES.includes(user?.role);

const belongsToRestaurant = (user: any, restaurantId: string): boolean => {
  const ids = new Set([
    ...(user?.restaurantIds ?? []).map((id: any) => String(id)),
    ...(user?.restaurant ? [String(user.restaurant)] : []),
  ]);
  return ids.has(String(restaurantId));
};

class ConversationService {
  // [GET] /api/conversations — danh sách conv của user kèm unread + lastMessage
  async getConversations(
    userId: string,
    restaurantIds: string[],
  ): Promise<ServiceResponse<ConversationView[]>> {
    const conversations = await conversationRepository.findConversationsOfUser(
      userId,
      restaurantIds,
    );

    const views: ConversationView[] = [];
    for (const conv of conversations) {
      const me = memberOf(conv, userId);
      const baseline = me?.lastReadAt ?? me?.joinedAt ?? new Date();
      const unreadCount = await messageRepository.countUnread(
        String(conv._id),
        userId,
        baseline,
      );

      const other = conv.members.find((m) => userIdOf(m) !== String(userId));
      const otherUser = (other?.userId as any) as { _id: string; name: string; avatar?: string; role?: string };

      views.push({
        _id: String(conv._id),
        type: conv.type,
        restaurantId: String(conv.restaurantId),
        name: conv.name,
        createdBy: String(conv.createdBy),
        lastMessage: conv.lastMessage,
        memberCount: conv.members.length,
        otherMember:
          conv.type === "direct"
            ? {
                userId: String(other?.userId),
                name: otherUser?.name || "Thành viên",
                avatar: otherUser?.avatar || "",
                role: otherUser?.role || "",
              }
            : undefined,
        unreadCount,
        updatedAt: conv.updatedAt,
      });
    }

    return { code: 200, data: views, message: "Lấy danh sách hội thoại thành công" };
  }

  // [POST] /api/conversations — tạo direct (idempotent) hoặc group (chỉ manager/admin)
  async createConversation(
    actorUserId: string,
    actorRole: string,
    restaurantId: string,
    body: { type?: string; name?: string; memberIds?: string[] },
  ): Promise<ServiceResponse<IConversation>> {
    if (!ALLOWED_ROLES.includes(actorRole)) {
      return { code: 403, message: "Tài khoản không được phép nhắn tin nội bộ" };
    }
    if (!restaurantId) {
      return { code: 400, message: "Thiếu nhà hàng" };
    }
    const type = body.type;
    if (type !== "direct" && type !== "group") {
      return { code: 400, message: "Loại hội thoại không hợp lệ" };
    }

    const memberIds = (body.memberIds ?? [])
      .map((id) => String(id))
      .filter((id) => id && id !== String(actorUserId));

    if (type === "direct") {
      if (memberIds.length !== 1) {
        return { code: 400, message: "Hội thoại 1-1 chỉ có 1 người nhận" };
      }
    }

    // Validate người tham gia (nếu có): tồn tại, là nhân viên, cùng nhà hàng
    if (memberIds.length > 0) {
      const targetUsers = await DB_Connection.User.find({ _id: { $in: memberIds } })
        .select("name avatar role restaurantIds restaurant isActive")
        .exec();

      const foundIds = new Set(targetUsers.map((u: any) => String(u._id)));
      for (const id of memberIds) {
        const user = targetUsers.find((u: any) => String(u._id) === id);
        if (!user) {
          return { code: 400, message: "Có thành viên không tồn tại trong hệ thống" };
        }
        if (!isEmployeeUser(user) || !belongsToRestaurant(user, restaurantId)) {
          return { code: 403, message: "Thành viên không thuộc nhà hàng này hoặc không hợp lệ" };
        }
      }
    }

    if (type === "direct") {
      // Idempotent: conv direct đã tồn tại giữa 2 người → trả về conv cũ
      const existing = await conversationRepository.findDirect(
        restaurantId,
        actorUserId,
        memberIds[0] as string,
      );
      if (existing) {
        return { code: 200, data: existing, message: "Hội thoại đã tồn tại" };
      }

      const conversation = await conversationRepository.create({
        type: "direct",
        restaurantId: restaurantId as unknown as Types.ObjectId,
        createdBy: actorUserId as unknown as Types.ObjectId,
        members: [
          { userId: actorUserId as unknown as Types.ObjectId, role: "admin", joinedAt: new Date() },
          { userId: memberIds[0] as unknown as Types.ObjectId, role: "member", joinedAt: new Date() },
        ],
      });
      return { code: 201, data: conversation, message: "Tạo hội thoại thành công" };
    }

    // Group — Q3: chỉ manager/admin
    if (actorRole !== "manager" && actorRole !== "admin") {
      return { code: 403, message: "Chỉ quản lý/Admin được tạo hội thoại nhóm" };
    }
    if (!body.name?.trim()) {
      return { code: 400, message: "Hội thoại nhóm cần có tên" };
    }

    const conversation = await conversationRepository.create({
      type: "group",
      restaurantId: restaurantId as unknown as Types.ObjectId,
      name: body.name.trim(),
      createdBy: actorUserId as unknown as Types.ObjectId,
      members: [
        { userId: actorUserId as unknown as Types.ObjectId, role: "admin", joinedAt: new Date() },
        ...memberIds.map((id) => ({
          userId: id as unknown as Types.ObjectId,
          role: "member" as const,
          joinedAt: new Date(),
        })),
      ],
    });
    return { code: 201, data: conversation, message: "Tạo hội thoại nhóm thành công" };
  }

  // Kiểm tra user có phải member + thuộc tenant của conv không (dùng chung các route có :id)
  private async loadAndCheckMember(
    conversationId: string,
    userId: string,
  ): Promise<{ conv: IConversation | null; ok: boolean }> {
    const conv = await conversationRepository.findById(conversationId);
    if (!conv) return { conv: null, ok: false };
    return { conv, ok: !!memberOf(conv, userId) };
  }

  // [GET] /api/conversations/:id/messages — phân trang, mới nhất trước → đảo asc cho UI
  async getMessages(
    conversationId: string,
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<ServiceResponse<{ messages: any[]; total: number; page: number; limit: number }>> {
    const { conv, ok } = await this.loadAndCheckMember(conversationId, userId);
    if (!conv) return { code: 404, message: "Không tìm thấy hội thoại" };
    if (!ok) return { code: 403, message: "Bạn không phải thành viên hội thoại này" };

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const [descMessages, total] = await Promise.all([
      messageRepository.getMessages(conversationId, safeLimit, skip),
      messageRepository.countMessages(conversationId),
    ]);

    return {
      code: 200,
      data: {
        messages: descMessages.reverse(), // asc cho UI
        total,
        page: safePage,
        limit: safeLimit,
      },
      message: "Lấy tin nhắn thành công",
    };
  }

  // [POST] /api/conversations/:id/read — reset unread
  async markRead(
    conversationId: string,
    userId: string,
  ): Promise<ServiceResponse<IConversation | null>> {
    const { conv, ok } = await this.loadAndCheckMember(conversationId, userId);
    if (!conv) return { code: 404, message: "Không tìm thấy hội thoại" };
    if (!ok) return { code: 403, message: "Bạn không phải thành viên hội thoại này" };

    const updated = await conversationRepository.updateLastReadAt(
      conversationId,
      userId,
      new Date(),
    );

    // Đồng bộ multi-tab: báo tới user_<id> để các tab khác reset unread
    if (updated) {
      getIO().to(`user_${userId}`).emit("conversation_updated", {
        conversation: updated.toObject(),
        unreadCount: 0,
      });
    }

    return { code: 200, data: updated, message: "Đã đánh dấu đã đọc" };
  }
}

export default new ConversationService();