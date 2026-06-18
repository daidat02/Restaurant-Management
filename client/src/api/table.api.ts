import type { ITable } from '@/types/table.type';
import { type ApiResponse } from './../types/api.type';
import axiosClient from '@/utils/configClient';

import { API_ENDPOINTS } from '@/constants/index';

// Destruct nhánh API Quản lý bàn (Tables) để code gọn gàng hơn
const { TABLES } = API_ENDPOINTS;

export const createTable = async (data: Partial<ITable>) => {
  const res = await axiosClient.post<any, ApiResponse<ITable>>(TABLES.CREATE, { tableData: data });
  return res.data;
};

export const getTablesByRestaurant = async (restaurantId: string) => {
  const res = await axiosClient.get<any, ApiResponse<ITable[]>>(
    TABLES.RESTAURANT_ALL(restaurantId),
  );
  return res.data;
};

export const getTableById = async (id: string) => {
  const res = await axiosClient.get<any, ApiResponse<ITable>>(TABLES.GET_BY_ID(id));
  return res.data;
};

export const updateTable = async (id: string, tableData: Partial<ITable>) => {
  const res = await axiosClient.put<any, ApiResponse<ITable>>(TABLES.GET_BY_ID(id), { tableData });
  return res.data;
};

export const deleteTable = async (id: string) => {
  const res = await axiosClient.delete<any, ApiResponse<any>>(TABLES.GET_BY_ID(id));
  return res.data;
};

export const updateTableStatus = async (id: string, status: string) => {
  const res = await axiosClient.patch<any, ApiResponse<ITable>>(TABLES.UPDATE_STATUS(id), {
    status,
  });
  return res.data;
};
