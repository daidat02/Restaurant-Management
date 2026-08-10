import { useState } from 'react';
import { SettingCard, Field } from './settings-ui';
import { useAuth } from '@/hooks/use-auth';

/** Tab "Tài khoản" — mọi role. Thông tin cá nhân + đổi mật khẩu. */
export default function TabAccount({
  isSuperAdmin,
  onDirty,
}: {
  isSuperAdmin: boolean;
  onDirty: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
            hint="Tối thiểu 8 ký tự, gồm chữ và số"
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
              onClick={onDirty}
              className="flex h-10 items-center justify-center rounded-xl bg-cerulean-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-cerulean-blue-700"
            >
              Cập nhật mật khẩu
            </button>
          </div>
        </div>
      </SettingCard>
    </div>
  );
}