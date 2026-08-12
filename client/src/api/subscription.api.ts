import axiosClient from '@/utils/configClient';
import type { ApiResponse } from '@/types/api.type';
import type { IPricingConfig, IPayosCreateUrlResult, ISubscriptionInfo, ITransaction, IVnpayCreateUrlResult } from '@/types/subscription.type';
import type { IRestaurant } from '@/types/restaurant.type';
import { API_ENDPOINTS } from '@/constants/index';

const SUB = API_ENDPOINTS.SUBSCRIPTION;

/** Danh sách nhà hàng của chủ kèm trạng thái thuê bao. */
export const getMySubscriptions = async (): Promise<ISubscriptionInfo[]> => {
  const res = await axiosClient.get<any, ApiResponse<ISubscriptionInfo[]>>(SUB.ME);
  return res.data ?? [];
};

/** Thanh toán / gia hạn mock cho 1 nhà hàng (tuỳ chọn theo gói đã chọn). */
export const paySubscription = async (restaurantId: string, cycleMonths: number, planId?: string) => {
  const res = await axiosClient.post<any, ApiResponse<{ restaurant: IRestaurant; transaction: ITransaction; paidUntil: string }>>(
    SUB.PAY,
    { restaurantId, cycleMonths, planId },
  );
  return res;
};

/** Tạo link thanh toán gói cước bằng PayOS — trả checkoutUrl + qrCode. */
export const createSubscriptionPayosUrl = async (
  restaurantId: string,
  cycleMonths: number,
  planId?: string,
): Promise<IPayosCreateUrlResult> => {
  const res = await axiosClient.post<any, ApiResponse<IPayosCreateUrlResult>>(SUB.PAYOS_CREATE_URL, {
    restaurantId,
    cycleMonths,
    planId,
  });
  return res.data;
};

/** Tạo link thanh toán gói cước bằng VNPay — trả checkoutUrl. */
export const createSubscriptionVnpayUrl = async (
  restaurantId: string,
  cycleMonths: number,
  planId?: string,
): Promise<IVnpayCreateUrlResult> => {
  const res = await axiosClient.post<any, ApiResponse<IVnpayCreateUrlResult>>(SUB.VNPAY_CREATE_URL, {
    restaurantId,
    cycleMonths,
    planId,
  });
  return res.data;
};

/** Giá chu kỳ (đọc PricingConfig — mọi user có token). */
export const getPricing = async (): Promise<IPricingConfig | null> => {
  const res = await axiosClient.get<any, ApiResponse<IPricingConfig>>(SUB.PRICING);
  return res.data ?? null;
};

/** Lịch sử giao dịch của chủ. */
export const getMyTransactions = async (): Promise<ITransaction[]> => {
  const res = await axiosClient.get<any, ApiResponse<ITransaction[]>>(SUB.TRANSACTIONS);
  return res.data ?? [];
};
