import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CircleAlert, CheckCircle2, Mail } from 'lucide-react';
import { CustomInput } from '@/components/FormInput';
import Logo from '@/assets/logo_app.svg';
import { forgotPassword } from '@/api/auth.api';

export default function ForgotPassword() {
  const navigate = useNavigate();
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
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-[420px] flex flex-col my-auto">
        <div className="flex items-center gap-2 mb-8">
          <img src={Logo} className="h-12 w-auto" alt="Logo" />
        </div>

        <h1 className="text-3xl font-medium text-gray-900 mb-2">Quên Mật Khẩu</h1>
        <p className="text-sm text-gray-500 mb-8">
          Nhập email đăng nhập của bạn, chúng tôi sẽ gửi link đặt lại mật khẩu.
        </p>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <CustomInput
            label="Email"
            type="email"
            placeholder="Input email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="w-5 h-5 text-cerulean-blue-600" />}
          />

          {errorMsg && (
            <div className="flex items-center gap-2 text-red-500">
              <CircleAlert className="w-4 h-4" />
              <p className="text-sm font-normal">{errorMsg}</p>
            </div>
          )}

          {notice && (
            <div className="flex items-start gap-2 text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-sm font-normal">{notice}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-medium py-2.5 rounded-lg transition mt-2 filter hover:brightness-90 dynamic-btn-shadow bg-cerulean-blue-600 disabled:opacity-60"
          >
            {loading ? 'Đang gửi...' : 'Gửi Link Đặt Lại Mật Khẩu'}
          </button>
        </form>

        <div className="text-center text-sm text-gray-600 mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="font-semibold hover:underline text-cerulean-blue-600"
          >
            Quay lại trang đăng nhập
          </button>
          <Link to="/register" className="text-gray-500 hover:underline">
            Bạn chưa có tài khoản? Đăng ký
          </Link>
        </div>
      </div>
    </div>
  );
}