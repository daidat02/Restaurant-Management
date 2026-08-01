// Form đăng ký riêng cho chủ nhà hàng (role = admin) — tách khỏi form đăng ký khách
import React, { useState } from 'react';
import { Eye, EyeOff, CircleAlert } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { CustomInput } from '@/components/FormInput';
import Logo from '@/assets/logo_app.svg';
import { useNavigate } from 'react-router-dom';

interface OwnerSignUpFormProps {
  onSwitchToSignIn: () => void;
}

export const OwnerSignUpForm: React.FC<OwnerSignUpFormProps> = ({ onSwitchToSignIn }) => {
  const { registerOwner } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    if (!name || !email || !phone || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ thông tin!');
      return;
    }
    setLoading(true);
    const result = await registerOwner({ name, email, phone, password });
    setLoading(false);
    if (result.success) {
      // Đã tự động đăng nhập trong registerOwner → vào wizard tạo nhà hàng đầu tiên
      navigate('/admin/onboarding');
    } else {
      setErrorMsg(result.message || 'Có lỗi xảy ra');
    }
  };

  return (
    <div className="w-full max-w-[420px] flex flex-col my-auto">
      <div className="flex items-center gap-2 mb-8">
        <img src={Logo} className="h-12 w-auto" alt="Logo" />
      </div>

      <h1 className="text-3xl font-medium text-gray-900 mb-2">Đăng Ký Chủ Nhà Hàng</h1>
      <p className="text-sm text-gray-500 mb-6">
        Bạn muốn đưa nhà hàng của mình lên nền tảng quản lý? Hãy đăng ký để bắt đầu.
      </p>

      <div className="rounded-lg bg-cerulean-blue-50 border border-cerulean-blue-100 p-4 mb-6">
        <p className="text-sm text-cerulean-blue-700 leading-relaxed">
          <span className="font-semibold">Miễn phí 30 ngày dùng thử</span> cho nhà hàng đầu tiên.
          Sau đó <span className="font-semibold">299.000đ/nhà hàng/tháng</span>.
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <CustomInput
          label="Họ và Tên"
          type="text"
          placeholder="Nguyễn Văn A"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <CustomInput
          label="Email"
          type="email"
          placeholder="example@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <CustomInput
          label="Số Điện Thoại"
          type="tel"
          placeholder="0123456789"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <CustomInput
          label="Mật Khẩu"
          type={showPassword ? 'text' : 'password'}
          placeholder="Tạo mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
            <input type="checkbox" className="w-4 h-4 rounded border-gray-300" required />
            <span className="text-sm text-gray-700 font-medium group-hover:text-gray-900 transition">
              Tôi đồng ý với các Điều khoản & Điều kiện
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full text-white font-medium py-2.5 rounded-lg transition mt-2 filter hover:brightness-90 dynamic-btn-shadow bg-cerulean-blue-600 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Đang tạo tài khoản...' : 'Tạo Tài Khoản'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-600 mt-6">
        Bạn đã có tài khoản?{' '}
        <button
          type="button"
          onClick={onSwitchToSignIn}
          className="font-semibold text-cerulean-blue-600 hover:underline"
        >
          Đăng Nhập
        </button>
      </p>
    </div>
  );
};
