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
    return { success: true, message: res.message, user };
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

// Đăng ký chủ nhà hàng (role = admin) — tách khỏi form đăng ký khách
export const registerOwner = async (credentials: RegisterCredentials & { phone?: string }) => {
  try {
    await axiosClient.post(AUTH.REGISTER_OWNER, credentials);
    return { success: true, message: 'Owner registered successfully' };
  } catch (error: any) {
    return error;
  }
};

// Lấy profile mới nhất (kèm restaurantIds sau khi tạo nhà hàng) — dùng sau onboarding.
export const getProfileMe = async (): Promise<{ restaurantIds?: string[] } | null> => {
  const res = await axiosClient.get<any, ApiResponse<any>>(AUTH.PROFILE_ME);
  return res.data;
};

// Tạo user nội bộ (staff/manager) thuộc tenant đang xác thực — dùng trong wizard onboarding
export const createStaffUser = async (userData: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: 'staff' | 'manager';
}) => {
  const res = await axiosClient.post<any, ApiResponse<any>>(AUTH.ADMIN.CREATE, userData);
  return res.data;
};

// Cập nhật thông tin cá nhân của chính mình (Settings → Tab Tài khoản)
export const updateProfileMe = async (updateData: {
  name?: string;
  phone?: string;
  address?: string;
  avatar?: string;
  notificationEnabled?: boolean;
}) => {
  try {
    const res = await axiosClient.patch<any, ApiResponse<any>>(AUTH.UPDATE_ME, updateData);
    return { success: true, message: res.message, user: res.data };
  } catch (error: any) {
    const message = error?.response?.data?.message || 'Cập nhật thông tin thất bại!!!';
    return { success: false, message };
  }
};

// Đổi mật khẩu có xác thực mật khẩu hiện tại (Settings → Tab Tài khoản)
export const changePassword = async (currentPassword: string, newPassword: string) => {
  try {
    const res = await axiosClient.post<any, ApiResponse<any>>(AUTH.CHANGE_PASSWORD, {
      currentPassword,
      newPassword,
    });
    return { success: true, message: res.message };
  } catch (error: any) {
    const message = error?.response?.data?.message || 'Đổi mật khẩu thất bại!!!';
    return { success: false, message };
  }
};

// Yêu cầu đặt lại mật khẩu (quên mật khẩu) — trả thông báo chung, không rò email tồn tại.
export const forgotPassword = async (email: string) => {
  try {
    const res = await axiosClient.post<unknown, ApiResponse>(AUTH.FORGOT_PASSWORD, { email });
    return { success: true, message: res.message };
  } catch (error) {
    const err = error as { response?: { data?: { message?: string } } };
    const message = err?.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.';
    return { success: false, message };
  }
};

// Đặt lại mật khẩu bằng token từ email.
export const forgotPasswordReset = async (token: string, newPassword: string) => {
  try {
    const res = await axiosClient.post<unknown, ApiResponse>(AUTH.FORGOT_PASSWORD_RESET, {
      token,
      newPassword,
    });
    return { success: true, message: res.message };
  } catch (error) {
    const err = error as { response?: { data?: { message?: string } } };
    const message = err?.response?.data?.message || 'Đặt lại mật khẩu thất bại, vui lòng thử lại.';
    return { success: false, message };
  }
};

// Xác thực mã OTP hoàn tất đăng ký — thành công thì server trả tokens (auto-login), dispatch login.
export const verifyOtp = async (email: string, otp: string, dispatch: any) => {
  try {
    const res = await axiosClient.post<any, ApiResponse<any>>(AUTH.VERIFY_OTP, { email, otp });
    const user = res.data.user;
    const token = res.data.accessToken;
    if (user && token) {
      dispatch(login({ user, token }));
    }
    return { success: true, message: res.message, user };
  } catch (error: any) {
    return error;
  }
};

// Gửi lại mã OTP — server chặn nếu trong cooldown 60s (trả OTP_COOLDOWN).
export const resendOtp = async (email: string) => {
  try {
    const res = await axiosClient.post<unknown, ApiResponse>(AUTH.RESEND_OTP, { email });
    return { success: true, message: res.message };
  } catch (error) {
    const err = error as { response?: { data?: { message?: string } } };
    const message = err?.response?.data?.message || 'Gửi lại mã thất bại, vui lòng thử lại.';
    return { success: false, message };
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
