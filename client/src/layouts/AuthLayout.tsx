import { Link, Outlet } from 'react-router-dom';
import { UtensilsCrossed, Check } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { LoadingProvider } from '@/components/LoadingOverlay';

const FEATURES = [
  'Quản lý đặt bàn, gọi món & thanh toán',
  'Báo cáo doanh thu & phân tích hiệu quả',
  'KDS bếp, mã QR & kênh O2O',
  'Hỗ trợ nhiều chi nhánh & nhóm nhân sự',
];

const AVATAR_COLORS = ['bg-indigo-500', 'bg-rose-500', 'bg-emerald-500', 'bg-amber-500'];

function BrandPanelLogo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cerulean-blue-600 text-white shadow-lg shadow-cerulean-blue-500/40">
        <UtensilsCrossed className="h-5 w-5" />
      </span>
      <span className={`text-lg font-extrabold tracking-tight ${light ? 'text-white' : 'text-gray-900'}`}>
        NhaHang OS
      </span>
    </span>
  );
}

export default function AuthLayout() {
  return (
    <LoadingProvider>
      <Toaster />
      <div className="grid min-h-screen w-full bg-slate-50 lg:grid-cols-[1fr_minmax(0,560px)]">
        {/* ===== LEFT BRAND PANEL (ẩn trên mobile) ===== */}
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0b122b] p-12 text-white lg:flex">
          <div className="pointer-events-none absolute -left-32 top-10 h-[380px] w-[380px] rounded-full bg-cerulean-blue-600/35 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-[420px] w-[420px] rounded-full bg-cerulean-blue-400/20 blur-[80px]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.7)_1px,transparent_1px)] bg-[size:4px_4px] opacity-[0.06]" />

          <div className="relative z-10">
            <Link to="/" aria-label="NhaHang OS - Trang chủ">
              <BrandPanelLogo light />
            </Link>
          </div>

          <div className="relative z-10 max-w-[400px]">
            <h1 className="text-4xl font-extrabold leading-[1.15] tracking-tight">
              Quản lý nhà hàng
              <br />
              <span className="bg-gradient-to-r from-cerulean-blue-200 via-cerulean-blue-300 to-cerulean-blue-400 bg-clip-text text-transparent">
                đơn giản đến từng chi tiết
              </span>
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-slate-300">
              Phần mềm quản lý nhà hàng giúp bạn vận hành quán hiệu quả — đặt bàn, gọi món, thanh
              toán và báo cáo doanh thu trong một nơi.
            </p>
            <ul className="mt-8 flex flex-col gap-3.5">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-slate-200">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cerulean-blue-500/25 text-cerulean-blue-300">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 flex items-center gap-3 text-xs text-slate-400">
            <div className="flex">
              {AVATAR_COLORS.map((c) => (
                <span key={c} className={`h-7 w-7 rounded-full border-2 border-[#0b122b] ${c} ${c !== AVATAR_COLORS[0] ? '-ml-2' : ''}`} />
              ))}
            </div>
            <span>
              Hơn 1.200 nhà hàng Việt đang vận hành cùng{' '}
              <strong className="text-slate-200">NhaHang OS</strong>
            </span>
          </div>
        </aside>

        {/* ===== RIGHT FORM PANEL ===== */}
        <main className="flex flex-col justify-center px-6 py-10 sm:px-10">
          <div className="mx-auto w-full max-w-[400px]">
            <div className="mb-8 lg:hidden">
              <Link to="/" aria-label="NhaHang OS - Trang chủ">
                <BrandPanelLogo />
              </Link>
            </div>

            <Outlet />

            <p className="mt-10 text-center text-xs text-slate-400">
              <Link to="/" className="hover:text-cerulean-blue-600 transition-colors">
                ← Về trang chủ NhaHang OS
              </Link>
            </p>
          </div>
        </main>
      </div>
    </LoadingProvider>
  );
}