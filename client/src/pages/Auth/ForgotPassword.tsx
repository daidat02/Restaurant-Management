import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { AuthField } from './Components/AuthField';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setNotice('');
    if (!email) {
      setErrorMsg('Vui lòng nhập email!');
      return;
    }
    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);
    if (result.success) {
      setNotice('Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu cho bạn.');
    } else {
      setErrorMsg(result.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Quên mật khẩu</h1>
      <p className="mt-1.5 text-sm text-slate-500">
        Nhập email đăng nhập của bạn, chúng tôi sẽ gửi link đặt lại mật khẩu.
      </p>

      <form className="mt-7 flex flex-col gap-5" onSubmit={handleSubmit}>
        <AuthField
          label="Email"
          type="email"
          placeholder="ban@nhahangos.vn"
          value={email}
          onChange={setEmail}
          autoComplete="email"
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
          {loading ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link to="/login" className="font-medium text-cerulean-blue-600 hover:underline">
          ← Quay lại đăng nhập
        </Link>
      </p>
    </div>
  );
}