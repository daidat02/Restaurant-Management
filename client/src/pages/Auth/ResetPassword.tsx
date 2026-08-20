import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Eye, EyeOff, CircleAlert, CheckCircle2, KeyRound } from 'lucide-react';
import { CustomInput } from '@/components/FormInput';
import Logo from '@/assets/logo_app.svg';
import { forgotPasswordReset } from '@/api/auth.api';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      setTimeout(() => navigate('/'), 1800);
    } else {
      setErrorMsg(result.message || 'Đặt lại mật khẩu thất bại, vui lòng thử lại.');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-[420px] flex flex-col my-auto">
        <div className="flex items-center gap-2 mb-8">
          <img src={Logo} className="h-12 w-auto" alt="Logo" />
        </div>

        <h1 className="text-3xl font-medium text-gray-900 mb-2">Đặt Lại Mật Khẩu</h1>
        <p className="text-sm text-gray-500 mb-8">
          Nhập mật khẩu mới cho tài khoản của bạn.
        </p>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <CustomInput
            label="Mật Khẩu Mới"
            type={showPassword ? 'text' : 'password'}
            placeholder="Input password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<KeyRound className="w-5 h-5 text-cerulean-blue-600" />}
            actionButton={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            }
          />

          <CustomInput
            label="Xác Nhận Mật Khẩu"
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            icon={<CheckCircle2 className="w-5 h-5 text-cerulean-blue-600" />}
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
            {loading ? 'Đang xử lý...' : 'Đặt Lại Mật Khẩu'}
          </button>
        </form>

        {errorMsg && (
          <p className="text-center text-sm text-gray-600 mt-6">
            Liên kết hết hạn hoặc không hợp lệ?{' '}
            <Link to="/forgot-password" className="font-semibold hover:underline text-cerulean-blue-600">
              Yêu cầu lại link mới
            </Link>
          </p>
        )}

        <div className="text-center text-sm text-gray-600 mt-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="font-semibold hover:underline text-cerulean-blue-600"
          >
            Quay lại trang đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
}