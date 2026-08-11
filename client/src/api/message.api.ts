import axiosClient from '@/utils/configClient';
import { type ApiResponse } from '@/types/api.type';
import {
  type IConversation,
  type IConversationView,
  type IMessage,
  type IMessagePage,
} from '@/types/message.type';

import { API_ENDPOINTS } from '@/constants/index';

const { CONVERSATIONS } = API_ENDPOINTS;

// Danh sách hội thoại của user (server trả ConversationView kèm unreadCount)
export const getConversations = async (): Promise<IConversationView[]> => {
  const res = await axiosClient.get<unknown, ApiResponse<IConversationView[]>>(CONVERSATIONS.BASE);
  return res.data;
};

// Tìm hội thoại 1-1 sẵn có với 1 user (server trả null nếu chưa có → client mới POST tạo)
export const getDirectConversation = async (userId: string): Promise<IConversation | null> => {
  const res = await axiosClient.get<unknown, ApiResponse<IConversation | null>>(
    CONVERSATIONS.DIRECT(userId),
  );
  return res.data;
};

// Tạo hội thoại direct/group. Group chỉ manager/admin. Body: { type, name?, memberIds[], restaurantId? }
export const createConversation = async (
  payload: {
    type: 'direct' | 'group';
    name?: string;
    memberIds?: string[];
    /** Tenant hiện tại (để nhóm nội bộ rơi đúng nhà hàng đang chọn). */
    restaurantId?: string;
  },
): Promise<IConversation> => {
  const res = await axiosClient.post<unknown, ApiResponse<IConversation>>(
    CONVERSATIONS.BASE,
    payload,
  );
  return res.data;
};

// Phân trang lịch sử tin nhắn (server trả về asc cho UI)
export const getMessages = async (
  conversationId: string,
  page = 1,
  limit = 20,
): Promise<IMessagePage> => {
  const res = await axiosClient.get<unknown, ApiResponse<IMessagePage>>(
    CONVERSATIONS.MESSAGES(conversationId),
    { params: { page, limit } },
  );
  return res.data;
};

// Gửi tin nhắn (server persist + emit realtime)
export const sendMessage = async (
  conversationId: string,
  text: string,
): Promise<{ message: IMessage; conversation: IConversation }> => {
  const res = await axiosClient.post<unknown, ApiResponse<{ message: IMessage; conversation: IConversation }>>(
    CONVERSATIONS.MESSAGES(conversationId),
    { text },
  );
  return res.data;
};

// Đánh dấu đã đọc (reset unread, đồng bộ multi-tab qua socket)
export const markConversationRead = async (conversationId: string): Promise<IConversation> => {
  const res = await axiosClient.post<unknown, ApiResponse<IConversation>>(
    CONVERSATIONS.READ(conversationId),
  );
  return res.data;
};

// Thêm thành viên vào nhóm
export const addConversationMembers = async (
  conversationId: string,
  memberIds: string[],
): Promise<IConversation> => {
  const res = await axiosClient.post<unknown, ApiResponse<IConversation>>(
    CONVERSATIONS.MEMBERS(conversationId),
    { memberIds },
  );
  return res.data;
};

// Gỡ thành viên khỏi nhóm
export const removeConversationMember = async (
  conversationId: string,
  userId: string,
): Promise<IConversation> => {
  const res = await axiosClient.delete<unknown, ApiResponse<IConversation>>(
    CONVERSATIONS.MEMBER(conversationId, userId),
  );
  return res.data;
};