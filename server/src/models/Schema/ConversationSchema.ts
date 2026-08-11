import { Schema, model, Document, Types } from 'mongoose';
const ObjectId = Schema.Types.ObjectId;

export interface IConversationMember {
  userId: Types.ObjectId;
  role: 'admin' | 'member';
  joinedAt: Date;
  lastReadAt?: Date;
}

export interface IConversation extends Document {
  type: 'direct' | 'group';
  restaurantId: Types.ObjectId;
  members: IConversationMember[];
  name?: string; // Bắt buộc nếu type === 'group'
  createdBy: Types.ObjectId;
  lastMessage?: {
    text: string;
    senderId: Types.ObjectId;
    createdAt: Date;
  };
  /** Thời điểm tin nhắn cuối (dùng sort danh sách hội thoại, mới nhất lên đầu). */
  lastMessageAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const ConversationMemberSchema = new Schema<IConversationMember>(
  {
    userId: { type: ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    lastReadAt: { type: Date },
  },
  { _id: false },
);

const ConversationSchema = new Schema<IConversation>(
  {
    type: { type: String, enum: ['direct', 'group'], required: true },
    restaurantId: { type: ObjectId, ref: 'Restaurant', required: true, index: true },
    members: { type: [ConversationMemberSchema], required: true },
    name: { type: String },
    createdBy: { type: ObjectId, ref: 'User', required: true },
    lastMessage: {
      type: {
        text: { type: String, required: true },
        senderId: { type: ObjectId, ref: 'User', required: true },
        createdAt: { type: Date, required: true },
      },
      _id: false,
    },
    lastMessageAt: { type: Date, index: true },
  },
  { timestamps: true },
);

// Direct chat chỉ nên có 1 hội thoại giữa cùng cặp người dùng trong cùng nhà hàng.
// Unique index: restaurantId + members.userId (sắp xếp ổn định) — dùng trong service để idempotent.
ConversationSchema.index({ restaurantId: 1, 'members.userId': 1 });

export const Conversation = model<IConversation>('Conversation', ConversationSchema);