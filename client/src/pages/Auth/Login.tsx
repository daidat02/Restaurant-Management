import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { AuthField } from './Components/AuthField';

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

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }
    setLoading(true);
    const result = await login({ email, password });
    setLoading(false);

    if (result.success) {
      navigate(getHomePathByRole(result.user?.role));
      return;
    }
    // Email chưa xác thực (đăng ký OTP chưa hoàn tất) → đưa về trang nhập mã xác thực.
    if (result.status === 403 && result.error?.errorCode === 'EMAIL_NOT_VERIFIED') {
      navigate(`/verify-otp?email=${encodeURIComponent(email.trim())}`);
      return;
    }
    setErrorMsg(result.message || 'Đăng nhập thất bại.');
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Chào mừng trở lại</h1>
      <p className="mt-1.5 text-sm text-slate-500">Đăng nhập để tiếp tục quản lý nhà hàng của bạn.</p>

      <form className="mt-7 flex flex-col gap-5" onSubmit={handleSubmit}>
        <AuthField
          label="Email"
          type="email"
          placeholder="ban@nhahangos.vn"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <div>
          <AuthField
            label="Mật khẩu"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
          <div className="mt-2 flex justify-end">
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-cerulean-blue-600 hover:text-cerulean-blue-700 hover:underline"
            >
              Quên mật khẩu?
            </Link>
          </div>
        </div>

        {errorMsg && <p className="text-[13px] text-rose-600">{errorMsg}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-cerulean-blue-600 px-6 py-3 text-[15px] font-semibold text-white shadow-[0_8px_24px_-12px_rgba(26,113,246,0.9)] transition hover:bg-cerulean-blue-700 active:scale-[0.985] disabled:opacity-60"
        >
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>

      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="font-semibold text-cerulean-blue-600 hover:underline">
          Đăng ký miễn phí
        </Link>
      </p>
    </div>
  );
}