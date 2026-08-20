import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { UtensilsCrossed } from 'lucide-react';
import type { AuthMode } from './LandingLayout';

const NAV_LINKS = [
  { to: '/', label: 'Trang chủ' },
  { to: '/pricing', label: 'Bảng giá' },
  { to: '/guide', label: 'Hướng dẫn triển khai' },
  { to: '/faq', label: 'Câu hỏi thường gặp' },
  { to: '/contact', label: 'Liên hệ hỗ trợ' },
];

interface NavbarProps {
  onOpenAuth: (mode: AuthMode) => void;
}

export function BrandLogo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cerulean-blue-600 text-white shadow-sm">
        <UtensilsCrossed className="h-5 w-5" />
      </span>
      <span
        className={`text-lg font-extrabold tracking-tight ${light ? 'text-white' : 'text-gray-900'}`}
      >
        NhàHàng OS
      </span>
    </span>
  );
}

export default function Navbar({ onOpenAuth }: NavbarProps) {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-slate-200/70 bg-white/85 shadow-[0_4px_20px_rgba(30,64,175,0.06)] backdrop-blur-xl'
          : 'border-b border-transparent bg-white/60 backdrop-blur-md'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="NhàHàng OS - Trang chủ">
          <BrandLogo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                pathname === l.to
                  ? 'bg-cerulean-blue-50 text-cerulean-blue-700'
                  : 'text-gray-700 hover:bg-slate-100 hover:text-gray-900'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenAuth('login')}
            className="hidden rounded-lg px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-slate-100 sm:inline-flex"
          >
            Đăng nhập
          </button>
          <Button
            onClick={() => onOpenAuth('owner')}
            className="bg-cerulean-blue-600 font-semibold text-white hover:bg-cerulean-blue-700"
          >
            Tạo tài khoản
          </Button>
        </div>
      </div>
    </motion.header>
  );
}
