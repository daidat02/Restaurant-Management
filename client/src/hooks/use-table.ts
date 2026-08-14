import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { ITable } from '@/types/table.type';

// Import API
import {
  createTable,
  getTablesByRestaurant,
  getTableById,
  updateTable,
  deleteTable,
  updateTableStatus,
} from '@/api/table.api';

// API nghiệp vụ khách tại bàn (được đưa vào hook table để component không import API trực tiếp)
import {
  callStaffAtTable as callStaffAtTableApi,
  requestPaymentAtTable as requestPaymentAtTableApi,
  moveOrderToTableApi,
} from '@/api/order.api';

import { useGlobalLoading } from '@/components/LoadingOverlay';

export const useTable = () => {
  const { showLoading, hideLoading } = useGlobalLoading();

  // State quản lý dữ liệu
  const [tables, setTables] = useState<ITable[]>([]);
  const [currentTable, setCurrentTable] = useState<ITable | null>(null);

  // State quản lý UI cho các hàm GET (không dùng showLoading toàn màn hình)
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ==========================================
  // GET METHODS
  // ==========================================

  const fetchTablesByRestaurant = useCallback(async (restaurantId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getTablesByRestaurant(restaurantId);
      setTables(result ?? []);
      return result;
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải danh sách bàn');
      toast.error(err.message || 'Đã xảy ra lỗi khi tải danh sách bàn', { position: 'top-right' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTableById = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getTableById(id);
      setCurrentTable(result);
      return result;
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải thông tin bàn');
      toast.error(err.message || 'Đã xảy ra lỗi khi tải thông tin bàn', { position: 'top-right' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ==========================================
  // MUTATION METHODS (CREATE, UPDATE, DELETE)
  // ==========================================

  const addTable = useCallback(
    async (data: Partial<ITable>) => {
      showLoading('Đang thêm bàn mới...');
      setError(null);
      try {
        const newTable = await createTable(data);
        if (newTable) {
          setTables((prev) => [...prev, newTable]);
          toast.success('Thêm bàn thành công', { position: 'top-right' });
          return newTable;
        }
      } catch (err: any) {
        setError(err.message || 'Đã xảy ra lỗi khi thêm bàn');
        toast.error(err.message || 'Đã xảy ra lỗi khi thêm bàn', { position: 'top-right' });
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading],
  );

  const editTable = useCallback(
    async (id: string, tableData: Partial<ITable>) => {
      showLoading('Đang cập nhật bàn...');
      setError(null);
      try {
        const updatedTable = await updateTable(id, tableData);
        if (updatedTable) {
          setTables((prev) => prev.map((t) => (t._id === id ? { ...t, ...updatedTable } : t)));
          if (currentTable?._id === id) {
            setCurrentTable({ ...currentTable, ...updatedTable });
          }
          toast.success('Cập nhật bàn thành công', { position: 'top-right' });
          return updatedTable;
        }
      } catch (err: any) {
        setError(err.message || 'Đã xảy ra lỗi khi cập nhật bàn');
        toast.error(err.message || 'Đã xảy ra lỗi khi cập nhật bàn', { position: 'top-right' });
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading, currentTable],
  );

  const removeTable = useCallback(
    async (id: string) => {
      showLoading('Đang xóa bàn...');
      setError(null);
      try {
        await deleteTable(id);
        setTables((prev) => prev.filter((t) => t._id !== id));
        toast.success('Xóa bàn thành công', { position: 'top-right' });
        return true;
      } catch (err: any) {
        setError(err.message || 'Đã xảy ra lỗi khi xóa bàn');
        toast.error(err.message || 'Đã xảy ra lỗi khi xóa bàn', { position: 'top-right' });
        return false;
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading],
  );

  const changeTableStatus = useCallback(
    async (id: string, status: string) => {
      showLoading('Đang cập nhật trạng thái...');
      setError(null);
      try {
        const updatedTable = await updateTableStatus(id, status);
        if (updatedTable) {
          setTables((prev) =>
            prev.map((t) => (t._id === id ? { ...t, status: updatedTable.status } : t)),
          );
          toast.success('Cập nhật trạng thái thành công', { position: 'top-right' });
          return updatedTable;
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
    [showLoading, hideLoading],
  );

  // ==========================================
  // NGHIỆP VỤ KHÁCH TẠI BÀN (GỌI NHÂN VIÊN / THANH TOÁN / ĐƠN HÀNG)
  // ==========================================

  // Khách bấm nút gọi nhân viên tại bàn — component gọi hook này sẽ tự hiển thị thông báo
  const callStaffAtTable = useCallback(async (payload: { tableId: string; restaurantId?: string }) => {
    try {
      return await callStaffAtTableApi(payload);
    } catch {
      return null;
    }
  }, []);

  // Khách bấm nút yêu cầu thanh toán tại bàn — component gọi hook này sẽ tự hiển thị thông báo
  const requestPaymentAtTable = useCallback(
    async (payload: { tableId: string; restaurantId?: string }) => {
      try {
        return await requestPaymentAtTableApi(payload);
      } catch {
        return null;
      }
    },
    [],
  );

  // POS: Chuyển đơn sang bàn khác — cập nhật cục bộ trạng thái bàn (bàn cũ trống, bàn mới có khách)
  const moveOrderToTable = useCallback(
    async (orderId: string, targetTableId: string) => {
      try {
        const result = await moveOrderToTableApi(orderId, targetTableId);
        if (result) {
          const sourceTableId =
            typeof result.table === 'object' && result.table ? result.table._id : result.table;
          setTables((prev) =>
            prev.map((t) => {
              if (t._id === targetTableId) {
                return { ...t, status: 'occupied', currentOrder: orderId };
              }
              if (t._id === sourceTableId) {
                return { ...t, status: 'available', currentOrder: null };
              }
              return t;
            }),
          );
          if (currentTable?._id === targetTableId) {
            setCurrentTable((prev) =>
              prev ? { ...prev, status: 'occupied', currentOrder: orderId } : prev,
            );
          }
        }
        return result;
      } catch (err: any) {
        toast.error(err?.message || 'Đã xảy ra lỗi khi chuyển bàn', { position: 'top-right' });
        return null;
      }
    },
    [currentTable],
  );

  return {
    // State
    tables,
    currentTable,
    isLoading,
    error,

    // Methods
    fetchTablesByRestaurant,
    fetchTableById,
    addTable,
    editTable,
    removeTable,
    changeTableStatus,

    // Nghiệp vụ khách tại bàn
    callStaffAtTable,
    requestPaymentAtTable,
    moveOrderToTable,
  };
};
