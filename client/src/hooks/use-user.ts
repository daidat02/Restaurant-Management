import { type IUser } from '@/types/user.type';
import {
  getProfileMe,
  getProfileUserById,
  getAllCustomers,
  getUsersWithFilter,
  deleteUser,
  updateUser,
  updateMe,
} from '@/api/user.api';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export const useUser = () => {
  // Sửa lỗi chính tả useUer -> useUser
  const [customers, setCustomers] = useState<IUser[]>([]);
  const [staff, setStaff] = useState<IUser[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);

  const fetchUsersWithFilter = useCallback(async (roles: string[], restaurantId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getUsersWithFilter(roles, restaurantId);
      setUsers(result ?? []);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu');
      toast.error(err.message || 'Đã xảy ra lỗi khi tải dữ liệu', { position: 'top-right' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCustomer = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAllCustomers();
      // Đồng bộ cách lấy data giống như fetchStaff
      setCustomers(result ?? []);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu');
      toast.error(err.message || 'Đã xảy ra lỗi khi tải dữ liệu', { position: 'top-right' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Đổi tên hàm thành fetchProfileMe để KHÔNG TRÙNG với hàm API getProfileMe được import
  const fetchProfileMe = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getProfileMe();
      setSelectedUser(result);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu');
      toast.error(err.message || 'Đã xảy ra lỗi khi tải dữ liệu', { position: 'top-right' });
    } finally {
      setIsLoading(false);
    }
  }, []);
  const fetchUserById = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getProfileUserById(id);
      setSelectedUser(result);
      return result; // Trả về để component có thể xài ngay nếu cần
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu');
      toast.error(err.message || 'Đã xảy ra lỗi khi tải dữ liệu', { position: 'top-right' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handelRemoveUser = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await deleteUser(id);

      // Xóa trực tiếp ở state local để UI cập nhật ngay mà không cần fetch lại từ server
      setCustomers((prev) => prev.filter((user) => user._id !== id));
      setStaff((prev) => prev.filter((user) => user._id !== id));

      toast.success('Xóa người dùng thành công', { position: 'top-right' });
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu');
      toast.error(err.message || 'Đã xảy ra lỗi khi tải dữ liệu', { position: 'top-right' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handelEditUser = useCallback(async (id: string, dataUpdate: Partial<IUser>) => {
    setIsLoading(true);
    setError(null);
    try {
      const updatedUser = await updateUser(id, dataUpdate);

      setCustomers((prev) =>
        prev.map((user) => (user._id === id ? { ...user, ...updatedUser } : user)),
      );
      setStaff((prev) =>
        prev.map((user) => (user._id === id ? { ...user, ...updatedUser } : user)),
      );

      setSelectedUser((prev) => (prev?._id === id ? { ...prev, ...updatedUser } : prev));

      toast.success('Cập nhật thông tin thành công', { position: 'top-right' });
      return updatedUser;
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu');
      toast.error(err.message || 'Đã xảy ra lỗi khi tải dữ liệu', { position: 'top-right' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleEditProfile = async (dataUpdate: Partial<IUser>) => {
    setIsLoading(true);
    setError(null);
    try {
      const updatedUser = await updateMe(dataUpdate);
      await fetchProfileMe();
      toast.success('Cập nhật thông tin thành công', { position: 'top-right' });
      return updatedUser;
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu');
      toast.error(err.message || 'Đã xảy ra lỗi khi tải dữ liệu', { position: 'top-right' });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    customers,
    staff,
    users,
    isLoading,
    error,
    selectedUser,
    fetchUsersWithFilter,
    fetchCustomer,
    fetchProfileMe,
    fetchUserById,
    removeUser: handelRemoveUser,
    editUser: handelEditUser,
    editProfile: handleEditProfile,
  };
};
