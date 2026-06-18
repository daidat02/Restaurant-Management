import axiosClient from '@/utils/configClient';
import { type ApiResponse } from '@/types/api.type';
import type {
  IOverviewStats,
  IRevenueHourly,
  IOrderChannel,
  IAnalyticQueryParams,
  IRevenueBranch,
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
  const res = await axiosClient.get<any, ApiResponse<IOrderChannel[]>>(ANALYTIC.ORDER_CHANNELS, {
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
