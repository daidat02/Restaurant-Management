import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  getMySubscriptions,
  getMyTransactions,
  getPricing,
  paySubscription,
} from '@/api/subscription.api';
import type { IPricingConfig, ISubscriptionInfo, ITransaction } from '@/types/subscription.type';
import { useAuth } from './use-auth';

/**
 * Hook dữ liệu subscription của chủ nhà hàng (role admin).
 * Cung cấp: danh sách nhà hàng + trạng thái thuê bao, giá chu kỳ, lịch sử giao dịch, thanh toán mock.
 */
export const useSubscription = () => {
  const { user } = useAuth();
  const isOwner = user?.role === 'admin';

  const [subscriptions, setSubscriptions] = useState<ISubscriptionInfo[]>([]);
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [pricing, setPricing] = useState<IPricingConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    if (!isOwner) return;
    setIsLoading(true);
    try {
      const items = await getMySubscriptions();
      setSubscriptions(items);
    } catch (err: any) {
      console.error('[useSubscription] Lỗi lấy trạng thái thuê bao:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isOwner]);

  const fetchTransactions = useCallback(async () => {
    if (!isOwner) return;
    try {
      const items = await getMyTransactions();
      setTransactions(items);
    } catch (err: any) {
      console.error('[useSubscription] Lỗi lấy lịch sử giao dịch:', err);
    }
  }, [isOwner]);

  const fetchPricing = useCallback(async () => {
    try {
      const config = await getPricing();
      if (config) setPricing(config);
    } catch (err: any) {
      console.error('[useSubscription] Lỗi lấy giá chu kỳ:', err);
    }
  }, []);

  const refresh = useCallback(() => {
    void fetchSubscriptions();
    void fetchTransactions();
    void fetchPricing();
  }, [fetchSubscriptions, fetchTransactions, fetchPricing]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Thanh toán / gia hạn mock. Sau khi thành công cập nhật lại danh sách + giao dịch.
   * Trả về { success, message, data } để màn hình hiển thị.
   */
  const pay = useCallback(
    async (restaurantId: string, cycleMonths: number) => {
      try {
        const result = await paySubscription(restaurantId, cycleMonths);
        await fetchSubscriptions();
        await fetchTransactions();
        return { success: true, message: result.message, data: result.data };
      } catch (err: any) {
        const msg = err?.message || 'Thanh toán thất bại, vui lòng thử lại';
        toast.error(msg, { position: 'top-right' });
        return { success: false, message: msg, data: null };
      }
    },
    [fetchSubscriptions, fetchTransactions],
  );

  /** Trạng thái thuê bao của 1 nhà hàng cụ thể (đang làm việc). */
  const getStateForRestaurant = useCallback(
    (restaurantId: string): ISubscriptionInfo | undefined =>
      subscriptions.find((s) => String(s._id) === String(restaurantId)),
    [subscriptions],
  );

  return {
    subscriptions,
    transactions,
    pricing,
    isLoading,
    isOwner,
    fetchSubscriptions,
    fetchTransactions,
    fetchPricing,
    refresh,
    pay,
    getStateForRestaurant,
  };
};
