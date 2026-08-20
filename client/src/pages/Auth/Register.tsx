import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { GoogleAuthButton } from './Components/GoogleAuthButton';
import { AuthField } from './Components/AuthField';

/** Validate số điện thoại Việt Nam: bắt đầu 0 hoặc +84, 10-11 chữ số. */
const isValidVietnamesePhone = (phone: string): boolean => {
  const normalized = phone.replace(/\s+/g, '');
  if (/^\+84\d{9,10}$/.test(normalized)) return true;
  if (/^0\d{9,10}$/.test(normalized)) return true;
  return false;
};

export default function Register() {
  const { registerOwner } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!name || !email || !phone || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ thông tin.');
      return;
    }
    if (!isValidVietnamesePhone(phone)) {
      setErrorMsg('Số điện thoại không hợp lệ (10-11 chữ số, bắt đầu 0 hoặc +84).');
      return;
    }
    if (!agreeTerms) {
      setErrorMsg('Vui lòng đồng ý với Điều khoản sử dụng và Chính sách bảo mật.');
      return;
    }
    setLoading(true);
    const result = await registerOwner({ name, email, phone, password });
    setLoading(false);
    if (result.success) {
      // Đăng ký thành công → chuyển sang trang nhập mã OTP xác thực email.
      navigate(`/verify-otp?email=${encodeURIComponent(email.trim())}`);
    } else {
      setErrorMsg(result.message || 'Đăng ký thất bại.');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Tạo tài khoản mới</h1>
      <p className="mt-1.5 text-sm text-slate-500">Bắt đầu quản lý nhà hàng của bạn ngay hôm nay.</p>

      <form className="mt-7 flex flex-col gap-5" onSubmit={handleSubmit}>
        <AuthField
          label="Họ và tên"
          placeholder="Nguyễn Văn A"
          value={name}
          onChange={setName}
          autoComplete="name"
        />
        <AuthField
          label="Email"
          type="email"
          placeholder="ban@nhahangos.vn"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <AuthField
          label="Số điện thoại"
          type="tel"
          placeholder="0xxxxxxxxx"
          value={phone}
          onChange={setPhone}
          autoComplete="tel"
        />
        <AuthField
          label="Mật khẩu"
          type="password"
          placeholder="Tối thiểu 6 ký tự"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />

        <label className="flex items-start gap-2.5 text-[13px] text-slate-600">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-cerulean-blue-600"
          />
          <span>
            Tôi đã đọc và đồng ý với{' '}
            <Link to="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-cerulean-blue-600 hover:underline">
              Điều khoản sử dụng
            </Link>{' '}
            và{' '}
            <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-cerulean-blue-600 hover:underline">
              Chính sách bảo mật
            </Link>
          </span>
        </label>

        {errorMsg && <p className="text-[13px] text-rose-600">{errorMsg}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-cerulean-blue-600 px-6 py-3 text-[15px] font-semibold text-white shadow-[0_8px_24px_-12px_rgba(26,113,246,0.9)] transition hover:bg-cerulean-blue-700 active:scale-[0.985] disabled:opacity-60"
        >
          {loading ? 'Đang tạo tài khoản...' : 'Đăng ký miễn phí'}
        </button>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          hoặc
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <GoogleAuthButton />
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Đã có tài khoản?{' '}
        <Link to="/login" className="font-semibold text-cerulean-blue-600 hover:underline">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}