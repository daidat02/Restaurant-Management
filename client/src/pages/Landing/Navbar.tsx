import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { UtensilsCrossed } from 'lucide-react';
import type { AuthMode } from './AuthModal';

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

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link to="/">
          <BrandLogo />
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-3.5 py-2 text-sm font-medium rounded-lg transition ${
                pathname === l.to
                  ? 'text-cerulean-blue-700 bg-cerulean-blue-50'
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
            className="hidden sm:inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-slate-100 transition"
          >
            Đăng nhập
          </button>
          <Button
            onClick={() => onOpenAuth('owner')}
            className="bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white font-semibold"
          >
            Tạo tài khoản
          </Button>
        </div>
      </div>
    </header>
  );
}
