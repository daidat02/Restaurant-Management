import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Layers } from 'lucide-react';
import { BrandLogo } from './Navbar';
import type { AuthMode } from './LandingLayout';

interface FooterProps {
  onOpenAuth: (mode: AuthMode) => void;
}

export default function Footer({ onOpenAuth }: FooterProps) {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 pb-12">
          <div>
            <BrandLogo light />
            <p className="mt-4 text-sm text-slate-400 leading-relaxed">
              Nền tảng quản lý nhà hàng: menu số, gọi món QR, đặt bàn, POS, bếp số hoá và tích điểm
              thành viên.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Sản phẩm</h3>
            <ul className="space-y-3">
              <li className="text-sm text-slate-400 hover:text-white cursor-pointer transition-colors">
                Menu số & QR
              </li>
              <li className="text-sm text-slate-400 hover:text-white cursor-pointer transition-colors">
                Đặt bàn online
              </li>
              <li className="text-sm text-slate-400 hover:text-white cursor-pointer transition-colors">
                POS thu ngân
              </li>
              <li className="text-sm text-slate-400 hover:text-white cursor-pointer transition-colors">
                Màn hình bếp (KDS)
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Nhà hàng</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/guide" className="text-sm text-slate-400 hover:text-cerulean-blue-300 transition-colors">
                  Hướng dẫn triển khai
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-sm text-slate-400 hover:text-cerulean-blue-300 transition-colors">
                  Bảng giá
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-sm text-slate-400 hover:text-cerulean-blue-300 transition-colors">
                  Câu hỏi thường gặp
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-slate-400 hover:text-cerulean-blue-300 transition-colors">
                  Liên hệ hỗ trợ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Tài khoản</h3>
            <ul className="space-y-3">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenAuth('owner')}
                  className="text-sm text-slate-400 hover:text-cerulean-blue-300 transition-colors"
                >
                  Đăng ký chủ nhà hàng
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="text-sm text-slate-400 hover:text-cerulean-blue-300 transition-colors"
                >
                  Đăng nhập nội bộ
                </button>
              </li>
            </ul>
            <Button
              onClick={() => onOpenAuth('owner')}
              className="mt-6 bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white font-semibold"
            >
              Dùng thử miễn phí
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <span>© 2026 NhàHàng OS. Mọi quyền được bảo lưu.</span>
          <span className="flex items-center gap-1.5">
            <Layers className="w-4 h-4" />
            Nền tảng O2O quản lý nhà hàng Việt
          </span>
        </div>
      </div>
    </footer>
  );
}
