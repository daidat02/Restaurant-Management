// Trang đăng ký chủ nhà hàng riêng biệt — /auth/owner
import React from 'react';
import Baner from '@/assets/banner.png';
import { OwnerSignUpForm } from '@/pages/Auth/Components/OwnerSignUpForm';
import { useNavigate } from 'react-router-dom';

export default function OwnerRegister() {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-screen overflow-hidden relative bg-white flex">
      {/* ================= FORM ĐĂNG KÝ CHỦ ================= */}
      <div className="absolute top-0 left-0 w-full lg:w-1/2 h-full flex flex-col justify-center items-center px-6 py-8 lg:px-8 z-10 custom-scrollbar overflow-y-auto">
        <OwnerSignUpForm onSwitchToSignIn={() => navigate('/auth')} />
      </div>

      {/* ================= BANNER QUẢNG CÁO ================= */}
      <div className="hidden lg:flex absolute top-0 right-0 w-1/2 h-full flex-col justify-center items-center bg-cerulean-blue-600 overflow-hidden p-12 z-20">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <svg className="absolute -top-24 -left-24 w-96 h-96 text-white" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
            <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" />
          </svg>
          <svg className="absolute -bottom-24 right-0 w-96 h-96 text-white" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
            <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" />
          </svg>
        </div>

        <div className="relative z-10 w-full max-w-[600px] flex flex-col items-center text-center">
          <img src={Baner} alt="Dashboard Preview" className="w-30% max-h-[30vh] object-contain rounded-lg drop-shadow-2xl mb-8 rounded-xl" />
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
            Dễ dàng đưa nhà hàng của bạn <br /> lên nền tảng quản lý.
          </h2>
          <p className="text-cerulean-blue-50 text-sm px-8 mb-8 leading-relaxed opacity-90">
            Đăng ký ngay để bắt đầu 30 ngày dùng thử miễn phí cho nhà hàng đầu tiên. Quản lý nhân sự,
            món ăn, đơn hàng và doanh thu tất cả tại một nơi.
          </p>
          <div className="flex items-center gap-2">
            <span className="w-8 h-2 bg-white rounded-full"></span>
            <span className="w-2 h-2 bg-white/50 rounded-full"></span>
            <span className="w-2 h-2 bg-white/50 rounded-full"></span>
          </div>
        </div>
      </div>
    </div>
  );
}
