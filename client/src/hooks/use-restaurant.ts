import { useState, useCallback } from 'react';
import {
  createRestaurant,
  deleteRestaurant,
  getRestaurantById,
  getRestaurants,
  updateRestaurant,
} from '@/api/restaurants.api';
import type { IRestaurant } from '@/types/restaurant.type';
import { toast } from 'sonner';
import { useGlobalLoading } from '@/components/LoadingOverlay';
import { useAppDispatch } from './redux-hook';
import { selectRestaurant } from '@/redux/slices/restaurantSlice';
import { getRestaurantHaveTableEmpty } from '@/api/reservation.api';
export const useRestaurant = () => {
  const dispath = useAppDispatch();

  const { showLoading, hideLoading } = useGlobalLoading();
  const [restaurants, setRestaurants] = useState<IRestaurant[]>([]);
  const [resHaveTableEmpty, setResHaveTableEmpty] = useState<IRestaurant[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<IRestaurant | null>(null);

  const fetchRestaurants = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Hàm getRestaurants giờ đây sẽ ném thẳng cái mảng vào biến result
      const result = await getRestaurants();
      // Nếu API trả về undefined thì dùng mảng rỗng để tránh lỗi kiểu
      setRestaurants(result ?? []);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu');
      toast.error(err.message || 'Đã xảy ra lỗi khi tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchRestaurantsHaveTableEmpty = useCallback(
    async (time: string, date: Date, capacity: number, restaurantId?: string) => {
      setIsLoading(true);
      setError(null);
      showLoading();
      try {
        // Hàm getRestaurants giờ đây sẽ ném thẳng cái mảng vào biến result
        const result = await getRestaurantHaveTableEmpty(time, date, capacity, restaurantId);
        // Nếu API trả về undefined thì dùng mảng rỗng để tránh lỗi kiểu
        setResHaveTableEmpty(result ?? []);
      } catch (err: any) {
        setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu');
        toast.error(err.message || 'Đã xảy ra lỗi khi tải dữ liệu');
      } finally {
        hideLoading();
        setIsLoading(false);
      }
    },
    [],
  );

  const handleSelectRestaurant = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getRestaurantById(id);
      setSelectedRestaurant(result || null);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRestaurant = async (restaurantData: Partial<IRestaurant>) => {
    showLoading();
    setError(null);
    try {
      await createRestaurant(restaurantData);
      await fetchRestaurants();
      toast.success('Tạo nhà hàng thành công', { position: 'top-right' });
      return true;
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tạo nhà hàng');
      return false;
    } finally {
      hideLoading();
    }
  };

  const handleUpdateRestaurant = async (
    id: string,
    restaurantData: Partial<Omit<IRestaurant, 'id' | 'createdAt'>>,
  ) => {
    setError(null);
    showLoading();
    try {
      await updateRestaurant(id, restaurantData);
      await fetchRestaurants();
      toast.success('Cập nhật nhà hàng thành công', { position: 'top-right' });
      return true;
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi cập nhật nhà hàng');
      return false;
    } finally {
      hideLoading();
    }
  };
  const handleDeleteRestaurant = async (id: string) => {
    setError(null);
    showLoading();
    try {
      await deleteRestaurant(id);
      toast.success('Xóa nhà hàng thành công', { position: 'top-right' });
      return true;
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi xóa nhà hàng');
      return false;
    } finally {
      hideLoading();
      await fetchRestaurants();
    }
  };

  const handleSelectRestaurantRedux = (restaurantId: string) => {
    dispath(selectRestaurant(restaurantId));
  };

  return {
    restaurants,
    resHaveTableEmpty,
    isLoading,
    error,
    selectedRestaurant,

    // redux
    handleSelectRestaurantRedux,

    fetchRestaurants,
    fetchRestaurantsHaveTableEmpty,
    createRestaurant: handleCreateRestaurant,
    updateRestaurant: handleUpdateRestaurant,
    deleteRestaurant: handleDeleteRestaurant,
    selectRestaurant: handleSelectRestaurant,
  };
};
