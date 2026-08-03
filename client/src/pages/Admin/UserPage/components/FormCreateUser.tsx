import { CustomInput } from '../../../../components/FormInput';
import { FormSelect } from '../../../../components/FormSelect';
import { Button } from '../../../../components/ui/button';
import type { IUser } from '@/types/user.type';
import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useUser } from '@/hooks/use-user';
import { useAuth } from '@/hooks/use-auth';
import { CustomTextarea } from '@/components/CustomTextArea';
import { useRestaurant } from '@/hooks/use-restaurant';
import { extractId } from '@/utils/helpers';

// Danh sách vai trò theo người đăng nhập (ticket 08):
// - Admin (chủ chuỗi): tạo manager/staff và gán vào chi nhánh cụ thể.
// - Manager: chỉ tạo staff của chi nhánh mình.
const ADMIN_ROLE_OPTIONS = [
  { label: 'Quản lý (Manager)', value: 'manager' },
  { label: 'Nhân viên (Staff)', value: 'staff' },
];

const MANAGER_ROLE_OPTIONS = [{ label: 'Nhân viên (Staff)', value: 'staff' }];

interface FormProps {
  initialData?: IUser | null;
  onSuccess: () => void;
}

const FormUser = ({ initialData, onSuccess }: FormProps) => {
  const { restaurants, fetchRestaurants } = useRestaurant();
  const { createUser, editUser } = useUser();
  const { user: currentUser } = useAuth(); // Tài khoản đang đăng nhập để thực hiện phân quyền trên Form

  const [name, setName] = useState(initialData?.name || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>(
    initialData?.role || (currentUser?.role === 'admin' ? 'manager' : 'staff'),
  );
  const [restaurantSelected, setRestaurantSelected] = useState(() => {
    if (initialData) {
      return typeof initialData?.restaurant === 'string'
        ? initialData.restaurant
        : initialData?.restaurant?._id || '';
    }
    // Manager: mặc định chi nhánh của chính mình; Admin: phải tự chọn
    return currentUser?.role === 'admin' ? '' : extractId(currentUser?.restaurant);
  });
  const [address, setAddress] = useState('');

  // 1. Tự động tính toán danh sách quyền được hiển thị dựa trên Role người đăng nhập
  const filteredRoleOptions = useMemo(() => {
    if (currentUser?.role === 'admin') return ADMIN_ROLE_OPTIONS;
    // Manager chỉ tạo staff
    return MANAGER_ROLE_OPTIONS;
  }, [currentUser?.role]);

  // 2. Chi nhánh mặc định cho manager (chỉ nhánh của chính mình)
  const defaultManagerRestaurant = extractId(currentUser?.restaurant);

  // Fetch danh sách nhà hàng một lần duy nhất khi component mount
  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate: nhà hàng bắt buộc với staff/manager (ticket 08)
    if (role !== 'admin' && !restaurantSelected) {
      toast.error('Vui lòng chọn nhà hàng cho tài khoản.', { position: 'top-right' });
      return;
    }

    let isSuccess = false;

    // ID nhà hàng: admin lấy từ ô chọn; manager dùng chi nhánh của chính mình
    const finalRestaurant =
      currentUser?.role === 'admin' ? restaurantSelected : defaultManagerRestaurant;

    if (initialData) {
      // ------------------------------------
      // LUỒNG UPDATE (SỬA) — admin có thể đổi nhà hàng gán cho manager
      // ------------------------------------
      const payloadUpdate: Partial<IUser> & { password?: string } = {
        name,
        email,
        phone,
        role: role as 'staff' | 'manager',
        restaurant: finalRestaurant,
      };

      if (password.trim() !== '') {
        payloadUpdate.password = password;
      }

      const updatedUser = await editUser(initialData._id, payloadUpdate);
      if (updatedUser) isSuccess = true;
    } else {
      // ------------------------------------
      // LUỒNG CREATE (TẠO MỚI) — dùng API nội bộ POST /auth/admin/create
      // ------------------------------------
      const payloadRegister: Partial<IUser> & { password: string } = {
        name,
        email,
        phone,
        role: role as 'staff' | 'manager',
        password,
        restaurant: finalRestaurant,
        address,
      };

      const newUser = await createUser(payloadRegister);
      if (newUser) isSuccess = true;
    }

    if (isSuccess) {
      onSuccess();
    }
  };

  const isEditingSelf = initialData?._id === currentUser?._id;

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

        {/* Hàng 3: Vai trò + Nhà hàng (bắt buộc) */}
        <div className="grid grid-cols-2 gap-4 w-full items-end">
          {/* Ô Chọn Vai Trò */}
          <FormSelect
            label="Vai trò"
            placeholder="Chọn vai trò"
            options={filteredRoleOptions}
            value={role}
            onValueChange={(value) => setRole(value)}
            disabled={isEditingSelf}
          />
          <FormSelect
            label="Nhà Hàng"
            placeholder={currentUser?.role === 'admin' ? 'Chọn nhà hàng bắt buộc' : 'Chi nhánh của bạn'}
            options={restaurants.map((r) => ({
              label: r.name,
              value: r._id,
            }))}
            value={restaurantSelected}
            onValueChange={(value) => setRestaurantSelected(value)}
            disabled={currentUser?.role !== 'admin' || isEditingSelf}
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
