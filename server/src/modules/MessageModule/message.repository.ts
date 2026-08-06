import type { Types } from "mongoose";
import type { IMessage } from "../../models/Schema/MessageSchema.js";
import DB_Connection from "../../models/DB_Connection.js";

class MessageRepository {
  async create(payload: Partial<IMessage>): Promise<IMessage> {
    const message = new DB_Connection.Message(payload);
    return message.save();
  }

  // Phân trang lịch sử — sort mới nhất trước, controller/service đảo ngược về asc cho UI
  async getMessages(
    conversationId: string,
    limit: number,
    skip: number,
  ): Promise<IMessage[]> {
    return DB_Connection.Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async countMessages(conversationId: string): Promise<number> {
    return DB_Connection.Message.countDocuments({ conversationId });
  }

  // Số tin chưa đọc của user: tin của người khác, sau baseline (lastReadAt ?? joinedAt)
  async countUnread(
    conversationId: string,
    userId: string,
    baseline: Date,
  ): Promise<number> {
    return DB_Connection.Message.countDocuments({
      conversationId,
      senderId: { $ne: userId },
      createdAt: { $gt: baseline },
    });
  }
}

export default new MessageRepository();