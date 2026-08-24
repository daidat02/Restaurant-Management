import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type {
  IOverviewStats,
  IRevenueHourly,
  IOrderChannel,
  IAnalyticQueryParams,
  IRevenueBranch,
  ITopItem,
} from '@/types/analytic.type';

// Import các hàm lẻ từ file API
import {
  getOverviewStats,
  getRevenueHourly,
  getOrderChannels,
  getRevenueBranches,
  getTopItems,
} from '@/api/analytic.api';

import { useGlobalLoading } from '@/components/LoadingOverlay';

export const useAnalytic = () => {
  const { showLoading, hideLoading } = useGlobalLoading();

  // Quản lý các state dữ liệu riêng biệt để dễ destructure ở Component
  const [overviewStats, setOverviewStats] = useState<IOverviewStats | null>(null);
  const [revenueHourly, setRevenueHourly] = useState<IRevenueHourly[]>([]);
  const [orderChannels, setOrderChannels] = useState<IOrderChannel[]>([]);
  const [revenueBranch, setRevenueBranch] = useState<IRevenueBranch[]>([]);
  const [topItems, setTopItems] = useState<ITopItem[]>([]);

  // State trạng thái chung cho cả cụm dashboard
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Hàm duy nhất kích hoạt các API song song phục vụ trang HOME (mọi gói):
   * overview + revenue-hourly + top-items (không gate) + revenue-branches khi có restaurantIds.
   * LƯU Ý: KHÔNG gọi order-channels ở đây — endpoint này gate `advanced_report`,
   * gọi sẽ 403 với gói Free/Basic làm vỡ cả cụm Promise.all.
   */
  const fetchDashboardData = useCallback(
    async (params: IAnalyticQueryParams) => {
      setIsLoading(true);
      showLoading();
      setError(null);

      try {
        const isAdminChain = Array.isArray(params.restaurantIds) && params.restaurantIds.length > 0;
        const [overviewRes, hourlyRes, topItemsRes, branchRes] = await Promise.all([
          getOverviewStats(params),
          getRevenueHourly(params),
          getTopItems({ ...params, limit: 5 }),
          isAdminChain ? getRevenueBranches(params) : Promise.resolve([]),
        ]);

        setOverviewStats(overviewRes ?? null);
        setRevenueHourly(hourlyRes ?? []);
        setTopItems(topItemsRes ?? []);
        if (isAdminChain) setRevenueBranch(branchRes ?? []);
      } catch (err: any) {
        const errMsg = err.message || 'Đã xảy ra lỗi khi tải dữ liệu báo cáo';
        setError(errMsg);
        toast.error(errMsg, { position: 'top-right' });
      } finally {
        setIsLoading(false);
        hideLoading(); // Tắt loading overlay
      }
    },
    [showLoading, hideLoading],
  );

  /** Kênh đặt đơn (Advanced — gate advanced_report): gọi riêng cho trang báo cáo nâng cao. */
  const fetchOrderChannels = useCallback(
    async (params: IAnalyticQueryParams) => {
      try {
        const channelsRes = await getOrderChannels(params);
        setOrderChannels(channelsRes ?? []);
      } catch (err: any) {
        const errMsg = err.message || 'Không tải được dữ liệu kênh đặt đơn';
        toast.error(errMsg, { position: 'top-right' });
      }
    },
    [],
  );

  const fetchRevenueBranches = useCallback(
    async (params: IAnalyticQueryParams) => {
      setIsLoading(true);
      showLoading();
      setError(null);

      try {
        const branchRevenueRes = await getRevenueBranches(params);
        setRevenueBranch(branchRevenueRes);
      } catch (err: any) {
        const errMsg = err.message || 'Đã xảy ra lỗi khi tải dữ liệu báo cáo';
        setError(errMsg);
        toast.error(errMsg, { position: 'top-right' });
      } finally {
        setIsLoading(false);
        hideLoading();
      }
    },
    [showLoading, hideLoading],
  );

  return {
    overviewStats,
    revenueHourly,
    orderChannels,
    revenueBranch,
    topItems,
    isLoading,
    error,
    fetchDashboardData,
    fetchOrderChannels,
    fetchRevenueBranches,
  };
};
