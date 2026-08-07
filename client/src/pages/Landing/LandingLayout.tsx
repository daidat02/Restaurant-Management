import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import AuthModal, { type AuthMode } from './AuthModal';

export type LandingAuthContext = {
  openAuth: (mode?: AuthMode) => void;
};

export default function LandingLayout() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const { pathname } = useLocation();

  const openAuth = (mode: AuthMode = 'login') => {
    setAuthMode(mode);
    setAuthOpen(true);
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
      <AuthModal
        key={authOpen ? authMode : 'closed'}
        open={authOpen}
        initialMode={authMode}
        onClose={() => setAuthOpen(false)}
      />
    </div>
  );
}