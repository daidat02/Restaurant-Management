import type { IUser } from './user.type';

export type ConversationType = 'direct' | 'group';

/** Member trong một conversation (mapping từ ConversationMemberSchema server). */
export interface IMember {
  userId: IUser | string;
  role: 'admin' | 'member';
  joinedAt: string;
  lastReadAt?: string;
}

/** Metadata tin cuối (denormalized trên Conversation). */
export interface ILastMessage {
  text: string;
  senderId: string;
  createdAt: string;
}

export interface IConversation {
  _id: string;
  type: ConversationType;
  restaurantId: string;
  members: IMember[];
  name?: string;
  createdBy: string;
  lastMessage?: ILastMessage;
  createdAt?: string;
  updatedAt?: string;
}

export interface IMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

/** ConversationView trả từ GET /api/conversations (service đã reshape). */
export interface IConversationView {
  _id: string;
  type: ConversationType;
  restaurantId: string;
  /** Tên nhà hàng của hội thoại (badge cho admin). */
  restaurantName?: string;
  name?: string;
  createdBy: string;
  members?: IMember[];
  lastMessage?: ILastMessage;
  memberCount: number;
  otherMember?: {
    userId: string;
    name: string;
    avatar?: string;
    role?: string;
  };
  unreadCount: number;
  updatedAt?: string;
}

/** Response phân trang tin nhắn. */
export interface IMessagePage {
  messages: IMessage[];
  total: number;
  page: number;
  limit: number;
}