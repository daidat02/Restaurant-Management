// components/LoginForm.tsx
import React, { useState } from 'react';
import { Eye, EyeOff, CheckCircle2, CircleAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { CustomInput } from '@/components/FormInput';
import Logo from '@/assets/logo_app.svg';
import { GoogleAuthButton } from './GoogleAuthButton';

interface LoginFormProps {
  onSwitchToSignUp: () => void;
  isLogoVisible?: boolean;
  color?: string; // Nhận vào tên màu tùy biến của Tailwind (Ví dụ: 'emerald-600', 'red-500',...)
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSwitchToSignUp,
  isLogoVisible = true,
  color,
}) => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ email và mật khẩu!');
      return;
    }
    const result = await login({ email, password });
    if (result.success) {
      navigate('/admin');
    } else {
      setErrorMsg(result.message || 'Có lỗi xảy ra');
    }
  };

  // Xác định màu chữ và màu nền động dựa theo prop color giống cấu trúc bạn yêu cầu
  const textColorClass = color ? `text-${color}` : 'text-cerulean-blue-600';
  const bgColorClass = color ? `bg-${color}` : 'bg-cerulean-blue-600';
  const ringColorClass = color ? `focus:ring-${color}` : 'focus:ring-cerulean-blue-500';

  return (
    <div className="w-full max-w-[420px] flex flex-col my-auto">
      {isLogoVisible && (
        <div className="flex items-center gap-2 mb-8">
          <img src={Logo} className="h-12 w-auto" alt="Logo" />
        </div>
      )}

      <h1 className="text-3xl font-medium text-gray-900 mb-2">Đăng Nhập</h1>
      <p className="text-sm text-gray-500 mb-8">
        Chào mừng bạn trở lại! Vui lòng nhập thông tin tài khoản để tiếp tục.
      </p>

      <GoogleAuthButton />

      <div className="flex items-center gap-4 mb-6">
        <div className="h-px bg-gray-200 flex-1"></div>
        <span className="text-sm text-gray-400 font-medium uppercase">Or</span>
        <div className="h-px bg-gray-200 flex-1"></div>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <CustomInput
          label="Tên Đăng Nhập"
          type="email"
          placeholder="Input email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<CheckCircle2 className={`w-5 h-5 ${textColorClass}`} />}
          className={color ? `focus:border-${color} focus:ring-${color}` : ''}
        />

        <CustomInput
          label="Mật Khẩu"
          type={showPassword ? 'text' : 'password'}
          placeholder="Input password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={color ? `focus:border-${color} focus:ring-${color}` : ''}
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

        {errorMsg && (
          <div className="flex items-center gap-2 mb-2 text-red-500">
            <CircleAlert className="w-4 h-4" />
            <p className="text-sm font-normal">{errorMsg}</p>
          </div>
        )}

        <div className="flex items-center justify-between mt-2 mb-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              /* 🎨 Đổi màu class tương tác cho Checkbox */
              className={`w-4 h-4 rounded border-gray-300 ${textColorClass} ${ringColorClass}`}
            />
            <span className="text-sm text-gray-700 font-medium group-hover:text-gray-900 transition">
              Nhớ mật khẩu
            </span>
          </label>
          <button
            type="button"
            /* 🎨 Đổi màu class cho Quên Mật Khẩu */
            className={`text-sm font-medium hover:underline ${textColorClass}`}
          >
            Quên Mật Khẩu?
          </button>
        </div>

        <button
          type="submit"
          /* 🎨 Đổi màu nền class cho nút Đăng Nhập chính */
          className={`w-full text-white font-medium py-2.5 rounded-lg transition mt-2 filter hover:brightness-90 dynamic-btn-shadow ${bgColorClass}`}
        >
          Đăng Nhập
        </button>
      </form>

      <p className="text-center text-sm text-gray-600 mt-6">
        Bạn chưa có tài khoản?{' '}
        <button
          type="button"
          onClick={onSwitchToSignUp}
          /* 🎨 Đổi màu class cho nút chuyển sang Đăng Ký */
          className={`font-semibold hover:underline ${textColorClass}`}
        >
          Đăng Ký
        </button>
      </p>
    </div>
  );
};
