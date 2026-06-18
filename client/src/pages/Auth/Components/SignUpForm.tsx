// components/SignUpForm.tsx
import React, { useState } from 'react';
import { Eye, EyeOff, CircleAlert } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { CustomInput } from '@/components/FormInput';
import Logo from '@/assets/logo.svg';
import { GoogleAuthButton } from './GoogleAuthButton';

interface SignUpFormProps {
  onSwitchToSignIn: () => void;
  isLogoVisible?: boolean;
  color?: string; // Nhận vào tên màu tùy biến của Tailwind (Ví dụ: 'emerald-600', 'red-500',...)
}

export const SignUpForm: React.FC<SignUpFormProps> = ({
  onSwitchToSignIn,
  isLogoVisible = true,
  color,
}) => {
  const { register } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email || !password || !name) {
      setErrorMsg('Vui lòng nhập đầy đủ thông tin!');
      return;
    }
    const result = await register({ email, password, name });
    if (result.success) {
      onSwitchToSignIn(); // Đăng ký xong chuyển thẳng về login
    } else {
      setErrorMsg(result.message || 'Có lỗi xảy ra');
    }
  };

  // Xác định màu chữ và màu nền động dựa theo prop color giống hệt LoginForm
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

      <h1 className="text-3xl font-medium text-gray-900 mb-2">Đăng Ký</h1>
      <p className="text-sm text-gray-500 mb-8">
        Tạo tài khoản để bắt đầu quản lý công việc của bạn một cách dễ dàng.
      </p>

      <GoogleAuthButton />

      <div className="flex items-center gap-4 mb-6">
        <div className="h-px bg-gray-200 flex-1"></div>
        <span className="text-sm text-gray-400 font-medium uppercase">Or</span>
        <div className="h-px bg-gray-200 flex-1"></div>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <CustomInput
          label="Họ và Tên"
          type="text"
          placeholder="John Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={color ? `focus:border-${color} focus:ring-${color}` : ''}
        />

        <CustomInput
          label="Email"
          type="email"
          placeholder="example@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={color ? `focus:border-${color} focus:ring-${color}` : ''}
        />

        <CustomInput
          label="Mật Khẩu"
          type={showPassword ? 'text' : 'password'}
          placeholder="Tạo mật khẩu"
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

        <div className="flex items-center mt-2 mb-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              /* 🎨 Đổi màu class tương tác cho Checkbox tương tự như login */
              className={`w-4 h-4 rounded border-gray-300 ${textColorClass} ${ringColorClass}`}
              required
            />
            <span className="text-sm text-gray-700 font-medium group-hover:text-gray-900 transition">
              Tôi đồng ý với các Điều khoản & Điều kiện
            </span>
          </label>
        </div>

        <button
          type="submit"
          className={`w-full text-white font-medium py-2.5 rounded-lg transition mt-2 filter hover:brightness-90 dynamic-btn-shadow ${bgColorClass}`}
        >
          Đăng Ký
        </button>
      </form>

      <p className="text-center text-sm text-gray-600 mt-6">
        Bạn đã có tài khoản?{' '}
        <button
          type="button"
          onClick={onSwitchToSignIn}
          className={`font-semibold hover:underline ${textColorClass}`}
        >
          Đăng Nhập
        </button>
      </p>
    </div>
  );
};
