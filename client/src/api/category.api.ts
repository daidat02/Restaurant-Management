import axiosClient from '@/utils/configClient';
import { type ApiResponse } from '@/types/api.type';
// Import type của bạn vào đây (điều chỉnh lại đường dẫn file type nếu cần)
import type { IMenuCategory, IMenuItem } from '@/types/category.type';

import { API_ENDPOINTS } from '@/constants/index';

// Destruct nhóm API Menu để code bên dưới ngắn gọn hơn
const { MENU } = API_ENDPOINTS;

// ==========================================
// MENU CATEGORY API
// ==========================================

export const createMenuCat = async (data: Partial<IMenuCategory>) => {
  const res = await axiosClient.post<any, ApiResponse<IMenuCategory>>(MENU.CATEGORY.CREATE, data);
  return res.data;
};

export const updateMenuCat = async (id: string, data: Partial<IMenuCategory>) => {
  const res = await axiosClient.put<any, ApiResponse<IMenuCategory>>(
    MENU.CATEGORY.UPDATE(id),
    data,
  );
  return res.data;
};

export const findAllMenuCat = async (restaurantId: string) => {
  const res = await axiosClient.get<any, ApiResponse<IMenuCategory[]>>(
    MENU.CATEGORY.FIND_ALL(restaurantId),
  );
  return res.data;
};

// ==========================================
// MENU ITEM API
// ==========================================

export const createMenuItem = async (data: Partial<IMenuItem>) => {
  const res = await axiosClient.post<any, ApiResponse<IMenuItem>>(MENU.ITEM.CREATE, data);
  return res.data;
};

export const updateMenuItem = async (id: string, data: Partial<IMenuItem>) => {
  const res = await axiosClient.put<any, ApiResponse<IMenuItem>>(MENU.ITEM.UPDATE(id), data);
  return res.data;
};

export const updateAvailability = async (id: string, isAvailable: boolean) => {
  const res = await axiosClient.put<any, ApiResponse<IMenuItem>>(
    MENU.ITEM.UPDATE_AVAILABILITY(id),
    { isAvailable },
  );
  return res.data;
};

export const getAllItems = async (restaurantId: string) => {
  const res = await axiosClient.get<any, ApiResponse<IMenuItem[]>>(MENU.ITEM.GET_ALL(restaurantId));
  return res.data;
};

export const getItemsByCategory = async (catId: string) => {
  const res = await axiosClient.get<any, ApiResponse<IMenuItem[]>>(
    MENU.ITEM.GET_BY_CATEGORY(catId),
  );
  return res.data;
};

export const getAvailableItems = async (restaurantId: string) => {
  const res = await axiosClient.get<any, ApiResponse<IMenuItem[]>>(
    MENU.ITEM.GET_AVAILABLE(restaurantId),
  );
  return res.data;
};

export const getTopBestSellers = async (restaurantId: string) => {
  const res = await axiosClient.get<any, ApiResponse<IMenuItem[]>>(
    MENU.ITEM.GET_BESTSELLERS(restaurantId),
  );
  return res.data;
};

export const getItemById = async (id: string) => {
  const res = await axiosClient.get<any, ApiResponse<IMenuItem>>(MENU.ITEM.GET_BY_ID(id));
  return res.data;
};
