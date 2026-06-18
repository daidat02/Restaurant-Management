// pages/AuthPage.tsx
import React, { useState } from 'react';
import Baner from "@/assets/banner.png";
import { LoginForm } from '@/pages/Auth/Components/SignInForm'; // Import tùy vị trí thư mục của bạn
import { SignUpForm } from '@/pages/Auth/Components/SignUpForm';

export default function AuthPage() {
  // Chỉ giữ lại state quản lý layout
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div className="h-screen w-screen overflow-hidden relative bg-white">
      
      {/* ================= FORM ĐĂNG NHẬP (LOGIN) ================= */}
      <div 
        className={`absolute top-0 left-0 w-full lg:w-1/2 h-full flex flex-col justify-center items-center px-6 py-8 lg:px-8 transition-all duration-700 ease-in-out z-10 custom-scrollbar overflow-y-auto
          ${isSignUp ? '-translate-x-full lg:translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100 pointer-events-auto'}
        `}
      >
        <LoginForm onSwitchToSignUp={() => setIsSignUp(true)} />
      </div>

      {/* ================= FORM ĐĂNG KÝ (SIGN UP) ================= */}
      <div 
        className={`absolute top-0 left-0 w-full lg:w-1/2 h-full flex flex-col justify-center items-center px-6 py-8 lg:px-8 transition-all duration-700 ease-in-out z-10 custom-scrollbar overflow-y-auto
          ${isSignUp ? 'translate-x-0 lg:translate-x-full opacity-100 pointer-events-auto' : 'translate-x-full lg:translate-x-0 opacity-0 pointer-events-none'}
        `}
      >
        <SignUpForm onSwitchToSignIn={() => setIsSignUp(false)} />
      </div>

      {/* ================= 3. BANNER TRƯỢT (SLIDING OVERLAY) ================= */}
      <div 
        className={`hidden lg:flex absolute top-0 left-0 w-1/2 h-full flex-col justify-center items-center bg-cerulean-blue-600 overflow-hidden p-12 transition-transform duration-700 ease-in-out z-20
          ${isSignUp ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
           <svg className="absolute -top-24 -left-24 w-96 h-96 text-white" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
             <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" />
           </svg>
           <svg className="absolute -bottom-24 right-0 w-96 h-96 text-white" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
             <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" />
           </svg>
        </div>

        <div className="relative z-10 w-full max-w-[600px] flex flex-col items-center text-center">
          <img 
            src={Baner} 
            alt="Dashboard Preview" 
            className="w-30% max-h-[30vh] object-contain rounded-lg drop-shadow-2xl mb-8 rounded-xl"
          />
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
            Easy-to-Use Dashboard for <br/> Managing Your Business.
          </h2>
          <p className="text-cerulean-blue-50 text-sm px-8 mb-8 leading-relaxed opacity-90">
            Streamline Your Business Management with Our User-Friendly Dashboard. Simplify complex tasks, track key metrics, and make informed decisions effortlessly
          </p>
          <div className="flex items-center gap-2">
            <span className="w-8 h-2 bg-white rounded-full"></span>
            <span className="w-2 h-2 bg-white/50 rounded-full cursor-pointer hover:bg-white/80 transition"></span>
            <span className="w-2 h-2 bg-white/50 rounded-full cursor-pointer hover:bg-white/80 transition"></span>
          </div>
        </div>
      </div>

    </div>
  );
}