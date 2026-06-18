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
  return res.data;
};
