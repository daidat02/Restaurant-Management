import { type ApiResponse } from './../types/api.type';
import type { IOrder, IOrderItem } from '@/types/order.type';
import kdsClient from '@/configs/kdsClient';
import { API_ENDPOINTS } from '@/constants/index';

const { ORDERS } = API_ENDPOINTS;

// Các API dành riêng cho màn hình bếp (KDS), dùng token nhà bếp thay vì token đăng nhập

export const getKdsActiveOrders = async (restaurantId: string) => {
  // Endpoint KDS riêng: trả đơn còn món chưa được phục vụ (kể cả đơn served/paid thanh toán trước)
  const res = await kdsClient.get<any, ApiResponse<IOrder[]>>(
    ORDERS.RESTAURANT_KDS(restaurantId),
  );
  return res.data;
};

export const updateKdsItemStatus = async (itemId: string, status: string) => {
  const res = await kdsClient.post<any, ApiResponse<IOrderItem>>(ORDERS.UPDATE_ITEM(itemId, status));
  return res.data;
};
