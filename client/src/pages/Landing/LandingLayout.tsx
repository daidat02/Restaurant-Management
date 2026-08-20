import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export type AuthMode = 'login' | 'owner';

export type LandingAuthContext = {
  openAuth: (mode?: AuthMode) => void;
};

export default function LandingLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Auth chuyển từ modal sang trang riêng — các nút "Đăng nhập"/"Tạo tài khoản" điều hướng tới /login, /register.
  const openAuth = (mode: AuthMode = 'login') => {
    navigate(mode === 'owner' ? '/register' : '/login');
  };

  // Cuộn lên đầu trang khi đổi route
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return (
    <div className="w-full min-h-screen bg-white text-gray-900 font-sans antialiased [scroll-behavior:smooth]">
      <Navbar onOpenAuth={openAuth} />
      <main id="top">
        <Outlet context={{ openAuth } satisfies LandingAuthContext} />
      </main>
      <Footer onOpenAuth={openAuth} />
    </div>
  );
}