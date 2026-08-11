import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { SettingCard, Field } from './settings-ui';
import { useAuth } from '@/hooks/use-auth';
import type { IUser } from '@/types/user.type';

type RegisterSave = (key: string, handler?: () => Promise<boolean>) => void;

/** Tab "Tài khoản" — mọi role. Thông tin cá nhân + đổi mật khẩu. */
export default function TabAccount({
  isSuperAdmin,
  onDirty,
  registerSave,
}: {
  isSuperAdmin: boolean;
  onDirty: () => void;
  registerSave?: RegisterSave;
}) {
  const { user, updateProfile, changePassword } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Lưu thông tin cá nhân qua nút "Lưu cài đặt" chung của trang.
  // Trả true → parent tắt trạng thái dirty trên thanh action bar.
  const handleSaveInfo = useCallback(async (): Promise<boolean> => {
    if (!name.trim()) {
      toast.error('Vui lòng nhập họ và tên!!!', { position: 'top-right' });
      return false;
    }
    setSavingInfo(true);
    // Chỉ gửi những trường đã thay đổi để tránh ghi đè dữ liệu khác
    const payload: Partial<IUser> = {};
    if (name !== user?.name) payload.name = name.trim();
    if (phone !== user?.phone) payload.phone = phone.trim();
    const result = await updateProfile(payload);
    setSavingInfo(false);
    if (result.success) {
      toast.success(result.message || 'Cập nhật thông tin thành công!', { position: 'top-right' });
      return true;
    }
    toast.error(result.message || 'Cập nhật thông tin thất bại!!!', { position: 'top-right' });
    return false;
  }, [name, phone, user, updateProfile]);

  useEffect(() => {
    registerSave?.('account', handleSaveInfo);
  }, [registerSave, handleSaveInfo]);

  // Đổi mật khẩu — gọi API độc lập, không qua nút Lưu chung
  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error('Vui lòng nhập mật khẩu hiện tại!!!', { position: 'top-right' });
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự!!!', { position: 'top-right' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Xác nhận mật khẩu mới không khớp!!!', { position: 'top-right' });
      return;
    }
    setSavingPassword(true);
    const result = await changePassword(currentPassword, newPassword);
    setSavingPassword(false);
    if (result.success) {
      toast.success(result.message || 'Đổi mật khẩu thành công!', { position: 'top-right' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      return;
    }
    toast.error(result.message || 'Đổi mật khẩu thất bại!!!', { position: 'top-right' });
  };

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {/* Thông tin cá nhân */}
      <SettingCard
        title="Thông tin cá nhân"
        description={isSuperAdmin ? 'Thông tin tài khoản quản trị nền tảng' : 'Thông tin tài khoản của bạn'}
      >
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cerulean-blue-100 text-xl font-extrabold text-cerulean-blue-700">
            {(name || user?.name || 'U').charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900">Ảnh đại diện</p>
            <p className="text-xs text-slate-400">JPG, PNG hoặc SVG · tối đa 2MB</p>
          </div>
          <button
            onClick={onDirty}
            className="ml-auto rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-cerulean-blue-300 hover:text-cerulean-blue-600"
          >
            Tải ảnh lên
          </button>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Họ và tên"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              onDirty();
            }}
          />
          <Field
            label="Số điện thoại"
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              onDirty();
            }}
          />
          <div className="sm:col-span-2">
            <Field
              label="Email"
              type="email"
              value={email}
              disabled
              onChange={(e) => {
                setEmail(e.target.value);
                onDirty();
              }}
            />
            <p className="mt-1 text-[11px] text-slate-400">Email dùng để đăng nhập, không thể thay đổi.</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          Thay đổi được lưu qua nút &quot;Lưu cài đặt&quot; ở góc dưới bên phải.
        </p>
        {savingInfo && (
          <p className="mt-2 flex items-center gap-2 text-xs font-medium text-cerulean-blue-600">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang lưu thông tin...
          </p>
        )}
      </SettingCard>

      {/* Đổi mật khẩu */}
      <SettingCard title="Đổi mật khẩu" description="Cập nhật mật khẩu đăng nhập của bạn">
        <div className="grid grid-cols-1 gap-4">
          <Field
            label="Mật khẩu hiện tại"
            type="password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              onDirty();
            }}
          />
          <Field
            label="Mật khẩu mới"
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              onDirty();
            }}
            hint="Tối thiểu 6 ký tự"
          />
          <Field
            label="Xác nhận mật khẩu mới"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              onDirty();
            }}
          />
          <div className="pt-1">
            <button
              type="button"
              onClick={handleChangePassword}
              disabled={savingPassword}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-cerulean-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-cerulean-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
              Cập nhật mật khẩu
            </button>
          </div>
        </div>
      </SettingCard>
    </div>
  );
}