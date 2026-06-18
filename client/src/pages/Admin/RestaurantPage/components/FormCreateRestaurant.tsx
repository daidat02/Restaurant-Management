import { CustomTextarea } from '@/components/CustomTextArea';
import { FileUpload } from '@/components/FileUpload';
import { CustomInput } from '@/components/FormInput';
import { FormSelect } from '@/components/FormSelect';
import { Button } from '@/components/ui/button';
import { useRestaurant } from '@/hooks/use-restaurant';
import { useUser } from '@/hooks/use-user';
import type { IRestaurant } from '@/types/restaurant.type';
import { extractId } from '@/utils/helpers';
import { useEffect, useMemo, useState } from 'react';

const statusOptions = [
  { label: 'Đang hoạt động', value: 'active' },
  { label: 'Tạm dừng', value: 'inactive' },
];

interface FormProps {
  initialData?: IRestaurant | null;
  onSuccess: () => void;
}

const FormCreateRestaurant = ({ initialData, onSuccess }: FormProps) => {
  const { createRestaurant, updateRestaurant } = useRestaurant();
  // Kéo dữ liệu staff (chứa manager sau khi filter) và hàm fetch tổng lực từ useUser
  const { users, fetchUsersWithFilter } = useUser();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [capacity, setCapacity] = useState<number>(0);
  const [operatingHours, setOperatingHours] = useState('');
  const [managerId, setManagerId] = useState('');
  const [status, setStatus] = useState('active');
  const [address, setAddress] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  // 1. Fetch danh sách tài khoản quản lý khi form mở ra
  useEffect(() => {
    // Chỉ lấy những tài khoản có năng lực quản trị cơ sở
    fetchUsersWithFilter(['manager']);
  }, [fetchUsersWithFilter]);

  // 2. Định hình danh sách quản lý mượt mà cho ô Chọn (FormSelect)
  const managerOptions = useMemo(() => {
    if (!users || users.length === 0) return [];
    return users.map((u) => ({
      label: `${u.name} (${u.role?.toUpperCase()})`,
      value: u._id,
    }));
  }, [users]);

  // 3. Đổ dữ liệu cũ hoặc làm sạch form (Edit / Create mode)
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setEmail(initialData.email || '');
      setPhone(initialData.phone || '');
      setCapacity(initialData.capacity || 0);
      setOperatingHours(initialData.operatingHours || '');
      setStatus(initialData.status || 'active');
      setAddress(initialData.address || '');
      setManagerId(extractId(initialData.managerId, '_id'));
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setCapacity(0);
      setOperatingHours('08:00 - 22:00');
      setManagerId('');
      setStatus('active');
      setAddress('');
      setImageFile(null);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let isSuccess = false;

    const payload: Partial<IRestaurant> = {
      name,
      email,
      phone,
      capacity: Number(capacity),
      operatingHours,
      managerId: managerId || undefined,
      status: status as 'active' | 'inactive',
      address,
    };
    if (initialData) {
      console.log('Gọi API Update Nhà Hàng với ID:', initialData._id, payload);
      isSuccess = await updateRestaurant(initialData._id, payload);
    } else {
      console.log('Gọi API Create Nhà Hàng mới:', payload);
      isSuccess = await createRestaurant(payload);
    }

    if (isSuccess) {
      onSuccess();
    }
  };

  return (
    <div className="p-4">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        {/* Hàng 1: Tên nhà hàng */}
        <CustomInput
          value={name}
          label="Tên nhà hàng"
          placeholder="Nhập tên nhà hàng (VD: Haidilao Cơ sở 1...)"
          required
          onChange={(e) => setName(e.target.value)}
        />

        {/* Hàng 2: Địa chỉ email & Số điện thoại chi nhánh */}
        <div className="flex gap-4 w-full">
          <CustomInput
            type="email"
            label="Địa chỉ email nhà hàng"
            placeholder="restaurant@gmail.com"
            className="flex-[2] w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <CustomInput
            label="Số điện thoại liên hệ"
            placeholder="095xxxxxxx"
            className="flex-1"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {/* Hàng 3: Sức chứa & Giờ mở cửa */}
        <div className="flex gap-4 w-full">
          <CustomInput
            type="number"
            label="Sức chứa (khách tối đa)"
            placeholder="VD: 150"
            containerClassName="flex-1"
            value={capacity || ''}
            onChange={(e) => setCapacity(Number(e.target.value))}
          />
          <CustomInput
            label="Giờ hoạt động"
            placeholder="VD: 08:00 - 22:00"
            containerClassName="flex-1"
            value={operatingHours}
            onChange={(e) => setOperatingHours(e.target.value)}
          />
        </div>

        <div className="flex gap-4 mb-4 w-full h-10">
          <FormSelect
            label="Quản lý chi nhánh"
            placeholder={managerOptions.length > 0 ? 'Chọn quản lý' : 'Đang tải danh sách...'}
            options={managerOptions}
            value={managerId}
            disabled={managerOptions.length === 0}
            onValueChange={(value) => setManagerId(value)}
          />
          <FormSelect
            label="Trạng thái"
            placeholder="Chọn trạng thái"
            options={statusOptions}
            value={status}
            onValueChange={(value) => setStatus(value)}
          />
        </div>

        {/* Hàng 5: Địa chỉ cụ thể */}
        <CustomTextarea
          label="Địa chỉ chi tiết"
          placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
          value={address}
          required
          onChange={(e) => setAddress(e.target.value)}
        />

        {/* Hàng 6: Banner/Hình ảnh nhà hàng */}
        <FileUpload
          label="Hình ảnh đại diện nhà hàng"
          accept="image/png, image/jpeg, image/jpg"
          initialPreview={initialData?.name} // Hoặc truyền link ảnh cũ nếu có trường image trong initialData
          onChange={(file) => {
            setImageFile(file instanceof File ? file : Array.isArray(file) ? file[0] : null);
          }}
        />

        {/* Nút hành động */}
        <div className="flex justify-center gap-3 mt-2">
          <Button
            type="submit"
            className="bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white rounded-xl w-full h-11 font-medium shadow-sm transition-colors"
          >
            {initialData ? 'Cập nhật thông tin chi nhánh' : 'Khởi tạo chi nhánh mới'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default FormCreateRestaurant;
