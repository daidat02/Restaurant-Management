import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  cancelSubscriptionPayos,
  createSubscriptionPayosUrl,
  createSubscriptionVnpayUrl,
  getMySubscriptions,
  getMyTransactions,
  getPricing,
  paySubscription,
} from '@/api/subscription.api';
import type {
  IPayosCreateUrlResult,
  IPricingConfig,
  ISubscriptionInfo,
  ITransaction,
  IVnpayCreateUrlResult,
} from '@/types/subscription.type';
import { socket } from '@/configs/socket.io';
import { useAuth } from './use-auth';

/** Kết quả thanh toán gói cước phát từ webhook/return qua socket. */
export interface ISubscriptionPaymentEvent {
  status: 'success' | 'cancelled';
  transactionId: string;
  data?: any;
}

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
  const [paymentEvent, setPaymentEvent] = useState<ISubscriptionPaymentEvent | null>(null);
  const [listeningTransactionId, setListeningTransactionId] = useState<string | null>(null);
  // Callback được gọi khi có kết quả thanh toán (do component truyền khi bắt đầu lắng nghe).
  const onResultRef = useRef<((ev: ISubscriptionPaymentEvent) => void) | null>(null);

  /** Bật lắng nghe kết quả thanh toán cho 1 transactionId (mở dialog/redirect thanh toán). */
  const listenPaymentResult = useCallback(
    (transactionId: string, onResult?: (ev: ISubscriptionPaymentEvent) => void) => {
      setPaymentEvent(null);
      onResultRef.current = onResult ?? null;
      setListeningTransactionId(transactionId);
    },
    [],
  );

  /** Tắt lắng nghe. */
  const stopListeningPaymentResult = useCallback(() => {
    setPaymentEvent(null);
    onResultRef.current = null;
    setListeningTransactionId(null);
  }, []);

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

  // Lắng nghe kết quả thanh toán gói cước từ webhook/return qua socket.
  useEffect(() => {
    if (!listeningTransactionId) return;

    const handlePayment = (payload: ISubscriptionPaymentEvent) => {
      setPaymentEvent(payload);
      if (payload.status === 'success') {
        toast.success('Thanh toán gói cước thành công — gói đã kích hoạt', {
          position: 'top-right',
        });
        void fetchSubscriptions();
        void fetchTransactions();
      } else {
        toast.error('Thanh toán gói cước bị hủy hoặc thất bại', { position: 'top-right' });
      }
      onResultRef.current?.(payload);
    };

    socket.emit('subscribe_subscription_payment', listeningTransactionId);
    socket.on('subscription_payment_event', handlePayment);

    return () => {
      socket.off('subscription_payment_event', handlePayment);
      socket.emit('unsubscribe_subscription_payment', listeningTransactionId);
    };
  }, [listeningTransactionId, fetchSubscriptions, fetchTransactions]);

  /**
   * Thanh toán / gia hạn mock. Sau khi thành công cập nhật lại danh sách + giao dịch.
   * Trả về { success, message, data } để màn hình hiển thị.
   */
  const pay = useCallback(
    async (restaurantId: string, cycleMonths: number, planId?: string) => {
      try {
        const result = await paySubscription(restaurantId, cycleMonths, planId);
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

  /**
   * Tạo link thanh toán gói cước bằng PayOS cho 1 nhà hàng.
   * Truyền transactionId → khởi tạo lại link cho giao dịch pending có sẵn.
   * Trả về { success, data } với checkoutUrl + qrCodeData để màn hình điều hướng/hiển thị.
   */
  const createPayosUrl = useCallback(
    async (
      restaurantId: string,
      cycleMonths: number,
      planId?: string,
      transactionId?: string,
    ): Promise<{ success: boolean; data: IPayosCreateUrlResult | null; message: string }> => {
      try {
        const data = await createSubscriptionPayosUrl(restaurantId, cycleMonths, planId, transactionId);
        return { success: true, data, message: 'Tạo link thanh toán thành công' };
      } catch (err) {
        const msg =
          (err as { message?: string })?.message || 'Không thể tạo link thanh toán PayOS, vui lòng thử lại';
        toast.error(msg, { position: 'top-right' });
        return { success: false, data: null, message: msg };
      }
    },
    [],
  );

  /** Huỷ đơn thanh toán PayOS đang chờ theo transactionId — cập nhật lại danh sách giao dịch. */
  const cancelPendingPayment = useCallback(
    async (transactionId: string): Promise<boolean> => {
      try {
        await cancelSubscriptionPayos(transactionId);
        toast.success('Đã huỷ đơn thanh toán đang chờ', { position: 'top-right' });
        await fetchTransactions();
        return true;
      } catch (err: any) {
        toast.error(err?.message || 'Không thể huỷ thanh toán, vui lòng thử lại', {
          position: 'top-right',
        });
        return false;
      }
    },
    [fetchTransactions],
  );

  /**
   * Tạo link thanh toán gói cước bằng VNPay cho 1 nhà hàng.
   * Trả về { success, data } với checkoutUrl để mở cổng VNPay.
   */
  const createVnpayUrl = useCallback(
    async (
      restaurantId: string,
      cycleMonths: number,
      planId?: string,
    ): Promise<{ success: boolean; data: IVnpayCreateUrlResult | null; message: string }> => {
      try {
        const data = await createSubscriptionVnpayUrl(restaurantId, cycleMonths, planId);
        return { success: true, data, message: 'Tạo link thanh toán VNPay thành công' };
      } catch (err) {
        const msg =
          (err as { message?: string })?.message || 'Không thể tạo link thanh toán VNPay, vui lòng thử lại';
        toast.error(msg, { position: 'top-right' });
        return { success: false, data: null, message: msg };
      }
    },
    [],
  );

  return {
    subscriptions,
    transactions,
    pricing,
    isLoading,
    isOwner,
    paymentEvent,
    listeningTransactionId,
    listenPaymentResult,
    stopListeningPaymentResult,
    fetchSubscriptions,
    fetchTransactions,
    fetchPricing,
    refresh,
    pay,
    createPayosUrl,
    cancelPendingPayment,
    createVnpayUrl,
    getStateForRestaurant,
  };
};
