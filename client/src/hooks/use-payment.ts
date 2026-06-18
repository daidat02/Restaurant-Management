import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

// Import Types
import type { IPayment } from '@/types/payment.type';

// Import API
import {
  initiatePayment,
  changePaymentStatus,
  ewalletCreateUrlPayment,
  paymentReturn,
  getPaymentById,
  createPayOsUrl,
  cancelPayOsUrl,
  updatePaymentMethod,
} from '@/api/payment.api';

import { useGlobalLoading } from '@/components/LoadingOverlay';
import { socket } from '@/configs/socket.io';

export const usePayment = () => {
  const { showLoading, hideLoading } = useGlobalLoading();

  // State quản lý dữ liệu
  const [currentPayment, setCurrentPayment] = useState<IPayment | null>(null);

  // State quản lý UI
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [paymentSocketResult, setPaymentSocketResult] = useState<any | null>(null);
  const [listeningPaymentId, setListeningPaymetId] = useState<string | null>(null);

  useEffect(() => {
    // Nếu không có orderId nào được chỉ định để nghe, thì không làm gì cả
    if (!listeningPaymentId) return;

    console.log(`[Socket] Bắt đầu vào phòng payment_${listeningPaymentId}`);
    socket.emit('subscribe_payment', listeningPaymentId);

    // Hàm xử lý khi webhook báo thành công
    const handlePaymentSuccess = (payload: any) => {
      console.log('[Socket] Nhận kết quả thành công:', payload);
      setPaymentSocketResult({ success: true, data: payload });
    };
    // Hàm xử lý khi webhook báo thất bại/hủy
    const handlePaymentFailed = (payload: any) => {
      console.log('[Socket] Nhận kết quả thất bại:', payload);
      setPaymentSocketResult({ success: false, data: payload });
      toast.error('Giao dịch bị huỷ hoặc thất bại!', { position: 'top-right' });
    };

    // Lắng nghe sự kiện
    socket.on('payment_success', handlePaymentSuccess);
    socket.on('payment_failed', handlePaymentFailed);

    // CLEANUP: Tự động rời phòng khi đóng UI hoặc chuyển sang lắng nghe đơn khác
    return () => {
      socket.off('payment_success', handlePaymentSuccess);
      socket.off('payment_failed', handlePaymentFailed);
      socket.emit('unsubscribe_payment', listeningPaymentId);
    };
  }, [listeningPaymentId]);

  // Hàm để UI Component chủ động bật/tắt việc lắng nghe Socket
  const startListeningSocket = useCallback((paymentId: string) => {
    setPaymentSocketResult(null);
    setListeningPaymetId(paymentId);
  }, []);

  const stopListeningSocket = useCallback(() => {
    setPaymentSocketResult(null);
    setListeningPaymetId(null);
  }, []);

  // ==========================================
  // MUTATION METHODS (CREATE, UPDATE, PROCESS)
  // ==========================================

  const fetchPaymentById = useCallback(async (paymentId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getPaymentById(paymentId);
      if (result) {
        setCurrentPayment(result);
        return result;
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải chi tiết thanh toán');
      toast.error(err.message || 'Đã xảy ra lỗi khi tải chi tiết thanh toán', {
        position: 'top-right',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startPayment = useCallback(
    async (orderId: string, method: string) => {
      showLoading('Đang khởi tạo thanh toán...');
      setError(null);
      try {
        const result = await initiatePayment(orderId, method);
        if (result) {
          setCurrentPayment(result);
          toast.success('Khởi tạo thanh toán thành công', { position: 'top-right' });
          return result;
        }
      } catch (err: any) {
        setError(err.message || 'Đã xảy ra lỗi khi khởi tạo thanh toán');
        toast.error(err.message || err || 'Đã xảy ra lỗi khi khởi tạo thanh toán', {
          position: 'top-right',
        });
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading],
  );

  const handleUpdatePaymentMethod = useCallback(
    async (paymentId: string, method: string) => {
      showLoading('Đang cập nhật phương thức thanh toán...');
      setError(null);
      try {
        const updatedPayment = await updatePaymentMethod(paymentId, method);
        return updatedPayment;
      } catch (err: any) {
        setError(err.message || 'Đã xảy ra lỗi khi cập nhật trạng thái');
        toast.warning(err.message || 'Đã xảy ra lỗi khi cập nhật trạng thái', {
          position: 'top-right',
        });
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading, currentPayment],
  );

  const updatePaymentStatus = useCallback(
    async (paymentId: string, status: string) => {
      showLoading('Đang cập nhật phương thức thanh toán...');
      setError(null);
      try {
        const updatedPayment = await changePaymentStatus(paymentId, status);
        if (updatedPayment) {
          // Cập nhật lại state nếu ID trùng khớp
          if (currentPayment?._id === paymentId) {
            setCurrentPayment((prev) => (prev ? { ...prev, ...updatedPayment } : updatedPayment));
          }
          toast.success('Cập nhật trạng thái thành công', { position: 'top-right' });
          return updatedPayment;
        }
      } catch (err: any) {
        setError(err.message || 'Đã xảy ra lỗi khi cập nhật trạng thái');
        toast.warning(err.message || 'Đã xảy ra lỗi khi cập nhật trạng thái', {
          position: 'top-right',
        });
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading, currentPayment],
  );

  const createEwalletUrl = useCallback(
    async (orderId: string, data?: any) => {
      showLoading('Đang tạo liên kết thanh toán...');
      setError(null);
      try {
        const result = await ewalletCreateUrlPayment(orderId, data);
        if (result) {
          toast.success('Tạo liên kết thanh toán thành công', { position: 'top-right' });
          return result; // Thường trả về URL string để redirect
        }
      } catch (err: any) {
        setError(err.message || 'Đã xảy ra lỗi khi tạo liên kết thanh toán');
        toast.error(err.message || err || 'Đã xảy ra lỗi khi tạo liên kết thanh toán', {
          position: 'top-right',
        });
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading],
  );

  const processPaymentReturn = useCallback(
    async (data: any) => {
      showLoading('Đang xử lý kết quả giao dịch...');
      setError(null);
      try {
        const result = await paymentReturn(data);
        if (result) {
          toast.success('Xử lý giao dịch thành công', { position: 'top-right' });
          return result;
        }
      } catch (err: any) {
        setError(err.message || 'Đã xảy ra lỗi khi xử lý giao dịch');
        toast.error(err.message || err || 'Đã xảy ra lỗi khi xử lý giao dịch', {
          position: 'top-right',
        });
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading],
  );

  const createPaymentPayOsUrl = async (orderId: string) => {
    showLoading('Đang xử lý kết quả giao dịch...');
    setError(null);
    try {
      const result = await createPayOsUrl(orderId);
      if (result) {
        return result;
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi xử lý giao dịch');
      toast.error(err.message || err || 'Đã xảy ra lỗi khi xử lý giao dịch', {
        position: 'top-right',
      });
    } finally {
      hideLoading();
    }
  };

  const cancelPaymentPayOsUrl = async (orderId: string) => {
    showLoading('Đang hủy giao dịch...');
    setError(null);
    try {
      const result = await cancelPayOsUrl(orderId);
      if (result) {
        return result;
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi xử lý giao dịch');
      toast.error(err.message || err || 'Đã xảy ra lỗi khi xử lý giao dịch', {
        position: 'top-right',
      });
    } finally {
      hideLoading();
    }
  };

  return {
    // State
    currentPayment,
    isLoading,
    error,

    //socket
    paymentSocketResult,
    setPaymentSocketResult,
    startListeningSocket,
    stopListeningSocket,

    fetchPaymentById,

    // Methods
    startPayment,
    updatePaymentMethod: handleUpdatePaymentMethod,
    updatePaymentStatus,
    createEwalletUrl,
    processPaymentReturn,

    createPaymentPayOsUrl,
    cancelPaymentPayOsUrl,
  };
};
