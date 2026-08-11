import type { FilterQuery, UpdateQuery, Types } from "mongoose";
import type { IConversation, IConversationMember } from "../../models/Schema/ConversationSchema.js";
import DB_Connection from "../../models/DB_Connection.js";

class ConversationRepository {
  // Danh sách hội thoại của 1 user trong các nhà hàng họ thuộc (kèm thông tin member)
  async findConversationsOfUser(
    userId: string,
    restaurantIds: string[],
  ): Promise<IConversation[]> {
    return DB_Connection.Conversation.find({
      restaurantId: { $in: restaurantIds },
      "members.userId": userId,
    })
      .populate("members.userId", "name avatar role")
      .populate("restaurantId", "name")
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .exec();
  }

  async findById(conversationId: string): Promise<IConversation | null> {
    return DB_Connection.Conversation.findById(conversationId)
      .populate("members.userId", "name avatar role")
      .exec();
  }

  // Tìm hội thoại direct 1-1 giữa đúng 2 user trong cùng nhà hàng (idempotent)
  async findDirect(
    restaurantId: string,
    userA: string,
    userB: string,
  ): Promise<IConversation | null> {
    return DB_Connection.Conversation.findOne({
      type: "direct",
      restaurantId,
      members: { $size: 2 },
      "members.userId": { $all: [userA, userB] },
    }).exec();
  }

  // Tìm hội thoại direct 1-1 giữa đúng cặp 2 user (bất kể nhà hàng) — dedupe cross-chain cho admin.
  async findDirectByPair(userA: string, userB: string): Promise<IConversation | null> {
    return DB_Connection.Conversation.findOne({
      type: "direct",
      members: { $size: 2 },
      "members.userId": { $all: [userA, userB] },
    }).exec();
  }

  async create(payload: Partial<IConversation>): Promise<IConversation> {
    const conversation = new DB_Connection.Conversation(payload);
    return conversation.save();
  }

  async updateLastMessage(
    conversationId: string,
    lastMessage: NonNullable<IConversation["lastMessage"]>,
  ): Promise<IConversation | null> {
    return DB_Connection.Conversation.findByIdAndUpdate(
      conversationId,
      { lastMessage, lastMessageAt: lastMessage.createdAt },
      { new: true },
    ).exec();
  }

  async updateLastReadAt(
    conversationId: string,
    userId: string,
    lastReadAt: Date,
  ): Promise<IConversation | null> {
    await DB_Connection.Conversation.updateOne(
      { _id: conversationId, "members.userId": userId },
      { $set: { "members.$.lastReadAt": lastReadAt } as UpdateQuery<IConversation> },
    ).exec();
    return this.findById(conversationId);
  }

  // Chỉ cập nhật lastReadAt của 1 member (không refetch) — dùng khi tự đánh dấu đã đọc
  async touchLastReadAt(
    conversationId: string,
    userId: string,
    lastReadAt: Date,
  ): Promise<void> {
    await DB_Connection.Conversation.updateOne(
      { _id: conversationId, "members.userId": userId },
      { $set: { "members.$.lastReadAt": lastReadAt } as UpdateQuery<IConversation> },
    ).exec();
  }

  async addMembers(
    conversationId: string,
    newMembers: IConversationMember[],
  ): Promise<IConversation | null> {
    return DB_Connection.Conversation.findByIdAndUpdate(
      conversationId,
      { $push: { members: { $each: newMembers } } },
      { new: true },
    )
      .populate("members.userId", "name avatar role")
      .exec();
  }

  async removeMember(
    conversationId: string,
    userId: string,
  ): Promise<IConversation | null> {
    return DB_Connection.Conversation.findByIdAndUpdate(
      conversationId,
      { $pull: { members: { userId: userId as unknown as Types.ObjectId } } },
      { new: true },
    )
      .populate("members.userId", "name avatar role")
      .exec();
  }
}

export default new ConversationRepository();