import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { IReservation, ITableTimeSlot } from '@/types/reservation.type';
import type { IRestaurant } from '@/types/restaurant.type';

// Import các API đã định nghĩa ở bước trước
import {
  createReservation,
  getRestaurantHaveTableEmpty,
  getReservationByRestaurant,
  getMyReservations,
  getReservationById,
  updateReservation,
  updateReservationStatus,
  cancelReservation,
  getTableTimeSlots,
  createReservationByStaff,
} from '@/api/reservation.api';

import { useGlobalLoading } from '@/components/LoadingOverlay';
import { extractId } from '@/utils/helpers';

export const useReservation = () => {
  const { showLoading, hideLoading } = useGlobalLoading();

  // State quản lý dữ liệu danh sách và chi tiết
  const [reservations, setReservations] = useState<IReservation[]>([]);
  const [currentReservation, setCurrentReservation] = useState<IReservation | null>(null);
  const [emptyTableRestaurants, setEmptyTableRestaurants] = useState<IRestaurant[]>([]);
  const [tableTimeSlots, setTableTimeSlots] = useState<ITableTimeSlot[]>();
  // State quản lý UI cho các hàm GET (không dùng showLoading toàn màn hình)
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRestaurantsWithEmptyTables = useCallback(
    async (time: string, date: Date, capacity: number, restaurantId?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getRestaurantHaveTableEmpty(time, date, capacity, restaurantId);
        setEmptyTableRestaurants(result ?? []);
        return result;
      } catch (err: any) {
        setError(err.message || 'Đã xảy ra lỗi khi tìm kiếm nhà hàng còn bàn trống');
        toast.error(err.message || 'Đã xảy ra lỗi khi tìm kiếm nhà hàng', {
          position: 'top-right',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // 2. Lấy danh sách đặt bàn theo Nhà hàng (Cho Staff/Admin)
  const fetchReservationsByRestaurant = useCallback(
    async (restaurantId: string, date?: string, status?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getReservationByRestaurant(restaurantId, date, status);
        setReservations(result ?? []);
        return result;
      } catch (err: any) {
        setError(err.message || 'Đã xảy ra lỗi khi tải danh sách đặt bàn của nhà hàng');
        toast.error(err.message || 'Không thể tải danh sách đặt bàn', { position: 'top-right' });
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // 3. Khách hàng tự lấy danh sách lịch sử đặt bàn của chính mình
  const fetchMyReservations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getMyReservations();
      setReservations(result ?? []);
      return result;
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải lịch sử đặt bàn của bạn');
      toast.error(err.message || 'Không thể tải lịch sử đặt bàn', { position: 'top-right' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 4. Xem chi tiết thông tin một đơn đặt bàn bằng ID
  const fetchReservationById = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getReservationById(id);
      setCurrentReservation(result);
      return result;
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải chi tiết đơn đặt bàn');
      toast.error(err.message || 'Không thể tải thông tin đặt bàn', { position: 'top-right' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTableTimeSlots = useCallback(async (restaurantId: string, date: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getTableTimeSlots(restaurantId, date);
      console.log(result, 'slot Result');
      setTableTimeSlots(result);
      return result;
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải khung giờ đặt bàn');
      toast.error(err.message || 'Không thể tải khung giờ đặt bàn', { position: 'top-right' });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ==========================================
  // MUTATION METHODS (CREATE, UPDATE, CANCEL)
  // ==========================================

  // 5. Thêm/Tạo một đơn đặt bàn mới
  const addReservation = useCallback(
    async (data: Partial<IReservation>) => {
      showLoading('Đang xử lý đặt bàn...');
      setError(null);
      try {
        const newReservation = await createReservation(data);
        if (newReservation) {
          setReservations((prev) => [...prev, newReservation]);
          toast.success('Đặt bàn thành công!', { position: 'top-right' });
          return newReservation;
        }
      } catch (err: any) {
        setError(err.message || 'Đã xảy ra lỗi khi tạo đơn đặt bàn');
        toast.error(err.message || 'Đặt bàn thất bại, vui lòng thử lại', { position: 'top-right' });
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading],
  );

  const addReservationByStaff = useCallback(
    async (data: Partial<IReservation>) => {
      showLoading('Đang xử lý đặt bàn...');
      setError(null);
      try {
        console.log(tableTimeSlots);

        const newReservation = await createReservationByStaff(data);
        if (newReservation) {
          setTableTimeSlots((prev) => {
            if (!prev) return prev; // Phòng hờ nếu mảng chưa kịp khởi tạo
            return prev?.map((tableSlot) => {
              const isTargetTable = tableSlot._id?.toString() === newReservation.table?.toString();
              if (isTargetTable) {
                return {
                  ...tableSlot,
                  reservedTimes: {
                    ...tableSlot.reservedTimes,
                    [newReservation.reservationTime!]: newReservation,
                  },
                };
              }
              // Các bàn khác không liên quan thì giữ nguyên
              return tableSlot;
            });
          });
          setReservations((prev) => [...prev, newReservation]);
          toast.success('Đặt bàn thành công!', { position: 'top-right' });
          return newReservation;
        }
      } catch (err: any) {
        setError(err.message || 'Đã xảy ra lỗi khi tạo đơn đặt bàn');
        toast.error(err.message || 'Đặt bàn thất bại, vui lòng thử lại', { position: 'top-right' });
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading],
  );

  // 6. Cập nhật thông tin chi tiết đơn đặt bàn (thời gian, số người...)
  const editReservation = useCallback(
    async (id: string, updateData: Partial<IReservation>) => {
      showLoading('Đang cập nhật đơn đặt bàn...');
      setError(null);
      try {
        const updatedReservation = await updateReservation(id, updateData);
        if (updatedReservation) {
          setTableTimeSlots((prev) => {
            if (!prev) return [];

            return prev.map((table) => {
              // 1. Tìm đúng bàn cần cập nhật
              if (table._id !== extractId(updatedReservation.table)) {
                return table;
              }
              const slotKey = updatedReservation.reservationTime;
              if (!table.reservedTimes || !table.reservedTimes[slotKey]) {
                return table;
              }
              return {
                ...table,
                reservedTimes: {
                  ...table.reservedTimes,
                  [slotKey]: {
                    ...table.reservedTimes[slotKey],
                    ...updatedReservation,
                  },
                },
              };
            });
          });

          setReservations((prev) =>
            prev.map((r) => (r._id === id ? { ...r, ...updatedReservation } : r)),
          );
          // Cập nhật lại view chi tiết nếu đang xem đúng đơn này
          if (currentReservation?._id === id) {
            setCurrentReservation({ ...currentReservation, ...updatedReservation });
          }
          toast.success('Cập nhật đơn đặt bàn thành công', { position: 'top-right' });
          return updatedReservation;
        }
      } catch (err: any) {
        setError(err.message || 'Đã xảy ra lỗi khi cập nhật đơn đặt bàn');
        toast.error(err.message || 'Cập nhật thất bại', { position: 'top-right' });
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading, currentReservation],
  );

  // 7. Thay đổi trạng thái đặt bàn (ví dụ: CONFIRMED, COMPLETED,...)
  const changeReservationStatus = useCallback(
    async (id: string, status: string) => {
      showLoading('Đang cập nhật trạng thái đơn đặt bàn...');
      setError(null);
      try {
        const updatedReservation = await updateReservationStatus(id, status);
        if (updatedReservation) {
          setReservations((prev) =>
            prev.map((r) => (r._id === id ? { ...r, status: updatedReservation.status } : r)),
          );
          if (currentReservation?._id === id) {
            setCurrentReservation((prev) =>
              prev ? { ...prev, status: updatedReservation.status } : null,
            );
          }
          toast.success(`Đã cập nhật trạng thái: ${status}`, { position: 'top-right' });
          return updatedReservation;
        }
      } catch (err: any) {
        setError(err.message || 'Đã xảy ra lỗi khi cập nhật trạng thái');
        toast.error(err.message || 'Cập nhật trạng thái thất bại', { position: 'top-right' });
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading, currentReservation],
  );

  // 8. Hủy đặt bàn (Dành cho cả Customer lẫn Admin/Staff)
  const cancelMyReservation = useCallback(
    async (id: string) => {
      showLoading('Đang tiến hành hủy đặt bàn...');
      setError(null);
      try {
        const updatedReservation = await cancelReservation(id);
        if (updatedReservation) {
          setReservations((prev) =>
            prev.map((r) => (r._id === id ? { ...r, status: updatedReservation.status } : r)),
          );
          if (currentReservation?._id === id) {
            setCurrentReservation((prev) =>
              prev ? { ...prev, status: updatedReservation.status } : null,
            );
          }
          toast.success('Hủy đặt bàn thành công', { position: 'top-right' });
          return true;
        }
        return false;
      } catch (err: any) {
        setError(err.message || 'Đã xảy ra lỗi khi hủy đặt bàn');
        toast.error(err.message || 'Không thể hủy đơn đặt bàn', { position: 'top-right' });
        return false;
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading, currentReservation],
  );

  return {
    // States
    tableTimeSlots,
    reservations,
    currentReservation,
    emptyTableRestaurants,
    isLoading,
    error,

    // Methods
    //GET
    fetchRestaurantsWithEmptyTables,
    fetchReservationsByRestaurant,
    fetchMyReservations,
    fetchReservationById,
    fetchTableTimeSlots,

    // MUTATION
    addReservation,
    editReservation,
    changeReservationStatus,
    cancelMyReservation,
    addReservationByStaff,
  };
};
