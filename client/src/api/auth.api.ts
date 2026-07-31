import { login, logout, refreshToken, setCurrentRestaurantId } from '@/redux/slices/authSlice';
import { API_BASE_URL } from '@/constants';
import axiosClient from '@/utils/configClient';
import { type ApiResponse } from '@/types/api.type';
import type { RegisterCredentials, UserCredentials } from '@/types/user.type';
import { API_ENDPOINTS } from '@/constants/index';

const AUTH = API_ENDPOINTS.AUTH;

export const loginUser = async (credentials: UserCredentials, dispatch: any) => {
  try {
    // Truyền thẳng IUser vào <T>, TS tự hiểu 'data' chính là IUser
    const res = await axiosClient.post<any, ApiResponse<any>>(AUTH.LOGIN, credentials);

    const user = res.data.user; // Gợi ý mượt mà
    const token = res.data.accessToken!;
    dispatch(login({ user, token }));
    return { success: true, message: res.message };
  } catch (error: any) {
    return error;
  }
};

export const registerUser = async (credentials: RegisterCredentials) => {
  try {
    await axiosClient.post(AUTH.REGISTER, credentials);
    return { success: true, message: 'User registered successfully' };
  } catch (error: any) {
    return error;
  }
};

// Đổi nhà hàng đang làm việc (tenant switcher): server cấp access token mới, cập nhật ngay vào Redux
export const switchTenant = async (restaurantId: string, dispatch: any) => {
  try {
    const res = await axiosClient.post<any, ApiResponse<any>>(AUTH.SWITCH_TENANT, { restaurantId });
    const newAccessToken = res.data?.accessToken;
    if (newAccessToken) {
      dispatch(refreshToken(newAccessToken));
    }
    dispatch(setCurrentRestaurantId(restaurantId));
    return { success: true, message: res.message };
  } catch (error: any) {
    return error;
  }
};
