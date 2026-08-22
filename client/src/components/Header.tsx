import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useActiveRestaurantId } from '@/hooks/use-active-restaurant';
import { SidebarTrigger } from './ui/sidebar';
import { useNotification } from '@/hooks/use-notification';
import soundNotification from '@/assets/notification_sound.mp3';
import { MailBoxPopover } from '@/pages/Admin/components/MailBoxPopover';
import { NotificationPopover } from '@/pages/Admin/components/NotificationPopover';
import { Search, ChevronDown } from 'lucide-react';
import { extractId } from '@/utils/helpers';
import { getPageTitle, getRoleLabel } from '@/configs/adminMenu';

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  admin: { label: 'Admin', cls: 'bg-cerulean-blue-50 text-cerulean-blue-700' },
  manager: { label: 'Quản lý', cls: 'bg-emerald-50 text-emerald-700' },
  staff: { label: 'Nhân viên', cls: 'bg-violet-50 text-violet-700' },
  'super-admin': { label: 'Super Admin', cls: 'bg-amber-50 text-amber-700' },
};

export default function Header() {
  const { user } = useAuth();
  const activeRestaurantId = useActiveRestaurantId();
  const { notifications, startLiseningNotification, startListeningPlatform, markReadNoti, markReadAllNoti } =
    useNotification(soundNotification);

  const location = useLocation();

  // Breadcrumb: tên trang hiện tại theo cấu hình menu (theo role của user).
  const pageTitle = useMemo(
    () => getPageTitle(location.pathname, user?.role),
    [location.pathname, user?.role],
  );

  const roleBadge = user?.role ? ROLE_BADGE[user.role] : undefined;

  // Chuông admin: gộp toàn chuỗi (mọi restaurantIds); manager/staff theo 1 nhà hàng hiện tại.
  const notificationScope = useMemo(() => {
    if (user?.role === 'admin' && Array.isArray(user.restaurantIds)) {
      return (user.restaurantIds.map((id) => extractId(id)).filter(Boolean) as string[]).filter(
        (id) => id.length > 0,
      );
    }
    return [activeRestaurantId].filter((id): id is string => Boolean(id));
  }, [user, activeRestaurantId]);

  // Kích hoạt lắng nghe Socket thông báo khi Header được tải
  useEffect(() => {
    // Super-admin: kênh NỀN TẢNG riêng (đăng ký mới, gia hạn/nâng cấp gói, sắp hết hạn...)
    if (user?.role === 'super-admin') {
      startListeningPlatform();
      return;
    }
    startLiseningNotification(notificationScope);
  }, [startLiseningNotification, startListeningPlatform, notificationScope, user?.role]);

  // DATA MOCK: Đã bỏ — dùng realtime qua use-messaging (MessagingProvider) cho MailBoxPopover.
  const unreadNotificationsCount = notifications.filter((n) => n.isRead === false).length;

  return (
    <header className="flex items-center bg-white border-b justify-between px-4 lg:px-6 h-[66px] shrink-0">
      {/* VÙNG TRÁI: Breadcrumb */}
      <div className="flex items-center gap-2 lg:gap-4 flex-1 min-w-0">
        <SidebarTrigger className="-ml-2 hover:bg-gray-100 rounded-xl transition-all duration-200" />

        {pageTitle && (
          <div className="hidden md:flex items-center gap-1.5 text-sm min-w-0">
            <span className="text-gray-400 shrink-0">NhàHàng OS</span>
            <span className="text-gray-300 shrink-0">/</span>
            <span className="font-semibold text-gray-900 truncate">{pageTitle}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 1. Nhóm Hộp Thư */}
          <MailBoxPopover />

          {/* 2. Nhóm Thông Báo (Chuyển đổi sang Realtime Component) */}
          <NotificationPopover
            notifications={notifications}
            unreadCount={unreadNotificationsCount}
            onMarkReadAll={() => {
              markReadAllNoti(notificationScope);
            }}
            onMarkAsRead={(id) => {
              markReadNoti(id);
            }}
            role={user?.role}
          />
        </div>

        <div className="h-8 w-[1px] bg-gray-300 mx-1 hidden sm:block" />

        {/* Profile User: giống preview — avatar + "Hệ Thống OS" + role + chevron */}
        <button
          id="profileBtn"
          type="button"
          className="flex items-center gap-2.5 rounded-xl p-1.5 transition hover:bg-cerulean-blue-50"
        >
          <div className="relative">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt="Avatar"
                className="h-9 w-9 rounded-xl object-cover border border-slate-200"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cerulean-blue-600 text-sm font-bold text-white">
                OS
              </span>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-white rounded-full" />
          </div>
          <div className="hidden lg:flex flex-col text-left leading-tight">
            <span className="text-xs font-semibold text-gray-900 leading-tight">Hệ Thống OS</span>
            <span className="text-[11px] text-slate-400 leading-tight mt-0.5 capitalize">
              {getRoleLabel(user?.role)}
            </span>
          </div>
          <ChevronDown className="hidden h-4 w-4 text-slate-400 lg:block" />
        </button>
      </div>
    </header>
  );
}
