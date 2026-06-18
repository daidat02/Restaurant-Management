import { type ApiResponse } from './../types/api.type';
import axiosClient from '@/utils/configClient';
import { API_ENDPOINTS } from '@/constants/index';
import type { IBankAccountConfig, ISetting, IThirdPartyIntegration } from '@/types/setting.type';

// Destruct nhánh API Quản lý Setting
const { SETTING } = API_ENDPOINTS;

// ============================================================================
// API METHODS (Các hàm gọi HTTP Request)
// ============================================================================

/**
 * 1. Khởi tạo một bản ghi cấu hình cài đặt mới (Quyền: Admin)
 */
export const createSetting = async (data: Partial<ISetting>) => {
  const res = await axiosClient.post<any, ApiResponse<ISetting>>(SETTING.CREATE, data);
  return res.data;
};

/**
 * 2. Tải nhanh hoặc tự động khởi tạo cấu hình dựa trên scope và targetId khi mở giao diện cài đặt
 * API chiến lược phục vụ luồng load data cho SettingModal khi manager click mở tab
 */
export const getOrCreateSetting = async (
  scope: 'admin' | 'restaurant',
  model: 'User' | 'Restaurant',
  targetId: string,
) => {
  const res = await axiosClient.get<any, ApiResponse<ISetting>>(
    // Sử dụng template string động bọc đúng 3 tham số theo cấu trúc Router mới của bạn
    `${SETTING.GET_OR_CREATE}/${scope}/${model}/${targetId}`,
  );
  return res.data;
};

/**
 * 3. Lấy thông tin cấu hình chi tiết theo ID bản ghi setting
 */
export const getSettingById = async (id: string) => {
  const res = await axiosClient.get<any, ApiResponse<ISetting>>(SETTING.BASE(id));
  return res.data;
};

/**
 * 4. Cập nhật toàn bộ hoặc một phân hệ cấu hình cài đặt (Khi bấm nút Lưu ở các Tab form)
 * Lưu ý bổ sung trường 'reason' vào data nếu lưu phân hệ nhạy cảm liên quan đến tài chính để ghi Audit Log ngầm
 */
export const updateSetting = async (
  id: string,
  settingData: Partial<ISetting> & { reason?: string },
) => {
  const res = await axiosClient.put<any, ApiResponse<ISetting>>(SETTING.BASE(id), settingData);
  return res.data;
};

/**
 * 5. Cập nhật nhanh loại hình phương thức thanh toán mặc định (None / Bank Transfer / PayOS)
 */
export const updatePaymentMethodType = async (
  id: string,
  paymentMethodType: 'none' | 'bank_transfer' | 'payos',
  payload: Partial<ISetting>,
) => {
  const res = await axiosClient.patch<any, ApiResponse<ISetting>>(SETTING.UPDATE_PAYMENT(id), {
    paymentMethodType,
    payload,
  });
  return res.data;
};

/**
 * 6. Xóa cấu hình cài đặt khỏi hệ thống (Quyền: Admin)
 */
export const deleteSetting = async (id: string) => {
  const res = await axiosClient.delete<any, ApiResponse<any>>(SETTING.BASE(id));
  return res.data;
};
