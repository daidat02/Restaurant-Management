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
  /** Tên nhà hàng của hội thoại (badge cho admin ở tab "Tất cả"). */
  restaurantName?: string;
  name: string | undefined;
  createdBy: string;
  members?: {
    userId: string;
    role: "admin" | "member";
    joinedAt: string;
    lastReadAt?: string;
    /** Thông tin user được populate (dùng cho panel quản lý thành viên). */
    name?: string;
    avatar?: string;
    userRole?: string;
  }[];
  lastMessage: IConversation["lastMessage"];
  lastMessageAt: Date | undefined;
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

// Reshape conversation (đã populate) về payload chuẩn cho socket `conversation_updated`.
// Tránh gửi ObjectId/populated doc thô làm hỏng state phía client.
const toSocketPayload = (conv: IConversation) => {
  const restaurantId = (conv.restaurantId as any)?._id ?? conv.restaurantId;
  return {
    ...conv.toObject(),
    _id: String(conv._id),
    createdBy: String(conv.createdBy),
    restaurantId: String(restaurantId),
    restaurantName: (conv.restaurantId as any)?.name ?? "",
    lastMessageAt: conv.lastMessageAt,
    members: conv.members.map((m) => {
      const memberUser = m.userId as unknown as
        | { name?: string; avatar?: string; role?: string }
        | undefined;
      const member: Record<string, unknown> = {
        userId: userIdOf(m),
        role: m.role,
        joinedAt: m.joinedAt,
      };
      if (memberUser?.name) member.name = memberUser.name;
      if (memberUser?.avatar) member.avatar = memberUser.avatar;
      if (memberUser?.role) member.userRole = memberUser.role;
      if (m.lastReadAt) member.lastReadAt = m.lastReadAt;
      return member;
    }),
  };
};

const isEmployeeUser = (user: any): boolean =>
  user && user.isActive !== false && ALLOWED_ROLES.includes(user?.role);

const belongsToRestaurant = (user: any, restaurantId: string): boolean => {
  const ids = new Set([
    ...(user?.restaurantIds ?? []).map((id: any) => String(id)),
    ...(user?.restaurant ? [String(user.restaurant)] : []),
  ]);
  return ids.has(String(restaurantId));
};

// Nhà hàng chính của 1 user: phần tử đầu tiên của restaurantIds, fallback field legacy `restaurant`.
const primaryRestaurantOf = (user: any): string | null => {
  const ids = [
    ...(user?.restaurantIds ?? []).map((id: any) => String(id)),
    ...(user?.restaurant ? [String(user.restaurant)] : []),
  ];
  return ids.length ? ids[0] : null;
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
      const restaurantId = (conv.restaurantId as any)?._id ?? conv.restaurantId;

      views.push({
        _id: String(conv._id),
        type: conv.type,
        restaurantId: String(restaurantId),
        restaurantName: (conv.restaurantId as any)?.name ?? "",
        name: conv.name,
        createdBy: String(conv.createdBy),
        members: conv.members.map((m) => {
      const memberUser = m.userId as unknown as
        | { name?: string; avatar?: string; role?: string }
        | undefined;
      const member: {
        userId: string;
        role: "admin" | "member";
        joinedAt: string;
        lastReadAt?: string;
        name?: string;
        avatar?: string;
        userRole?: string;
      } = {
        userId: userIdOf(m),
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      };
      if (memberUser?.name) member.name = memberUser.name;
      if (memberUser?.avatar) member.avatar = memberUser.avatar;
      if (memberUser?.role) member.userRole = memberUser.role;
      if (m.lastReadAt) member.lastReadAt = m.lastReadAt.toISOString();
      return member;
    }),
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        memberCount: conv.members.length,
        otherMember:
          conv.type === "direct"
            ? {
                userId: other ? userIdOf(other) : "",
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

    // Validate người tham gia (nếu có): tồn tại, là nhân viên.
    // - Manager/Staff: phải cùng nhà hàng với tenant đang chọn.
    // - Admin (chủ chuỗi): được phép 1-1 chéo nhà hàng → bỏ check belongsToRestaurant.
    let directTargetUser: any = null;
    if (memberIds.length > 0) {
      const targetUsers = await DB_Connection.User.find({ _id: { $in: memberIds } })
        .select("name avatar role restaurantIds restaurant isActive")
        .exec();

      for (const id of memberIds) {
        const user = targetUsers.find((u: any) => String(u._id) === id);
        if (!user) {
          return { code: 400, message: "Có thành viên không tồn tại trong hệ thống" };
        }
        if (!isEmployeeUser(user)) {
          return { code: 403, message: "Thành viên không hợp lệ" };
        }
        if (actorRole !== "admin" && !belongsToRestaurant(user, restaurantId)) {
          return { code: 403, message: "Thành viên không thuộc nhà hàng này" };
        }
        if (type === "direct") directTargetUser = user;
      }
    }

    if (type === "direct") {
      const targetUserId = memberIds[0] as string;
      // Admin: dedupe theo cặp user (bất kể nhà hàng) + restaurantId = nhà hàng chính của đối phương
      // để hội thoại cross-chain 1-1 xuất hiện đúng tenant của đối phương.
      if (actorRole === "admin") {
        const existing = await conversationRepository.findDirectByPair(
          actorUserId,
          targetUserId,
        );
        if (existing) {
          return { code: 200, data: existing, message: "Hội thoại đã tồn tại" };
        }
        const targetRestaurantId = primaryRestaurantOf(directTargetUser) ?? restaurantId;
        const conversation = await conversationRepository.create({
          type: "direct",
          restaurantId: targetRestaurantId as unknown as Types.ObjectId,
          createdBy: actorUserId as unknown as Types.ObjectId,
          lastMessageAt: new Date(),
          members: [
            { userId: actorUserId as unknown as Types.ObjectId, role: "admin", joinedAt: new Date() },
            { userId: targetUserId as unknown as Types.ObjectId, role: "member", joinedAt: new Date() },
          ],
        });
        return { code: 201, data: conversation, message: "Tạo hội thoại thành công" };
      }

      // Manager/Staff: giữ nguyên — cùng nhà hàng, dedupe theo restaurantId.
      const existing = await conversationRepository.findDirect(
        restaurantId,
        actorUserId,
        targetUserId,
      );
      if (existing) {
        return { code: 200, data: existing, message: "Hội thoại đã tồn tại" };
      }

      const conversation = await conversationRepository.create({
        type: "direct",
        restaurantId: restaurantId as unknown as Types.ObjectId,
        createdBy: actorUserId as unknown as Types.ObjectId,
        lastMessageAt: new Date(),
        members: [
          { userId: actorUserId as unknown as Types.ObjectId, role: "admin", joinedAt: new Date() },
          { userId: targetUserId as unknown as Types.ObjectId, role: "member", joinedAt: new Date() },
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
      lastMessageAt: new Date(),
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

  // [GET] /api/conversations/direct/:userId — tìm hội thoại 1-1 sẵn có (null nếu chưa tạo)
  async getDirectConversation(
    actorUserId: string,
    actorRole: string,
    targetUserId: string,
    restaurantId: string,
  ): Promise<ServiceResponse<IConversation | null>> {
    if (!ALLOWED_ROLES.includes(actorRole)) {
      return { code: 403, message: "Tài khoản không được phép nhắn tin nội bộ" };
    }
    const targetId = String(targetUserId ?? "");
    if (!targetId) {
      return { code: 400, message: "Thiếu thông tin người nhận" };
    }
    if (targetId === String(actorUserId)) {
      return { code: 400, message: "Không thể nhắn tin với chính mình" };
    }

    const targetUser = await DB_Connection.User.findById(targetId)
      .select("name avatar role restaurantIds restaurant isActive")
      .exec();
    if (!targetUser) {
      return { code: 400, message: "Người nhận không tồn tại trong hệ thống" };
    }
    if (!isEmployeeUser(targetUser)) {
      return { code: 403, message: "Người nhận không hợp lệ" };
    }
    if (actorRole !== "admin" && !belongsToRestaurant(targetUser, restaurantId)) {
      return { code: 403, message: "Người nhận không thuộc nhà hàng này" };
    }

    // Admin: tìm theo cặp user (bất kể nhà hàng) — khớp logic createConversation.
    // Manager/Staff: chỉ tìm trong nhà hàng đang chọn.
    const existing =
      actorRole === "admin"
        ? await conversationRepository.findDirectByPair(actorUserId, targetId)
        : await conversationRepository.findDirect(restaurantId, actorUserId, targetId);

    return {
      code: 200,
      data: existing ?? null,
      message: existing ? "Đã có hội thoại 1-1" : "Chưa có hội thoại 1-1",
    };
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
        conversation: toSocketPayload(updated),
        unreadCount: 0,
      });
    }

    return { code: 200, data: updated, message: "Đã đánh dấu đã đọc" };
  }

  // [POST] /api/conversations/:id/members — thêm member vào group (chỉ creator)
  async addMember(
    conversationId: string,
    actorUserId: string,
    body: { memberIds: string[] },
  ): Promise<ServiceResponse<IConversation>> {
    const { conv, ok } = await this.loadAndCheckMember(conversationId, actorUserId);
    if (!conv) return { code: 404, message: "Không tìm thấy hội thoại" };
    if (!ok) return { code: 403, message: "Bạn không phải thành viên hội thoại này" };

    const actorMember = memberOf(conv, actorUserId);
    if (!actorMember || actorMember.role !== "admin") {
      return { code: 403, message: "Chỉ người tạo nhóm mới được thêm thành viên" };
    }
    if (conv.type !== "group") {
      return { code: 400, message: "Chỉ hội thoại nhóm mới được thêm thành viên" };
    }

    const newMemberIds = (body.memberIds ?? [])
      .map((id) => String(id))
      .filter((id) => id && id !== String(actorUserId));

    if (newMemberIds.length === 0) {
      return { code: 400, message: "Cần chọn ít nhất 1 thành viên để thêm" };
    }

    // Validate: tồn tại, là nhân viên, cùng nhà hàng với group
    const targetUsers = await DB_Connection.User.find({ _id: { $in: newMemberIds } })
      .select("name avatar role restaurantIds restaurant isActive")
      .exec();

    for (const id of newMemberIds) {
      const user = targetUsers.find((u: any) => String(u._id) === id);
      if (!user) {
        return { code: 400, message: "Có thành viên không tồn tại trong hệ thống" };
      }
      if (!isEmployeeUser(user) || !belongsToRestaurant(user, String(conv.restaurantId))) {
        return { code: 403, message: "Thành viên không thuộc nhà hàng của nhóm này" };
      }
    }

    // Kiểm tra trùng
    const existingMemberIds = new Set(conv.members.map((m) => userIdOf(m)));
    const duplicateIds = newMemberIds.filter((id) => existingMemberIds.has(id));
    if (duplicateIds.length > 0) {
      return { code: 400, message: "Một số thành viên đã có trong nhóm" };
    }

    const newMembers = newMemberIds.map((id) => ({
      userId: id as unknown as Types.ObjectId,
      role: "member" as const,
      joinedAt: new Date(),
    }));

    const updated = await conversationRepository.addMembers(conversationId, newMembers);
    if (!updated) return { code: 500, message: "Lỗi khi thêm thành viên" };

    // Realtime: thông báo tới tất cả member (kể cả người thêm)
    const io = getIO();
    const convPlain = toSocketPayload(updated);
    for (const member of updated.members) {
      const memberId = userIdOf(member);
      const baseline = member.lastReadAt ?? member.joinedAt ?? new Date();
      const unreadCount = await messageRepository.countUnread(
        conversationId,
        memberId,
        baseline,
      );
      io.to(`user_${memberId}`).emit("conversation_updated", {
        conversation: convPlain,
        unreadCount,
      });
    }

    return { code: 200, data: updated, message: "Đã thêm thành viên" };
  }

  // [DELETE] /api/conversations/:id/members/:userId — gỡ member khỏi group (chỉ creator)
  async removeMember(
    conversationId: string,
    actorUserId: string,
    targetUserId: string,
  ): Promise<ServiceResponse<IConversation>> {
    const { conv, ok } = await this.loadAndCheckMember(conversationId, actorUserId);
    if (!conv) return { code: 404, message: "Không tìm thấy hội thoại" };
    if (!ok) return { code: 403, message: "Bạn không phải thành viên hội thoại này" };

    const actorMember = memberOf(conv, actorUserId);
    if (!actorMember || actorMember.role !== "admin") {
      return { code: 403, message: "Chỉ người tạo nhóm mới được gỡ thành viên" };
    }
    if (conv.type !== "group") {
      return { code: 400, message: "Chỉ hội thoại nhóm mới được gỡ thành viên" };
    }
    if (String(targetUserId) === String(actorUserId)) {
      return { code: 400, message: "Không thể gỡ chính mình khỏi nhóm" };
    }

    const updated = await conversationRepository.removeMember(conversationId, targetUserId);
    if (!updated) return { code: 500, message: "Lỗi khi gỡ thành viên" };

    // Realtime: thông báo tới remaining members
    const io = getIO();
    const convPlain = toSocketPayload(updated);
    for (const member of updated.members) {
      const memberId = userIdOf(member);
      const baseline = member.lastReadAt ?? member.joinedAt ?? new Date();
      const unreadCount = await messageRepository.countUnread(
        conversationId,
        memberId,
        baseline,
      );
      io.to(`user_${memberId}`).emit("conversation_updated", {
        conversation: convPlain,
        unreadCount,
      });
    }

    return { code: 200, data: updated, message: "Đã gỡ thành viên" };
  }
}

export default new ConversationService();