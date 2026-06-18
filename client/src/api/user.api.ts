import { type IUser } from '@/types/user.type';
import { type ApiResponse } from './../types/api.type';
import axiosClient from '@/utils/configClient';

import { API_ENDPOINTS } from '@/constants/index';

// Destruct nhánh API Auth để phục vụ cho các thông tin Profile và Quản trị User
const { AUTH } = API_ENDPOINTS;

export const getProfileMe = async () => {
  const res = await axiosClient.get<any, ApiResponse<IUser>>(AUTH.PROFILE_ME);
  return res.data;
};

export const getProfileUserById = async (_id: string) => {
  const res = await axiosClient.get<any, ApiResponse<IUser>>(AUTH.PROFILE_BY_ID(_id));
  return res.data;
};

export const getAllCustomers = async () => {
  const res = await axiosClient.get<any, ApiResponse<IUser[]>>(AUTH.ADMIN.CUSTOMERS);
  return res.data;
};

export const getUsersWithFilter = async (roles: string[], restaurantId?: string) => {
  const res = await axiosClient.get<any, ApiResponse<IUser[]>>(AUTH.ADMIN.STAFF, {
    params: {
      roles: roles,
      restaurantId,
    },
    // 🌟 SỬA TẠI ĐÂY: Ép Axios không tự ý thêm cặp dấu ngoặc vuông [] vào mảng
    paramsSerializer: {
      indexes: null, // Biến roles[] thành roles trên URL
    },
  });
  return res.data;
};

export const deleteUser = async (_id: string) => {
  const res = await axiosClient.delete<any, ApiResponse<any>>(AUTH.ADMIN.DELETE(_id));
  return res.data;
};

export const updateUser = async (_id: string, updateData: Partial<IUser>) => {
  const res = await axiosClient.put<any, ApiResponse<IUser>>(AUTH.ADMIN.UPDATE(_id), updateData);
  return res.data;
};

export const updateMe = async (updateData: Partial<IUser>) => {
  const res = await axiosClient.put<any, ApiResponse<IUser>>(AUTH.ADMIN.UPDATE_ME);
  return res.data;
};
