import type { IRestaurant } from '@/types/restaurant.type';
import axiosClient from '@/utils/configClient';
import type { ApiResponse } from '@/types/api.type';

import { API_ENDPOINTS } from '@/constants/index';

// Destruct nhánh API Nhà hàng (Restaurants) để code gọn gàng, đồng bộ
const { RESTAURANTS } = API_ENDPOINTS;

export const getRestaurants = async () => {
  const res = await axiosClient.get<any, ApiResponse<IRestaurant[]>>(RESTAURANTS.BASE);
  console.log(RESTAURANTS.BASE);
  return res.data;
};

export const getRestaurantById = async (id: string) => {
  const res = await axiosClient.get<any, ApiResponse<IRestaurant>>(RESTAURANTS.GET_BY_ID(id));
  return res.data;
};

export const createRestaurant = async (restaurantData: Partial<IRestaurant>) => {
  const res = await axiosClient.post<any, ApiResponse<IRestaurant>>(
    RESTAURANTS.BASE,
    restaurantData,
  );
  return res.data;
};

export const updateRestaurant = async (
  id: string,
  restaurantData: Partial<Omit<IRestaurant, '_id' | 'createdAt'>>,
) => {
  const res = await axiosClient.put<any, ApiResponse<IRestaurant>>(
    RESTAURANTS.UPDATE(id),
    restaurantData,
  );
  return res.data;
};

export const deleteRestaurant = async (id: string) => {
  // Tận dụng hàm GET_BY_ID(id) vì có chung cấu trúc URL tương đối `/restaurants/:id`
  const res = await axiosClient.delete<any, ApiResponse<null>>(RESTAURANTS.GET_BY_ID(id));
  return res.data;
};
