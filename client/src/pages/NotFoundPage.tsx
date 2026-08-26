import { Link, useNavigate } from 'react-router-dom';
import { Compass, Home, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

/** Trang chủ theo role — đã đăng nhập thì đưa về đúng khu vực làm việc. */
const ROLE_HOME: Record<string, string> = {
  'super-admin': '/super-admin',
  admin: '/admin',
  manager: '/manager',
  staff: '/staff',
};

/**
 * Trang 404 — bắt mọi URL không khớp route nào (catch-all path="*").
 * Đã đăng nhập thì ưu tiên nút về khu vực làm việc theo role.
 */
export default function NotFoundPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const roleHome = isAuthenticated && user?.role ? ROLE_HOME[user.role] : undefined;

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-slate-50 px-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cerulean-blue-50 text-cerulean-blue-600">
        <Compass className="h-8 w-8" />
      </span>

      <div>
        <p className="bg-gradient-to-r from-cerulean-blue-600 to-cerulean-blue-400 bg-clip-text text-7xl font-extrabold tracking-tight text-transparent sm:text-8xl">
          404
        </p>
        <h1 className="mt-3 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
          Không tìm thấy trang
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
          Đường dẫn bạn truy cập không tồn tại hoặc đã được di chuyển. Kiểm tra lại địa chỉ hoặc
          quay về trang chủ để tiếp tục.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-cerulean-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-cerulean-blue-200 transition-all duration-150 hover:bg-cerulean-blue-700 active:scale-[0.98]"
        >
          <Home className="h-4 w-4" />
          Về trang chủ
        </button>
        {roleHome && (
          <Link
            to={roleHome}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors duration-150 hover:border-cerulean-blue-300 hover:text-cerulean-blue-700"
          >
            <LayoutDashboard className="h-4 w-4" />
            Về khu vực làm việc
          </Link>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Cần hỗ trợ?{' '}
        <Link
          to="/"
          className="font-medium text-cerulean-blue-600 hover:underline"
          aria-label="Về trang chủ NhaHang OS"
        >
          NhaHang OS
        </Link>{' '}
        luôn sẵn sàng đồng hành cùng quán của bạn.
      </p>
    </div>
  );
}
