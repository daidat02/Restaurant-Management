import axiosClient from '@/utils/configClient';
import { type ApiResponse } from '@/types/api.type';
import type {
  IOverviewStats,
  IRevenueHourly,
  IOrderChannelV2,
  IAnalyticQueryParams,
  IRevenueBranch,
  ITopItem,
  IChannelTrendDay,
  IHourMatrixCell,
} from '@/types/analytic.type';

import { API_ENDPOINTS } from '@/constants/index';

const { ANALYTIC } = API_ENDPOINTS;

export const getOverviewStats = async (params: IAnalyticQueryParams) => {
  const res = await axiosClient.get<any, ApiResponse<IOverviewStats>>(ANALYTIC.OVERVIEW, {
    params, // axios sẽ tự chuyển thành ?restaurantId=xxx&startDate=xxx&endDate=xxx
  });
  return res.data;
};

export const getRevenueHourly = async (params: IAnalyticQueryParams) => {
  const res = await axiosClient.get<any, ApiResponse<IRevenueHourly[]>>(ANALYTIC.REVENUE_HOURLY, {
    params,
  });
  return res.data;
};

export const getOrderChannels = async (params: IAnalyticQueryParams) => {
  // Endpoint advanced trả đủ revenue + revenuePercentage (server tự tính %)
  const res = await axiosClient.get<any, ApiResponse<IOrderChannelV2[]>>(ANALYTIC.ORDER_CHANNELS, {
    params,
  });
  return res.data;
};

export const getRevenueChannels = async (params: IAnalyticQueryParams) => {
  const res = await axiosClient.get<any, ApiResponse<IRevenueBranch[]>>(ANALYTIC.REVENUE_CHANNELS, {
    params,
  });
  return res.data;
};

// Doanh thu từng chi nhánh của admin (chủ chuỗi) — lọc theo restaurantIds.
export const getRevenueBranches = async (params: IAnalyticQueryParams) => {
  const res = await axiosClient.get<any, ApiResponse<IRevenueBranch[]>>(ANALYTIC.REVENUE_BRANCHES, {
    params,
  });
  return res.data;
};

// Top món bán chạy (Home — mọi gói).
export const getTopItems = async (
  params: IAnalyticQueryParams & { limit?: number },
): Promise<ITopItem[]> => {
  const res = await axiosClient.get<any, ApiResponse<ITopItem[]>>(ANALYTIC.TOP_ITEMS, {
    params,
  });
  return res.data ?? [];
};

// Xu hướng doanh thu theo ngày × kênh (Advanced).
export const getChannelTrend = async (params: IAnalyticQueryParams): Promise<IChannelTrendDay[]> => {
  const res = await axiosClient.get<any, ApiResponse<IChannelTrendDay[]>>(ANALYTIC.CHANNEL_TREND, {
    params,
  });
  return res.data ?? [];
};

// Ma trận thứ × giờ cho heatmap (Advanced).
export const getHourMatrix = async (params: IAnalyticQueryParams): Promise<IHourMatrixCell[]> => {
  const res = await axiosClient.get<any, ApiResponse<IHourMatrixCell[]>>(ANALYTIC.HOUR_MATRIX, {
    params,
  });
  return res.data ?? [];
};
