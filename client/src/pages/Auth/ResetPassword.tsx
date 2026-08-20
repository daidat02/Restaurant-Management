import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { AuthField } from './Components/AuthField';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { forgotPasswordReset } = useAuth();
  const { token } = useParams<{ token: string }>();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setNotice('');
    if (!token) {
      setErrorMsg('Liên kết đặt lại mật khẩu không hợp lệ.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }
    if (password !== confirm) {
      setErrorMsg('Mật khẩu xác nhận không khớp!');
      return;
    }
    setLoading(true);
    const result = await forgotPasswordReset(token, password);
    setLoading(false);
    if (result.success) {
      setNotice('Đặt lại mật khẩu thành công! Bạn sẽ được chuyển về trang đăng nhập.');
      setTimeout(() => navigate('/login'), 1800);
    } else {
      setErrorMsg(result.message || 'Đặt lại mật khẩu thất bại, vui lòng thử lại.');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Đặt lại mật khẩu</h1>
      <p className="mt-1.5 text-sm text-slate-500">Nhập mật khẩu mới cho tài khoản của bạn.</p>

      <form className="mt-7 flex flex-col gap-5" onSubmit={handleSubmit}>
        <AuthField
          label="Mật khẩu mới"
          type="password"
          placeholder="Mật khẩu mới tối thiểu 6 ký tự"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <AuthField
          label="Xác nhận mật khẩu"
          type="password"
          placeholder="Nhập lại mật khẩu"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />

        {errorMsg && <p className="text-[13px] text-rose-600">{errorMsg}</p>}
        {notice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
            {notice}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-cerulean-blue-600 px-6 py-3 text-[15px] font-semibold text-white shadow-[0_8px_24px_-12px_rgba(26,113,246,0.9)] transition hover:bg-cerulean-blue-700 active:scale-[0.985] disabled:opacity-60"
        >
          {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        {errorMsg ? (
          <>
            Liên kết hết hạn hoặc không hợp lệ?{' '}
            <Link to="/forgot-password" className="font-semibold text-cerulean-blue-600 hover:underline">
              Yêu cầu lại link mới
            </Link>
          </>
        ) : (
          <Link to="/login" className="font-medium text-cerulean-blue-600 hover:underline">
            ← Quay lại đăng nhập
          </Link>
        )}
      </p>
    </div>
  );
}