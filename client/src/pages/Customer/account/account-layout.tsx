import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { UserRound, ReceiptText, Settings, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

const ACCOUNT_NAV = [
  {
    label: 'Trang cá nhân',
    description: 'Thông tin tài khoản',
    path: '/account/profile',
    icon: UserRound,
  },
  {
    label: 'Lịch sử đơn hàng',
    description: 'Đơn hàng & đặt bàn',
    path: '/account/orders',
    icon: ReceiptText,
  },
  {
    label: 'Cài đặt thông tin',
    description: 'Mật khẩu & thông báo',
    path: '/account/settings',
    icon: Settings,
  },
];

export default function AccountLayout() {
  const { user } = useAuth();

  // Chưa đăng nhập thì chuyển hướng về trang đăng nhập
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="w-full pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-16 mt-8 md:mt-10">
        {/* HEADER TRANG */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            Tài khoản của tôi
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý thông tin cá nhân, theo dõi đơn hàng và tùy chỉnh tài khoản
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 md:gap-10">
          {/* ---------- SIDEBAR DESKTOP ---------- */}
          <aside className="hidden md:block w-72 shrink-0">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden sticky top-28">
              {/* THÔNG TIN USER */}
              <div className="p-5 border-b border-gray-100 bg-gradient-to-br from-orange-50 to-amber-50/40">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full overflow-hidden flex items-center justify-center bg-orange-500 text-white font-bold text-lg shrink-0">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                    ) : user?.name ? (
                      user.name.charAt(0).toUpperCase()
                    ) : (
                      <UserRound className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{user?.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
                  </div>
                </div>
              </div>

              {/* DANH SÁCH ĐIỀU HƯỚNG */}
              <nav className="p-2 space-y-1">
                {ACCOUNT_NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                          isActive
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600',
                        )
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-semibold">{item.label}</span>
                        <span
                          className={cn(
                            'block text-[10px]',
                            item.path === '/account/profile'
                              ? 'text-orange-200'
                              : 'text-gray-400',
                          )}
                        >
                          {item.description}
                        </span>
                      </span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* ---------- NỘI DUNG CHÍNH ---------- */}
          <main className="flex-1 min-w-0">
            {/* ĐIỀU HƯỚNG MOBILE (Ngang) */}
            <div className="md:hidden mb-5 -mx-4 px-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex gap-2 w-max">
                {ACCOUNT_NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap',
                          isActive
                            ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600',
                        )
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                      <ChevronRight className="h-3 w-3 opacity-50" />
                    </NavLink>
                  );
                })}
              </div>
            </div>

            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
