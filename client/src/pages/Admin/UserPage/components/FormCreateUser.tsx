import { CustomInput } from '../../../../components/FormInput';
import { FormSelect } from '../../../../components/FormSelect';
import { Button } from '../../../../components/ui/button';
import type { IUser, RegisterCredentials } from '@/types/user.type';
import { useEffect, useState, useMemo } from 'react';
import { useUser } from '@/hooks/use-user';
import { useAuth } from '@/hooks/use-auth';
import { CustomTextarea } from '@/components/CustomTextArea';
import { useRestaurant } from '@/hooks/use-restaurant';
import { extractId } from '@/utils/helpers';

// Danh sách vai trò gốc của hệ thống
const MASTER_ROLE_OPTIONS = [
  { label: 'Nhân viên (Staff)', value: 'staff' },
  { label: 'Khách hàng (Customer)', value: 'customer' },
  { label: 'Quản lý (Manager)', value: 'manager' },
  { label: 'Quản trị viên (Admin)', value: 'admin' },
];

interface FormProps {
  initialData?: IUser | null;
  userType?: 'staff' | 'customer';
  onSuccess: () => void;
}

const FormUser = ({ initialData, userType, onSuccess }: FormProps) => {
  const { restaurants, fetchRestaurants } = useRestaurant();
  const { editUser } = useUser();
  const { user: currentUser, register } = useAuth(); // Tài khoản đang đăng nhập để thực hiện phân quyền trên Form

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [restaurantSelected, setRestaurantSelected] = useState('');
  const [address, setAddress] = useState('');

  // 1. Tự động tính toán danh sách quyền được hiển thị dựa trên Role người đăng nhập
  const filteredRoleOptions = useMemo(() => {
    if (currentUser?.role === 'admin') {
      return MASTER_ROLE_OPTIONS;
    }
    // Nếu là Manager, ẩn hoàn toàn quyền Admin
    return MASTER_ROLE_OPTIONS.filter((option) => option.value !== 'admin');
  }, [currentUser?.role]);

  // Fetch danh sách nhà hàng một lần duy nhất khi component mount
  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  // Điều khiển dữ liệu đầu vào cho form (Edit / Create mode)
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setEmail(initialData.email || '');
      setPhone(initialData.phone || '');
      setRole(initialData.role || '');
      // setAddress(initialData.address || '');
      setRestaurantSelected(
        typeof initialData?.restaurant === 'string'
          ? initialData.restaurant
          : initialData?.restaurant?._id || '',
      );
      setPassword('');
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setAddress('');
      setRole(userType || 'customer');
      setRestaurantSelected('');
      setPassword('');
    }
  }, [initialData, userType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let isSuccess = false;

    // Xác định ID nhà hàng: Admin lấy từ ô chọn, Manager lấy từ chính tài khoản của họ
    const managerRestaurantId = extractId(currentUser?.restaurant);
    const finalRestaurant =
      currentUser?.role === 'admin'
        ? restaurantSelected && restaurantSelected !== 'none'
          ? restaurantSelected
          : undefined
        : managerRestaurantId;

    if (initialData) {
      // ------------------------------------
      // LUỒNG UPDATE (SỬA)
      // ------------------------------------
      const payloadUpdate: Partial<IUser> & { password?: string } = {
        name,
        email,
        phone,
        role: role as 'customer' | 'staff' | 'manager' | 'admin',
        restaurant: finalRestaurant,
        // address,
      };

      if (password.trim() !== '') {
        payloadUpdate.password = password;
      }

      const updatedUser = await editUser(initialData._id, payloadUpdate);
      if (updatedUser) isSuccess = true;
    } else {
      // ------------------------------------
      // LUỒNG CREATE (TẠO MỚI)
      // ------------------------------------
      const payloadRegister = {
        name,
        email,
        phone,
        role,
        password,
        restaurant: finalRestaurant,
        address,
      } as RegisterCredentials;

      if (register) {
        const newUser = await register(payloadRegister);
        if (newUser) isSuccess = true;
      }
    }

    if (isSuccess) {
      onSuccess();
    }
  };

  return (
    <div className="p-4">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {/* Hàng 1: Họ tên */}
        <CustomInput
          label="Họ và tên"
          placeholder="Nhập họ và tên người dùng"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Hàng 2: Email & Số điện thoại */}
        <div className="flex gap-4 w-full">
          <CustomInput
            type="email"
            label="Địa chỉ email"
            placeholder="example@gmail.com"
            className="flex-[2] w-full"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <CustomInput
            label="Số điện thoại"
            placeholder="090xxxxxxx"
            className="flex-1"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {/* Hàng 3: Cấu trúc hiển thị phân quyền dựa trên tài khoản đăng nhập */}
        <div className="grid grid-cols-2 gap-4 w-full items-end">
          {/* Ô Chọn Vai Trò */}
          <FormSelect
            label="Vai trò"
            placeholder="Chọn vai trò"
            options={filteredRoleOptions}
            value={role}
            onValueChange={(value) => setRole(value)}
          />
          <FormSelect
            label="Nhà Hàng"
            placeholder="Chọn Nhà Hàng"
            options={[
              { label: 'Không thuộc nhà hàng (Khách lẻ)', value: 'none' },
              ...restaurants.map((r) => ({
                label: r.name,
                value: r._id,
              })),
            ]}
            value={restaurantSelected || extractId(currentUser?.restaurant) || 'none'}
            onValueChange={(value) => setRestaurantSelected(value)}
            disabled={currentUser?.role !== 'admin'}
          />
        </div>

        {/* Mật khẩu */}
        <CustomInput
          type="password"
          label={initialData ? 'Mật khẩu mới (Bỏ trống nếu không đổi)' : 'Mật khẩu'}
          placeholder={initialData ? '********' : 'Nhập mật khẩu'}
          required={!initialData}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* Địa chỉ */}
        <CustomTextarea
          label="Địa Chỉ"
          placeholder="Nhập địa chỉ của người dùng (vị trí, khu vực...)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        {/* Nút hành động */}
        <div className="flex justify-center gap-3 mt-4">
          <Button
            type="submit"
            className="bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white rounded-lg w-full h-11 shadow-sm font-medium"
          >
            {initialData ? 'Cập nhật thông tin' : 'Tạo người dùng'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default FormUser;
