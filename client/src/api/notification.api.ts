import axiosClient from '@/utils/configClient';
import { type ApiResponse } from '@/types/api.type';
import type { INotification } from '@/types/noti.type';

import { API_ENDPOINTS } from '@/constants/index';

// Destruct nhóm API Notifications để code bên dưới ngắn gọn và đồng bộ
const { NOTIFICATIONS } = API_ENDPOINTS;

export const getMyNotifications = async (restaurantId: string, page = 1, limit = 20) => {
  const res = await axiosClient.get<any, ApiResponse<INotification[]>>(
    NOTIFICATIONS.GET_MY(restaurantId),
    { params: { page, limit } },
  );
  return res.data;
};

// Admin (chủ chuỗi): lấy toàn bộ thông báo các nhà hàng trong chuỗi, kèm tên nhà hàng.
export const getChainNotifications = async (page = 1, limit = 50) => {
  const res = await axiosClient.get<any, ApiResponse<INotification[]>>(
    NOTIFICATIONS.GET_CHAIN(),
    { params: { page, limit } },
  );
  return res.data;
};

export const markNotificationAsRead = async (id: string) => {
  // Thay thế chuỗi cứng bằng hàm cấu hình tập trung
  const res = await axiosClient.patch<any, ApiResponse<INotification>>(NOTIFICATIONS.MARK_READ(id));
  return res.data;
};

export const markAllNotificationsAsRead = async (restaurantId: string) => {
  // Thay thế chuỗi cứng bằng hàm cấu hình tập trung
  const res = await axiosClient.post<any, ApiResponse<null>>(
    NOTIFICATIONS.MARK_READ_ALL(restaurantId),
  );
  return res.data;
};
