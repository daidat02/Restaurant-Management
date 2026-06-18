import axiosClient from '@/utils/configClient';
import { type ApiResponse } from './../types/api.type';
// Bạn cần tạo và import type IPayment tương ứng với model ở backend
import type { IPayment } from '@/types/payment.type';

import { API_ENDPOINTS } from '@/constants/index';

// Destruct nhóm API Payments để đồng bộ cấu trúc và làm gọn code bên dưới
const { PAYMENTS } = API_ENDPOINTS;

export const getPaymentById = async (paymentId: string) => {
  const res = await axiosClient.get<any, ApiResponse<IPayment>>(PAYMENTS.GET_BY_ID(paymentId));
  return res.data;
};

export const initiatePayment = async (orderId: string, method: string) => {
  const res = await axiosClient.post<any, ApiResponse<IPayment>>(PAYMENTS.INITIATE, {
    orderId,
    method,
  });
  return res.data;
};

export const updatePaymentMethod = async (paymentId: string, method: string) => {
  const res = await axiosClient.post<any, ApiResponse<IPayment>>(
    PAYMENTS.UPDATE_METHOD(paymentId, method),
  );
  return res.data;
};

export const changePaymentStatus = async (paymentId: string, status: string) => {
  // Route backend là '/status' không có params trên URL, data gửi qua body
  const res = await axiosClient.patch<any, ApiResponse<IPayment>>(PAYMENTS.UPDATE_STATUS, {
    paymentId: paymentId,
    status: status,
  });
  return res.data;
};

export const ewalletCreateUrlPayment = async (orderId: string, data?: any) => {
  // Đính kèm orderId vào URL params theo định dạng tương ứng
  const res = await axiosClient.post<any, ApiResponse<string | any>>(
    PAYMENTS.EWALLET(orderId),
    data,
  );
  return res.data;
};

export const paymentReturn = async (data: any) => {
  // Dữ liệu callback/return từ VNPay
  const res = await axiosClient.post<any, ApiResponse<any>>(PAYMENTS.RETURN_VNPAY, data);
  return res.data;
};

export const createPayOsUrl = async (orderId: string) => {
  // Tạo link thanh toán qua PayOS (Cổng banking)
  const res = await axiosClient.post<any, ApiResponse<any>>(PAYMENTS.CREATE_PAYOS(orderId));
  return res.data;
};

export const cancelPayOsUrl = async (orderId: string) => {
  // Hủy link thanh toán PayOS
  const res = await axiosClient.post<any, ApiResponse<any>>(PAYMENTS.CANCEL_PAYOS(orderId));
  return res.data;
};
interface ICheckPayOSPayload {
  clientId: string;
  apiKey: string;
  checksumKey: string;
}
export const checkConectPayOS = async (payload: ICheckPayOSPayload) => {
  const res = await axiosClient.post<any, ApiResponse<any>>(PAYMENTS.CHECK_CONNECT, { payload });
  return res.data;
};
