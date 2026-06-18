import { useCallback, useState } from 'react';
import { toast } from 'sonner';

// Import các hàm API đã được định kiểu
import {
  createSetting,
  getOrCreateSetting,
  getSettingById,
  updateSetting,
  updatePaymentMethodType,
  deleteSetting,
} from '@/api/setting.api';

import { useGlobalLoading } from '@/components/LoadingOverlay';
import type { IBankAccountConfig, ISetting, IThirdPartyIntegration } from '@/types/setting.type';

export const useSetting = () => {
  const { showLoading, hideLoading } = useGlobalLoading();

  // State quản lý danh bạ cấu hình (Dành cho góc nhìn Admin tổng sàn)
  const [settings, setSettings] = useState<ISetting[]>([]);
  // Cấu hình hiện tại đang được bóc tách và chỉnh sửa trên giao diện Modal
  const [currentSetting, setCurrentSetting] = useState<ISetting | null>(null);

  // State quản lý UI cho các tác vụ tải dữ liệu ngầm (GET)
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ==========================================
  // I. GET METHODS (FETCH DATA)
  // ==========================================

  /**
   * Tải nhanh hoặc tự động khởi tạo cấu hình dựa trên scope, model và targetId
   * Đã đồng bộ nhận 3 tham số khớp hoàn toàn với cấu trúc Router và API File mới của bạn
   */
  const fetchOrCreateSetting = useCallback(
    async (scope: 'admin' | 'restaurant', model: 'User' | 'Restaurant', targetId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getOrCreateSetting(scope, model, targetId);
        setCurrentSetting(result ?? null);
        return result;
      } catch (err: any) {
        const errMsg = err.message || 'Đã xảy ra lỗi khi tải cấu hình hệ thống';
        setError(errMsg);
        toast.error(errMsg, { position: 'top-right' });
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  /**
   * Lấy thông tin cấu hình chi tiết thông qua Setting ID cụ thể
   */
  const fetchSettingById = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getSettingById(id);
      setCurrentSetting(result);
      return result;
    } catch (err: any) {
      const errMsg = err.message || 'Đã xảy ra lỗi khi tải thông tin cấu hình';
      setError(errMsg);
      toast.error(errMsg, { position: 'top-right' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ==========================================
  // II. MUTATION METHODS (CREATE, UPDATE, DELETE)
  // ==========================================

  /**
   * Khởi tạo một bản ghi cấu hình cài đặt mới hoàn toàn
   */
  const addSetting = useCallback(
    async (data: Partial<ISetting>) => {
      showLoading('Đang khởi tạo cấu hình...');
      setError(null);
      try {
        const newSetting = await createSetting(data);
        if (newSetting) {
          setSettings((prev) => [...prev, newSetting]);
          toast.success('Khởi tạo cấu hình thành công', { position: 'top-right' });
          return newSetting;
        }
      } catch (err: any) {
        const errMsg = err.message || 'Đã xảy ra lỗi khi tạo cấu hình';
        setError(errMsg);
        toast.error(errMsg, { position: 'top-right' });
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading],
  );

  /**
   * Cập nhật thông tin chi tiết cấu hình (Form tổng lực lưu các Tab form)
   * Có hỗ trợ truyền kèm trường 'reason' để Backend ghi vết Audit Log tài chính
   */
  const editSetting = useCallback(
    async (id: string, settingData: Partial<ISetting> & { reason?: string }) => {
      showLoading('Đang lưu cấu hình hệ thống...');
      setError(null);
      try {
        const updatedSetting = await updateSetting(id, settingData);
        if (updatedSetting) {
          // Cập nhật lại danh sách tổng (Nếu có)
          setSettings((prev) => prev.map((s) => (s._id === id ? { ...s, ...updatedSetting } : s)));

          // Đồng bộ tức thời dữ liệu form hiện tại lên màn hình
          if (currentSetting?._id === id) {
            setCurrentSetting({ ...currentSetting, ...updatedSetting });
          }

          toast.success('Lưu cấu hình thành công', { position: 'top-right' });
          return updatedSetting;
        }
      } catch (err: any) {
        const errMsg = err.message || 'Đã xảy ra lỗi khi lưu cấu hình';
        setError(errMsg);
        toast.error(errMsg, { position: 'top-right' });
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading, currentSetting],
  );

  /**
   * Cập nhật nhanh loại phương thức thanh toán mặc định (None / Bank Transfer / PayOS)
   */
  const changePaymentMethodType = useCallback(
    async (
      id: string,
      paymentMethodType: 'none' | 'bank_transfer' | 'payos',
      payload: Partial<ISetting>,
    ) => {
      showLoading('Đang chuyển đổi phương thức thanh toán...');
      setError(null);
      try {
        const updatedSetting = await updatePaymentMethodType(id, paymentMethodType, payload);
        if (updatedSetting) {
          if (currentSetting?._id === id) {
            setCurrentSetting({
              ...currentSetting,
              paymentMethodType: updatedSetting.paymentMethodType,
              bankAccount: updatedSetting.bankAccount,
              integrations: updatedSetting.integrations,
            });
          }
          toast.success('Thay đổi phương thức thanh toán và cập nhật cấu hình thành công', {
            position: 'top-right',
          });
          return updatedSetting;
        }
      } catch (err: any) {
        const errMsg = err.message || 'Không thể thay đổi phương thức thanh toán';
        setError(errMsg);
        toast.warning(errMsg, { position: 'top-right' });
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading, currentSetting],
  );

  /**
   * Xóa bản ghi cấu hình cài đặt khỏi hệ thống (Quyền: Admin)
   */
  const removeSetting = useCallback(
    async (id: string) => {
      showLoading('Đang xóa cấu hình...');
      setError(null);
      try {
        await deleteSetting(id);
        setSettings((prev) => prev.filter((s) => s._id !== id));
        if (currentSetting?._id === id) {
          setCurrentSetting(null);
        }
        toast.success('Xóa cấu hình thành công', { position: 'top-right' });
        return true;
      } catch (err: any) {
        const errMsg = err.message || 'Đã xảy ra lỗi khi xóa cấu hình';
        setError(errMsg);
        toast.error(errMsg, { position: 'top-right' });
        return false;
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading, currentSetting],
  );

  return {
    // States cung cấp ra màn hình
    settings,
    currentSetting,
    isLoading,
    error,

    // Methods xử lý logic
    fetchOrCreateSetting,
    fetchSettingById,
    addSetting,
    editSetting,
    changePaymentMethodType,
    removeSetting,
  };
};
