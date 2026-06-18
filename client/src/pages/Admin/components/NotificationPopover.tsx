import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Info,
  ShoppingBag,
  RefreshCw,
  Layers,
  Gift,
  AlertTriangle,
  Check,
  CalendarDays,
} from 'lucide-react';
import { getTimeAgo } from '@/utils/helpers';
import type { INotification } from '@/types/noti.type';
import { PopoverCustom } from '@/components/PopoverCusom';
import { useNotification } from '@/hooks/use-notification';

interface NotificationPopoverProps {
  notifications: INotification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkReadAll: () => void;
  role?: string;
}

// Bộ cấu hình Giao diện (Icon & Màu sắc) động theo Type thông báo
const notificationConfigs: Record<
  string,
  { icon: React.ReactNode; bgColor: string; iconColor: string }
> = {
  new_order: {
    icon: <ShoppingBag className="h-4 w-4" />,
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  orderUpdate: {
    icon: <RefreshCw className="h-4 w-4" />,
    bgColor: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  tableStatus: {
    icon: <Layers className="h-4 w-4" />,
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
  promotion: {
    icon: <Gift className="h-4 w-4" />,
    bgColor: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  system: {
    icon: <AlertTriangle className="h-4 w-4" />,
    bgColor: 'bg-rose-50',
    iconColor: 'text-rose-600',
  },
  new_reservation: {
    icon: <CalendarDays className="h-4 w-4" />,
    bgColor: 'bg-emerald-50', // Đổi sang tone xanh lá dịu mắt đại diện cho cái mới
    iconColor: 'text-emerald-600',
  },
  default: {
    icon: <Info className="h-4 w-4" />,
    bgColor: 'bg-gray-50',
    iconColor: 'text-gray-600',
  },
};

export function NotificationPopover({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkReadAll,
  role,
}: NotificationPopoverProps) {
  const navigate = useNavigate();
  const { stopAudio } = useNotification();
  const handleNotificationClick = async (notif: INotification) => {
    // Giả sử API/Socket trả về có kèm data.orderId hoặc data._id của đơn hàng
    const orderId = notif.data?._id || notif.data?.id;
    onMarkAsRead(notif._id);
    switch (notif.type) {
      case 'new_order':
      case 'orderUpdate':
        if (orderId) {
          if (role == 'admin') {
            navigate('/admin');
          }
          navigate(`/${role}/orders/edit/${orderId}`); // Điều hướng đến chi tiết đơn hàng
        } else {
          navigate('/orders'); // Fallback nếu không có ID cụ thể
        }
        break;
      case 'tableStatus':
        navigate('/tables'); // Điều hướng đến sơ đồ bàn ăn
        break;
      case 'promotion':
        navigate('/promotions'); // Điều hướng trang khuyến mãi
        break;
      case 'system':
        navigate('/settings/system-logs'); // Điều hướng trang log hệ thống
        break;
      case 'new_reservation':
        navigate(`/${role}/reservations`); // Điều hướng trang quản lý đặt bàn
        break;
      default:
        break;
    }
  };

  return (
    <PopoverCustom
      align="end"
      onOpenChange={(open) => {
        if (open) {
          console.log('[UI] Nhân viên đã mở xem thông báo -> Tắt chuông báo.');
          stopAudio(); // Tắt âm thanh lập tức
        }
      }}
      trigger={
        <button className="relative p-1 sm:p-2.5 bg-white border hover:bg-gray-100 rounded-lg transition">
          <Bell className="h-4 w-4 text-gray-700" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-[#EB5757] text-white text-[10px] font-bold h-5 min-w-[20px] flex items-center justify-center rounded-full border-2 border-white px-1">
              {unreadCount}
            </span>
          )}
        </button>
      }
      children={
        <div
          onClick={() => {}}
          className="w-[300px] sm:w-[360px] max-h-[420px] flex flex-col bg-white"
        >
          <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <span className="font-bold text-sm text-gray-800">Thông báo hệ thống</span>

            <div className="flex gap-1">
              <span className=" text-[11px] bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-medium">
                {unreadCount} chưa đọc
              </span>
              {unreadCount > 0 && (
                <span
                  onClick={() => {
                    onMarkReadAll();
                  }}
                  className="cursor-pointer text-[11px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full font-medium hover:bg-blue-100"
                >
                  Xem tất cả
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">Không có thông báo nào</div>
            ) : (
              notifications.map((notif) => {
                const config = notificationConfigs[notif.type] || notificationConfigs.default;
                return (
                  <div
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3 flex gap-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                      !notif.isRead
                        ? notificationConfigs[notif.type]?.bgColor ||
                          notificationConfigs.default.bgColor
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Icon đại diện theo Type */}
                    <div
                      className={`shrink-0 h-8 w-8 rounded-lg flex items-center justify-center ${config.bgColor} ${config.iconColor}`}
                    >
                      {config.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4
                          className={`text-xs truncate ${!notif.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}
                        >
                          {notif.message}
                        </h4>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                          {getTimeAgo(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                        {notif.type === 'new_order'
                          ? 'Vui lòng kiểm tra và xác nhận đơn.'
                          : notif.message}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      }
    />
  );
}
