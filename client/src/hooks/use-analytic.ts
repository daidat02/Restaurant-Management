import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type {
  IOverviewStats,
  IRevenueHourly,
  IOrderChannel,
  IAnalyticQueryParams,
  IRevenueBranch,
} from '@/types/analytic.type';

// Import 3 hàm lẻ từ file API của bạn
import {
  getOverviewStats,
  getRevenueHourly,
  getOrderChannels,
  getRevenueChannels,
} from '@/api/analytic.api';

import { useGlobalLoading } from '@/components/LoadingOverlay';

export const useAnalytic = () => {
  const { showLoading, hideLoading } = useGlobalLoading();

  // Quản lý các state dữ liệu riêng biệt để dễ destructure ở Component
  const [overviewStats, setOverviewStats] = useState<IOverviewStats | null>(null);
  const [revenueHourly, setRevenueHourly] = useState<IRevenueHourly[]>([]);
  const [orderChannels, setOrderChannels] = useState<IOrderChannel[]>([]);
  const [revenueBranch, setRevenueBranch] = useState<IRevenueBranch[]>([]);

  // State trạng thái chung cho cả cụm dashboard
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Hàm duy nhất kích hoạt gọi cả 3 API song song phục vụ cho Dashboard
   */
  const fetchDashboardData = useCallback(
    async (params: IAnalyticQueryParams) => {
      setIsLoading(true);
      showLoading();
      setError(null);

      try {
        // Gom 3 hàm lẻ chạy song song cùng lúc tại đây
        const [overviewRes, hourlyRes, channelsRes] = await Promise.all([
          getOverviewStats(params),
          getRevenueHourly(params),
          getOrderChannels(params),
        ]);

        // Cập nhật dữ liệu vào các state tương ứng
        setOverviewStats(overviewRes ?? null);
        setRevenueHourly(hourlyRes ?? []);
        setOrderChannels(channelsRes ?? []);
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

  const fetchRevenueChannels = useCallback(
    async (params: IAnalyticQueryParams) => {
      setIsLoading(true);
      showLoading();
      setError(null);

      try {
        // Gom 3 hàm lẻ chạy song song cùng lúc tại đây
        const channelRevenueRes = await getRevenueChannels(params);
        setRevenueBranch(channelRevenueRes);
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

  return {
    overviewStats,
    revenueHourly,
    orderChannels,
    revenueBranch,
    isLoading,
    error,
    fetchDashboardData, // Chỉ cần export hàm gộp này ra cho Dashboard dùng
    fetchRevenueChannels,
  };
};
