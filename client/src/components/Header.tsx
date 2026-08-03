import { useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useActiveRestaurantId } from '@/hooks/use-active-restaurant';
import { SidebarTrigger } from './ui/sidebar';
import { useNotification } from '@/hooks/use-notification';
import soundNotification from '@/assets/notification_sound.mp3';
import { MailBoxPopover } from '@/pages/Admin/components/MailBoxPopover';
import { NotificationPopover } from '@/pages/Admin/components/NotificationPopover';
import { extractId } from '@/utils/helpers';

export default function Header() {
  const { user } = useAuth();
  const activeRestaurantId = useActiveRestaurantId();
  const { notifications, startLiseningNotification, markReadNoti, markReadAllNoti } =
    useNotification(soundNotification);

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
    startLiseningNotification(notificationScope);
  }, [startLiseningNotification, notificationScope]);

  // DATA MOCK: Tạm thời giữ lại Data Tin Nhắn MailBox
  const mockMessages = [
    {
      id: 1,
      sender: 'Bếp Trưởng (Chef)',
      avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=100&h=100&fit=crop',
      excerpt: 'Món cá hồi sốt chanh leo vừa hết nguyên liệu nhé!',
      time: '5 phút trước',
      isUnread: true,
    },
    {
      id: 2,
      sender: 'Quản lý (Manager)',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      excerpt: 'Nhớ kiểm tra bàn số 5 lát nữa có khách VIP đến.',
      time: '15 phút trước',
      isUnread: true,
    },
  ];

  const unreadMessagesCount = mockMessages.filter((m) => m.isUnread).length;
  const unreadNotificationsCount = notifications.filter((n) => n.isRead === false).length;

  return (
    <header className="flex items-center bg-white border-b justify-between px-4 lg:px-6  h-[66px] shrink-0">
      {/* VÙNG TRÁI: Tìm kiếm */}
      <div className="flex items-center gap-2 lg:gap-4 flex-1">
        <SidebarTrigger className="-ml-2 hover:bg-gray-100 rounded-xl transition-all duration-200" />
      </div>

      {/* VÙNG PHẢI: Trả về các Component Popover đã được tách */}
      <div className="flex items-center gap-1 sm:gap-5">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 1. Nhóm Hộp Thư */}
          <MailBoxPopover messages={mockMessages} unreadCount={unreadMessagesCount} />

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

        {/* Profile User: Avatar chỉ HIỂN THỊ (tĩnh) — không mở modal nào (ticket 05) */}
        <div className="flex items-center gap-3 rounded-xl px-1 py-1 select-none">
          <div className="relative">
            <img
              src={user?.avatar || 'https://github.com/shadcn.png'}
              alt="Avatar"
              className="h-4 w-4 sm:h-10 sm:w-10 rounded-lg object-cover border"
            />
            <span className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 border-2 border-white rounded-full" />
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-gray-900 leading-tight">
              {user?.name || 'Người dùng'}
            </span>
            <span className="text-xs text-gray-500 capitalize leading-tight mt-0.5">
              {user?.role || 'Nhân viên'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
