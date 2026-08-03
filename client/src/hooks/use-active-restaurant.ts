import { useAppSelector } from './redux-hook';
import { extractId } from '@/utils/helpers';

/**
 * NHÀ HÀNG ĐANG LÀM VIỆC — nguồn restaurantId DUY NHẤT cho toàn bộ app.
 * - admin (chủ chuỗi): không chọn 1 nhà hàng → trả '' (quản toàn chuỗi).
 * - manager/staff: ưu tiên currentRestaurantId -> restaurantIds[0] -> restaurant (legacy).
 * Mọi trang admin phải đọc từ đây thay vì trích user.restaurant rải rác.
 */
export const useActiveRestaurantId = (): string => {
  const { currentRestaurantId, user } = useAppSelector((state) => state.auth);
  if (user?.role === 'admin') return '';
  if (currentRestaurantId) return currentRestaurantId;
  if (!user) return '';
  if (Array.isArray(user.restaurantIds) && user.restaurantIds.length > 0) {
    return extractId(user.restaurantIds[0]);
  }
  return extractId(user.restaurant);
};
