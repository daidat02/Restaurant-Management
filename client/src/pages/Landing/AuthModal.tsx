import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, UtensilsCrossed, Check } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type AuthMode = 'login' | 'owner';

const getHomePathByRole = (role?: string) => {
  switch (role) {
    case 'super-admin':
      return '/super-admin';
    case 'admin':
      return '/admin';
    case 'manager':
      return '/manager';
    case 'staff':
      return '/staff';
    default:
      return '/';
  }
};

const TABS: { key: AuthMode; label: string }[] = [
  { key: 'login', label: 'Đăng nhập' },
  { key: 'owner', label: 'Chủ nhà hàng' },
];

interface AuthModalProps {
  open: boolean;
  initialMode?: AuthMode;
  onClose: () => void;
}

interface FieldProps {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}

function Field({ label, type = 'text', placeholder, value, onChange, autoComplete }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-900">{label}</label>
      <Input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="h-10 bg-white"
      />
    </div>
  );
}

function LoginView({ onSwitchToOwner }: { onSwitchToOwner: () => void }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!identifier || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ email/SĐT và mật khẩu.');
      return;
    }
    setLoading(true);
    const result = await login({ email: identifier, password });
    setLoading(false);
    if (result.success) {
      navigate(getHomePathByRole(result.user?.role));
    } else {
      setErrorMsg(result.message || 'Đăng nhập thất bại');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field
        label="Email hoặc số điện thoại"
        placeholder="quanly@nhahang.vn"
        value={identifier}
        onChange={setIdentifier}
        autoComplete="username"
      />
      <Field
        label="Mật khẩu"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />
      {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
      <Button
        type="submit"
        disabled={loading}
        className="w-full h-10 bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white font-semibold"
      >
        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </Button>
      <p className="text-sm text-gray-600 text-center">
        Bạn là chủ nhà hàng?{' '}
        <button
          type="button"
          onClick={onSwitchToOwner}
          className="font-semibold text-cerulean-blue-600 hover:underline"
        >
          Đăng ký tại đây
        </button>
      </p>
    </form>
  );
}

function OwnerView() {
  const { registerOwner } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!name || !email || !phone || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ thông tin.');
      return;
    }
    setLoading(true);
    const result = await registerOwner({ name, email, phone, password });
    setLoading(false);
    if (result.success) {
      // Đã tự động đăng nhập trong registerOwner → vào wizard tạo nhà hàng đầu tiên
      window.location.href = '/onboarding';
    } else {
      setErrorMsg(result.message || 'Đăng ký thất bại');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg bg-cerulean-blue-50 border border-cerulean-blue-100 p-4">
        <p className="text-sm text-cerulean-blue-700 leading-relaxed">
          <span className="font-semibold">Miễn phí 30 ngày dùng thử</span> cho nhà hàng đầu tiên. Sau
          đó <span className="font-semibold">299.000đ/nhà hàng/tháng</span>.
        </p>
      </div>
      <Field label="Họ và tên" placeholder="Nguyễn Văn A" value={name} onChange={setName} autoComplete="name" />
      <Field label="Email" type="email" placeholder="example@gmail.com" value={email} onChange={setEmail} autoComplete="email" />
      <Field label="Số điện thoại" type="tel" placeholder="0123456789" value={phone} onChange={setPhone} autoComplete="tel" />
      <Field
        label="Mật khẩu"
        type="password"
        placeholder="Tạo mật khẩu"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
      />
      {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
      <Button
        type="submit"
        disabled={loading}
        className="w-full h-10 bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white font-semibold"
      >
        {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản chủ nhà hàng'}
      </Button>
      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700">
        <Check className="w-4 h-4 shrink-0" />
        Tạo tài khoản xong, hệ thống sẽ đưa bạn vào trình hướng dẫn tạo nhà hàng đầu tiên.
      </div>
    </form>
  );
}

export default function AuthModal({ open, initialMode = 'login', onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <a href="#top" onClick={onClose}>
            <span className="inline-flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cerulean-blue-600 text-white shadow-sm">
                <UtensilsCrossed className="h-5 w-5" />
              </span>
              <span className="text-lg font-extrabold tracking-tight text-gray-900">NhàHàng OS</span>
            </span>
          </a>

          <div className="mt-6 grid w-full grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setMode(t.key)}
                className={`rounded-md px-2 py-2 text-sm font-medium transition ${
                  mode === t.key
                    ? 'bg-white text-cerulean-blue-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {mode === 'login' && <LoginView onSwitchToOwner={() => setMode('owner')} />}
        {mode === 'owner' && (
          <>
            <OwnerView />
            <p className="mt-4 text-center text-sm text-gray-600">
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="font-semibold text-cerulean-blue-600 hover:underline"
              >
                Đăng nhập
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}