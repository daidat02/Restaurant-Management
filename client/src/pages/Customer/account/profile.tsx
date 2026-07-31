import { useRef, useState } from 'react';
import { Camera, Loader2, Save } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { uploadSingleFile } from '@/api/upload.api';
import { CustomInput } from '@/components/FormInput';

export default function AccountProfile() {
  const { user } = useAuth();
  const { editProfile, isLoading } = useUser();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(user?.avatar || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const nextErrors: { name?: string; phone?: string } = {};
    if (!form.name.trim()) nextErrors.name = 'Họ tên không được để trống';
    if (form.phone && !/^[0-9+]{8,15}$/.test(form.phone.trim())) {
      nextErrors.phone = 'Số điện thoại không hợp lệ';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsUploading(true);
    try {
      let avatarUrl = user?.avatar;
      // Nếu có ảnh mới chọn thì upload lên Cloudinary trước
      if (avatarFile) {
        const uploadRes = await uploadSingleFile(avatarFile);
        avatarUrl = uploadRes?.url || avatarUrl;
      }
      console.log('Submitting profile update:', {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        avatar: avatarUrl,
      });
      await editProfile({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        avatar: avatarUrl,
      });

      // Reset state ảnh đã xử lý xong
      setAvatarFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelAvatar = () => {
    setAvatarPreview(user?.avatar || '');
    setAvatarFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      {/* HEADER */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Trang cá nhân</h2>
          <p className="text-xs text-gray-400 mt-0.5">Cập nhật thông tin hiển thị của bạn</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {/* ---------- AVATAR ---------- */}
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="h-24 w-24 rounded-full overflow-hidden bg-orange-100 flex items-center justify-center text-orange-500 border-4 border-white shadow ring-1 ring-gray-200">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl font-bold">
                  {form.name ? form.name.charAt(0).toUpperCase() : '?'}
                </span>
              )}
            </div>

            {/* NÚT CHỤP ẢNH */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg border-2 border-white hover:bg-orange-600 transition-colors"
              aria-label="Đổi ảnh đại diện"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-gray-800">Ảnh đại diện</p>
            <p className="text-xs text-gray-400 max-w-xs">
              Hỗ trợ định dạng JPG, PNG, WEBP. Dung lượng tối đa 5MB.
            </p>
            {avatarFile && (
              <button
                type="button"
                onClick={handleCancelAvatar}
                className="text-xs font-semibold text-red-500 hover:text-red-700"
              >
                Hoàn tác ảnh
              </button>
            )}
          </div>
        </div>

        {/* ---------- FORM THÔNG TIN ---------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <CustomInput
            label="Họ và tên"
            placeholder="Nhập họ và tên"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
            className={errors.name ? 'border-red-500 focus:border-red-500' : ''}
          />

          <CustomInput
            label="Email"
            value={form.email}
            disabled
            className="bg-gray-50 text-gray-400 cursor-not-allowed"
          />

          <CustomInput
            label="Số điện thoại"
            placeholder="Nhập số điện thoại"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            error={errors.phone}
            className={errors.phone ? 'border-red-500 focus:border-red-500' : ''}
          />

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm text-gray-900">Địa chỉ giao hàng</label>
            <textarea
              rows={2}
              placeholder="Nhập địa chỉ giao hàng mặc định (tỉnh/thành, quận/huyện, đường...)"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm placeholder:text-gray-400 transition-colors focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none"
            />
          </div>
        </div>

        {/* ---------- HÀNH ĐỘNG ---------- */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            type="submit"
            disabled={isLoading || isUploading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-6 py-2.5 text-xs font-bold text-white transition-all hover:bg-orange-500 shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading || isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isUploading ? 'Đang tải ảnh...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </div>
  );
}
