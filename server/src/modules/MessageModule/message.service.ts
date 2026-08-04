import type { Types } from "mongoose";
import { getIO } from "../../configs/socketsConfig.js";
import type { ServiceResponse } from "../../shared/type.js";
import type { IConversation } from "../../models/Schema/ConversationSchema.js";
import type { IMessage } from "../../models/Schema/MessageSchema.js";
import conversationRepository from "./conversation.repository.js";
import messageRepository from "./message.repository.js";

// Q1: chỉ staff/manager/admin nhắn tin nội bộ
const ALLOWED_ROLES = ["staff", "manager", "admin"];

const memberOf = (conv: IConversation, userId: string): boolean =>
  conv.members.some((m) => {
    // populate('members.userId', ...) biến userId thành document User → đọc _id
    const id = (m.userId as any)?._id ?? m.userId;
    return String(id) === String(userId);
  });

class MessageService {
  // [POST] /api/conversations/:id/messages — gửi tin (persist + cập nhật lastMessage)
  async sendMessage(
    conversationId: string,
    senderId: string,
    senderRole: string,
    text: string,
    // Mặc định true (HTTP): emit tới cả phòng. Khi gửi qua socket ta truyền false
    // để socket handler tự ack người gửi + emit tới các socket khác (tránh trùng tin).
    emitNewMessage: boolean = true,
  ): Promise<ServiceResponse<{ message: IMessage; conversation: IConversation | null }>> {
    if (!ALLOWED_ROLES.includes(senderRole)) {
      return { code: 403, message: "Tài khoản không được phép nhắn tin nội bộ" };
    }
    const content = (text ?? "").trim();
    if (!content) {
      return { code: 400, message: "Nội dung tin nhắn không được để trống" };
    }

    const conversation = await conversationRepository.findById(conversationId);
    if (!conversation) return { code: 404, message: "Không tìm thấy hội thoại" };
    if (!memberOf(conversation, senderId)) {
      return { code: 403, message: "Bạn không phải thành viên hội thoại này" };
    }

    const message = await messageRepository.create({
      conversationId: conversationId as unknown as Types.ObjectId,
      senderId: senderId as unknown as Types.ObjectId,
      text: content,
    });

    const lastMessage = {
      text: content,
      senderId: senderId as unknown as Types.ObjectId,
      createdAt: message.createdAt ?? new Date(),
    };
    const updatedConversation = await conversationRepository.updateLastMessage(
      conversationId,
      lastMessage,
    );

    // Realtime: emit new_message tới room conversation_<id> (mọi member đang mở conv)
    const io = getIO();
    if (emitNewMessage) {
      io.to(`conversation_${conversationId}`).emit("new_message", { message });
    }

    // conversation_updated tới từng member (trừ sender) — cập nhật lastMessage + unreadCount
    if (updatedConversation) {
      const convPlain = updatedConversation.toObject();
      for (const member of updatedConversation.members) {
        const memberId = String(member.userId);
        if (memberId === senderId) continue;
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
    }

    return {
      code: 201,
      data: { message, conversation: updatedConversation },
      message: "Đã gửi tin nhắn",
    };
  }
}

export default new MessageService();