import axiosClient from '@/utils/configClient';
import { type ApiResponse } from './../types/api.type';
import type { IOrder, IOrderItem } from '@/types/order.type';

import { API_ENDPOINTS } from '@/constants/index';

// Destruct nhóm API Orders để quản lý tập trung và code ngắn gọn hơn
const { ORDERS } = API_ENDPOINTS;

export const createOrder = async (data: Partial<IOrder>) => {
  const res = await axiosClient.post<any, ApiResponse<IOrder>>(ORDERS.BASE, data);
  return res.data;
};

export const addItemIntoOrder = async (itemData: IOrderItem) => {
  const res = await axiosClient.post<any, ApiResponse<IOrder>>(ORDERS.ADD_ITEM, itemData);
  return res.data;
};

export const updateOrderItem = async (itemId: string, status: string) => {
  const res = await axiosClient.post<any, ApiResponse<IOrderItem>>(
    ORDERS.UPDATE_ITEM(itemId, status),
  );
  return res.data;
};

export const getDetailOrder = async (id: string) => {
  const res = await axiosClient.get<any, ApiResponse<IOrder>>(ORDERS.GET_BY_ID(id));
  return res.data;
};

export const getAllOrderByStatus = async (restaurantId: string, status: string) => {
  const res = await axiosClient.get<any, ApiResponse<IOrder[]>>(
    ORDERS.RESTAURANT_STATUS(restaurantId, status),
  );
  return res.data;
};

export const getAllOrderByRestaurant = async (restaurantId: string) => {
  const res = await axiosClient.get<any, ApiResponse<IOrder[]>>(
    ORDERS.RESTAURANT_ALL(restaurantId),
  );
  return res.data;
};

export const getActiveOrdersByRestaurant = async (restaurantId: string) => {
  const res = await axiosClient.get<any, ApiResponse<IOrder[]>>(
    ORDERS.RESTAURANT_ACTIVE(restaurantId),
  );
  return res.data;
};

export const updateOrder = async (id: string, orderData: Partial<IOrder>) => {
  const res = await axiosClient.put<any, ApiResponse<IOrder>>(ORDERS.GET_BY_ID(id), orderData);
  return res.data;
};

export const updateOrderStatus = async (id: string, status: string) => {
  const res = await axiosClient.put<any, ApiResponse<IOrder>>(ORDERS.UPDATE_STATUS(id), { status });
  return res.data;
};

export const getOrderByTableId = async (tableId: string) => {
  const res = await axiosClient.get<any, ApiResponse<IOrder>>(ORDERS.GET_BY_TABLE(tableId));
  return res.data;
};

export const getMyOrders = async () => {
  const res = await axiosClient.get<any, ApiResponse<IOrder[]>>(ORDERS.MY_ORDERS);
  console.log('res.data:', res.data);
  return res.data;
};

// Khách tại bàn gọi nhân viên (public — không cần token)
export const callStaffAtTable = async (payload: { tableId: string; restaurantId?: string }) => {
  const res = await axiosClient.post<any, ApiResponse<null>>(ORDERS.CALL_STAFF, payload);
  return res.data;
};

// Khách tại bàn yêu cầu thanh toán (public — không cần token)
export const requestPaymentAtTable = async (payload: {
  tableId: string;
  restaurantId?: string;
}) => {
  const res = await axiosClient.post<any, ApiResponse<null>>(ORDERS.REQUEST_PAYMENT, payload);
  return res.data;
};

// POS: Xoá món khỏi đơn (soft delete — giữ bản ghi kèm lý do) — DELETE /orders/:id/items/:itemId
export const removeOrderItem = async (orderId: string, itemId: string, reason?: string) => {
  const res = await axiosClient.delete<any, ApiResponse<IOrder>>(
    ORDERS.REMOVE_ITEM(orderId, itemId),
    { data: { reason } },
  );
  return res.data;
};

// POS: Sửa món trong đơn (quantity/price/note) — PATCH /orders/:id/items/:itemId
export const updateOrderItemDetail = async (
  orderId: string,
  itemId: string,
  data: { quantity?: number; price?: number; note?: string },
) => {
  const res = await axiosClient.patch<any, ApiResponse<IOrder>>(
    ORDERS.UPDATE_ITEM_DETAIL(orderId, itemId),
    data,
  );
  return res.data;
};

// POS: Chuyển đơn sang bàn khác — PUT /orders/:id/move-table
export const moveOrderToTableApi = async (orderId: string, targetTableId: string) => {
  const res = await axiosClient.put<any, ApiResponse<IOrder>>(ORDERS.MOVE_TABLE(orderId), {
    targetTableId,
  });
  return res.data;
};

// ==========================================
// QUẢN LÝ ĐƠN HÀNG (trang /orders/management) — server-side filter/search/sort/phân trang
// ==========================================
export interface OrderManagementStats {
  totalOrders: number;
  revenue: number;
  completedCount: number;
  cancelledCount: number;
}

export interface OrderManagementQuery {
  search?: string;
  orderType?: string;
  status?: string;
  /** yyyy-MM-dd */
  fromDate?: string;
  /** yyyy-MM-dd */
  toDate?: string;
  sortBy?: 'createdAt' | 'orderId' | 'totalAmount';
  sortDir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export const getManagementOrders = async (params: OrderManagementQuery) => {
  const res = await axiosClient.get<
    any,
    ApiResponse<IOrder[]> & { stats?: OrderManagementStats; total?: number }
  >(ORDERS.MANAGEMENT, { params });
  return {
    data: res.data ?? [],
    total: res.total ?? 0,
    stats: res.stats ?? { totalOrders: 0, revenue: 0, completedCount: 0, cancelledCount: 0 },
  };
};
