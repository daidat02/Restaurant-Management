import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

export default function VerifyOtp() {
  const { verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  const [otp, setOtp] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Đếm ngược trước khi cho phép "Gửi lại mã" (60s).
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setNotice('');
    if (!email) {
      setErrorMsg('Thiếu email. Vui lòng thử lại từ trang đăng ký.');
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setErrorMsg('Vui lòng nhập đủ 6 chữ số mã xác thực.');
      return;
    }
    setLoading(true);
    const result = await verifyOtp(email, otp);
    setLoading(false);
    if (result.success) {
      // Xác thực xong → đã tự động đăng nhập → vào wizard tạo nhà hàng đầu tiên.
      navigate('/onboarding');
    } else {
      setErrorMsg(result.message || 'Mã xác thực không đúng, vui lòng thử lại.');
    }
  };

  const handleResend = async () => {
    setErrorMsg('');
    setNotice('');
    if (!email) return;
    setResending(true);
    const result = await resendOtp(email);
    setResending(false);
    if (result.success) {
      setNotice('Đã gửi lại mã xác thực. Kiểm tra email của bạn.');
      setCooldown(60);
    } else {
      // Cooldown từ server (OTP_COOLDOWN) → đếm ngược theo thông báo nếu có thể.
      setErrorMsg(result.message || 'Không thể gửi lại mã lúc này.');
      setCooldown(60);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Xác thực email</h1>
      <p className="mt-1.5 text-sm text-slate-500">
        Nhập mã OTP 6 chữ số đã gửi tới{' '}
        <span className="font-semibold text-slate-700">{email || 'email của bạn'}</span> để hoàn
        tất đăng ký.
      </p>

      <form className="mt-7 flex flex-col gap-5" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-slate-800">
            Mã xác thực<em className="ml-0.5 not-italic text-rose-600">*</em>
          </label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="••••••"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-center text-xl font-bold tracking-[0.5em] text-slate-900 shadow-[0_1px_2px_rgba(11,18,43,0.04)] outline-none transition placeholder:text-slate-300 focus:border-cerulean-blue-400 focus:ring-4 focus:ring-cerulean-blue-100"
          />
        </div>

        {errorMsg && <p className="text-[13px] text-rose-600">{errorMsg}</p>}
        {notice && <p className="text-[13px] text-emerald-600">{notice}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-cerulean-blue-600 px-6 py-3 text-[15px] font-semibold text-white shadow-[0_8px_24px_-12px_rgba(26,113,246,0.9)] transition hover:bg-cerulean-blue-700 active:scale-[0.985] disabled:opacity-60"
        >
          {loading ? 'Đang xác thực...' : 'Xác thực'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Không nhận được mã?{' '}
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
          className="font-semibold text-cerulean-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
        >
          {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : resending ? 'Đang gửi...' : 'Gửi lại mã'}
        </button>
      </p>
    </div>
  );
}