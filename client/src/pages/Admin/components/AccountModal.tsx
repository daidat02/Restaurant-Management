import { useState } from 'react';
import { X, User, KeyRound, LogOut, Mail, Phone } from 'lucide-react';
import { DialogCustom } from '@/components/DialogCustom';
import { CustomInput } from '@/components/FormInput';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';

interface AccountModalProps {
  isOpen: boolean;
  onChangeOpenModal: () => void;
}

type Tab = 'info' | 'security';

export default function AccountModal({ isOpen, onChangeOpenModal }: AccountModalProps) {
  const { user, logout } = useAuth();
  const { editProfile, changePassword } = useUser();

  const [tab, setTab] = useState<Tab>('info');
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveInfo = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    await editProfile({ name: name.trim(), phone });
    setIsSaving(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return;
    if (newPassword !== confirmPassword) return;
    setIsSaving(true);
    const ok = await changePassword(currentPassword, newPassword);
    setIsSaving(false);
    if (ok) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleLogout = () => {
    onChangeOpenModal();
    logout();
  };

  const menuItems: { id: Tab; title: string; icon: typeof User }[] = [
    { id: 'info', title: 'Thông Tin Cá Nhân', icon: User },
    { id: 'security', title: 'Đổi Mật Khẩu', icon: KeyRound },
  ];

  return (
    <DialogCustom
      open={isOpen}
      onOpenChange={() => onChangeOpenModal()}
      contentClass="!max-w-lg w-[95vw] rounded-2xl overflow-hidden p-0"
      content={
        <div className="flex flex-col bg-white text-slate-700">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-cerulean-blue-50 flex items-center justify-center">
                <span className="text-sm font-bold text-cerulean-blue-600 uppercase">
                  {(user?.name || 'U').slice(0, 1)}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Tài Khoản Cá Nhân</h3>
                <p className="text-[11px] text-slate-400 capitalize">{user?.role || ''}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChangeOpenModal()}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all"
              aria-label="Đóng modal"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row">
            {/* Menu bên trái */}
            <div className="sm:w-[170px] shrink-0 border-b sm:border-b-0 sm:border-r border-slate-100 p-3 flex sm:flex-col gap-1.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isSelected = tab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={`flex items-center gap-2.5 px-3 py-2 h-9 rounded-xl text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-cerulean-blue-600 text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{item.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Nội dung */}
            <div className="flex-1 min-w-0 p-5 max-h-[420px] overflow-y-auto custom-scrollbar">
              {tab === 'info' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <User size={15} className="text-cerulean-blue-600" />
                    <h4 className="text-sm font-bold text-slate-900">Thông Tin Cá Nhân</h4>
                  </div>
                  <CustomInput label="Họ và tên" value={name} onChange={(e) => setName(e.target.value)} />
                  <CustomInput label="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Mail size={14} />
                    <span>{user?.email}</span>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={isSaving || !name.trim()}
                      onClick={handleSaveInfo}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-cerulean-blue-600 hover:bg-cerulean-blue-700 disabled:bg-cerulean-blue-300 transition-all"
                    >
                      {isSaving ? 'Đang lưu...' : 'Lưu thông tin'}
                    </button>
                  </div>
                </div>
              )}

              {tab === 'security' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <KeyRound size={15} className="text-cerulean-blue-600" />
                    <h4 className="text-sm font-bold text-slate-900">Đổi Mật Khẩu</h4>
                  </div>
                  <CustomInput
                    type="password"
                    label="Mật khẩu hiện tại"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <CustomInput
                    type="password"
                    label="Mật khẩu mới"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <CustomInput
                    type="password"
                    label="Xác nhận mật khẩu mới"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={isSaving || !currentPassword || !newPassword || newPassword !== confirmPassword}
                      onClick={handleChangePassword}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-cerulean-blue-600 hover:bg-cerulean-blue-700 disabled:bg-cerulean-blue-300 transition-all"
                    >
                      {isSaving ? 'Đang đổi...' : 'Đổi mật khẩu'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer: Logout */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Phone size={12} />
              {user?.phone || 'Chưa cập nhật SĐT'}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-all"
            >
              <LogOut size={14} />
              Đăng xuất
            </button>
          </div>
        </div>
      }
    />
  );
}
