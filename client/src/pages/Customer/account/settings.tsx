import { useState } from 'react';
import { KeyRound, BellRing, Loader2, Eye, EyeOff } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { useAuth } from '@/hooks/use-auth';
import { Switch } from '@/components/ui/switch';
import { CustomInput } from '@/components/FormInput';

export default function AccountSettings() {
  const { changePassword, editProfile, isLoading } = useUser();
  const { user } = useAuth();

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [isSuccess, setIsSuccess] = useState(false);

  // Cấu hình thông báo
  const [notificationEnabled, setNotificationEnabled] = useState(user?.notificationEnabled ?? true);
  const [orderNotifications, setOrderNotifications] = useState(true);
  const [promoNotifications, setPromoNotifications] = useState(false);
  const [isSavingNoti, setIsSavingNoti] = useState(false);

  const toggleShowPassword = (field: string) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const validatePassword = () => {
    const nextErrors: typeof passwordErrors = {};
    if (!passwordForm.currentPassword) {
      nextErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    }
    if (!passwordForm.newPassword) {
      nextErrors.newPassword = 'Vui lòng nhập mật khẩu mới';
    } else if (passwordForm.newPassword.length < 6) {
      nextErrors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự';
    }
    if (!passwordForm.confirmPassword) {
      nextErrors.confirmPassword = 'Vui lòng nhập lại mật khẩu mới';
    } else if (passwordForm.confirmPassword !== passwordForm.newPassword) {
      nextErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }
    setPasswordErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword()) return;

    const result = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
    if (result) {
      setIsSuccess(true);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setIsSuccess(false), 3000);
    }
  };

  const handleToggleNotification = async (value: boolean) => {
    setNotificationEnabled(value);
    setIsSavingNoti(true);
    try {
      await editProfile({ notificationEnabled: value });
    } finally {
      setIsSavingNoti(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ---------- ĐỔI MẬT KHẨU ---------- */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-orange-500" />
            Đổi mật khẩu
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Sử dụng mật khẩu mạnh gồm ít nhất 6 ký tự để bảo mật tài khoản
          </p>
        </div>

        <form onSubmit={handleChangePassword} className="p-6 space-y-5">
          <div className="max-w-lg space-y-5">
            <CustomInput
              label="Mật khẩu hiện tại"
              type={showPassword.currentPassword ? 'text' : 'password'}
              placeholder="Nhập mật khẩu hiện tại"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
              }
              error={passwordErrors.currentPassword}
              actionButton={
                <button
                  type="button"
                  onClick={() => toggleShowPassword('currentPassword')}
                  className="text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword.currentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />

            <CustomInput
              label="Mật khẩu mới"
              type={showPassword.newPassword ? 'text' : 'password'}
              placeholder="Nhập mật khẩu mới"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              error={passwordErrors.newPassword}
              actionButton={
                <button
                  type="button"
                  onClick={() => toggleShowPassword('newPassword')}
                  className="text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword.newPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />

            <CustomInput
              label="Xác nhận mật khẩu mới"
              type={showPassword.confirmPassword ? 'text' : 'password'}
              placeholder="Nhập lại mật khẩu mới"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
              }
              error={passwordErrors.confirmPassword}
              actionButton={
                <button
                  type="button"
                  onClick={() => toggleShowPassword('confirmPassword')}
                  className="text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword.confirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />
          </div>

          {isSuccess && (
            <p className="text-xs font-semibold text-emerald-600 animate-in fade-in slide-in-from-top-1">
              Đổi mật khẩu thành công!
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-6 py-2.5 text-xs font-bold text-white transition-all hover:bg-orange-500 shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Đổi mật khẩu
            </button>
          </div>
        </form>
      </div>

      {/* ---------- THÔNG BÁO ---------- */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BellRing className="h-4 w-4 text-orange-500" />
            Thông báo
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Tùy chỉnh cách chúng tôi gửi thông báo đến bạn
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {/* Thông báo qua email */}
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Nhận thông báo qua email</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Nhận email về trạng thái đơn hàng và hoạt động tài khoản
              </p>
            </div>
            <Switch
              checked={notificationEnabled}
              onCheckedChange={handleToggleNotification}
              disabled={isSavingNoti}
              className="data-checked:bg-orange-500"
            />
          </div>

          {/* Thông báo trạng thái đơn hàng */}
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Cập nhật trạng thái đơn hàng</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Thông báo khi đơn hàng của bạn thay đổi trạng thái
              </p>
            </div>
            <Switch
              checked={orderNotifications}
              onCheckedChange={setOrderNotifications}
              className="data-checked:bg-orange-500"
            />
          </div>

          {/* Ưu đãi / khuyến mãi */}
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Ưu đãi & khuyến mãi</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Nhận thông tin chương trình khuyến mãi, món mới từ NhamNhi
              </p>
            </div>
            <Switch
              checked={promoNotifications}
              onCheckedChange={setPromoNotifications}
              className="data-checked:bg-orange-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
