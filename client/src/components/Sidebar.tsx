import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/components/ui/sidebar';

import Logo from '@/assets/Logo.svg';
import Company from '@/assets/company.svg';

// Import thêm các icon cần thiết cho nhà hàng
import {
  Home,
  Store,
  Users,
  History,
  Settings,
  HelpCircle,
  Moon,
  ChevronDown,
  Utensils,
  LayoutGrid,
  ClipboardList,
  ChefHat,
  Bell,
  ChartLine,
  type LucideIcon,
  MonitorCheck,
  ReceiptText,
  CalendarDays,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

type MenuItem = {
  title: string;
  icon: LucideIcon;
  path?: string;
  children?: {
    title: string;
    path: string;
  }[];
  onClick?: () => void;
};

type Role = 'staff' | 'manager' | 'admin';

// --- 1. CẤU HÌNH MENU THEO TỪNG ROLE ---

interface SideBarProps {
  onOpenSetting: () => void;
  onOpenMessage: () => void;
}

export default function SidebarApp({ onOpenSetting, onOpenMessage }: SideBarProps) {
  const { user } = useAuth();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Mặc định là admin nếu chưa có thông tin user
  const currentRole = (user?.role as Role) || 'admin';

  const location = useLocation();
  const navigate = useNavigate();

  const menuConfig: Record<Role, { general: MenuItem[]; tools: MenuItem[] }> = {
    admin: {
      general: [
        { title: 'Tổng Quan Hệ Thống', icon: Home, path: '/admin' },
        { title: 'Quản Lý Nhà Hàng', icon: Store, path: '/admin/restaurants' },
        { title: 'Báo Cáo Kinh Doanh', icon: ChartLine, path: '/admin/reports' },
        { title: 'Người Dùng Hệ Thống', icon: Users, path: '/admin/customers' },
      ],
      tools: [
        { title: 'Audit Logs', icon: History, path: '/admin/logs' },
        { title: 'Cài Đặt Chung', icon: Settings, onClick: () => onOpenSetting() },
        { title: 'Tin Nhắn', icon: MessageCircle, onClick: () => onOpenMessage() },
      ],
    },
    manager: {
      general: [
        { title: 'Tổng Quan Chi Nhánh', icon: Home, path: '/manager' },
        { title: 'Quản Lý Thực Đơn', icon: Utensils, path: '/manager/menu/items' },
        { title: 'Sơ Đồ Bàn', icon: LayoutGrid, path: '/manager/tables' },
        { title: 'Đơn Hiện Tại', icon: ReceiptText, path: '/manager/orders' },
        { title: 'Lịch Đặt Bàn', icon: CalendarDays, path: '/manager/reservations' },
        { title: 'Quản Lý Đơn Hàng', icon: ClipboardList, path: '/manager/orders/management' },
        { title: 'Nhân Viên', icon: Users, path: '/manager/staff' },
      ],
      tools: [
        { title: 'Cài Đặt Nhà Hàng', icon: Settings, onClick: () => onOpenSetting() },
        { title: 'Tin Nhắn', icon: MessageCircle, onClick: () => onOpenMessage() },

        { title: 'Trợ Giúp', icon: HelpCircle, path: '/manager/help' },
      ],
    },
    staff: {
      general: [
        { title: 'Gọi Món (POS)', icon: Utensils, path: '/staff/orders/pos' },
        { title: 'Sơ Đồ Bàn (Live)', icon: LayoutGrid, path: '/staff/tables' },
        { title: 'Đơn Hiện Tại', icon: MonitorCheck, path: '/staff/orders' },
        { title: 'Lịch Đặt Bàn', icon: CalendarDays, path: '/staff/reservations' },
      ],
      tools: [
        { title: 'Thông Báo', icon: Bell, path: '/staff/notifications' },
        { title: 'Tin Nhắn', icon: MessageCircle, onClick: () => onOpenMessage() },
      ],
    },
  };

  // Lấy danh sách menu hiện tại dựa trên Role
  const { general: generalItems, tools: toolItems } = menuConfig[currentRole];

  // Mở sẵn menu cha nếu đang ở menu con
  useEffect(() => {
    [...generalItems, ...toolItems].forEach((item) => {
      if (item.children?.some((c) => c.path === location.pathname)) {
        setOpenMenu(item.title);
      }
    });
  }, [location.pathname, currentRole, generalItems, toolItems]);

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path;
  };

  const isParentActive = (item: any) =>
    item.children?.some((c: any) => c.path === location.pathname);

  const renderMenuItem = (item: MenuItem) => {
    const hasChildren = !!item.children;

    return (
      <div key={item.title}>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => {
              if (hasChildren) {
                setOpenMenu(openMenu === item.title ? null : item.title);
              } else if (item.path) {
                navigate(item.path);
              } else if (item.onClick) {
                item.onClick();
              }
            }}
            className={`flex items-center justify-between rounded-lg px-3 py-2 h-10 transition mb-1
              ${
                isActive(item.path) || isParentActive(item)
                  ? 'bg-cerulean-blue-100 text-black font-medium'
                  : 'text-gray-500 hover:bg-cerulean-blue-100 hover:text-black'
              }
            `}
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </div>

            {hasChildren && (
              <ChevronDown
                className={`h-4 w-4 transition ${openMenu === item.title ? 'rotate-180' : ''}`}
              />
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>

        {hasChildren && openMenu === item.title && (
          <div className="ml-5 flex flex-col">
            {item.children!.map((child, index) => {
              const isLast = index === item.children!.length - 1;
              return (
                <div key={child.title} className="relative pl-6 py-1">
                  <div
                    className={`absolute left-0 top-0 w-4 border-gray-300 ${
                      isLast ? 'h-1/2 border-l-2 border-b-2 rounded-bl-md' : 'h-full border-l-2'
                    }`}
                  />
                  {!isLast && (
                    <div className="absolute left-0 top-1/2 w-4 border-t-2 border-gray-300" />
                  )}
                  <div
                    onClick={() => navigate(child.path)}
                    className={`text-sm cursor-pointer px-3 py-1.5 rounded-md transition
                      ${
                        isActive(child.path)
                          ? 'bg-cerulean-blue-100 text-black font-medium'
                          : 'text-gray-400 hover:text-black hover:bg-cerulean-blue-100'
                      }
                    `}
                  >
                    {child.title}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <Sidebar>
      {/* --- HEADER --- */}
      <SidebarHeader className="flex flex-col gap-4 p-5 bg-white ">
        <div className="flex items-center justify-between">
          <img src={Logo} className="h-6 w-auto" alt="Logo" />
        </div>

        {/* Box thông tin Nhà hàng */}
        {user?.role !== 'admin' && (
          <div className="flex items-center gap-3 p-1 border border-gray-200 rounded-lg mt-2">
            <img src={Company} className="h-10 w-auto" alt="Company" />
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
                Restaurant
              </span>
              <span className="text-sm font-semibold text-gray-900 line-clamp-1">
                {typeof user?.restaurant !== 'string' ? (user?.restaurant?.name ?? 'N/A') : 'N/A'}
              </span>
            </div>
          </div>
        )}
      </SidebarHeader>

      {/* --- CONTENT --- */}
      <SidebarContent className="px-2 bg-white">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-gray-400 font-light tracking-wider mb-2">
            GENERAL
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{generalItems.map(renderMenuItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="text-xs text-gray-400 font-light tracking-wider mb-2">
            TOOLS
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolItems.map(renderMenuItem)}

              {/* Nút Toggle Dark Mode */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="flex items-center justify-between rounded-lg px-3 py-2 h-10 transition mb-1 text-gray-500 hover:bg-cerulean-blue-100 hover:text-black"
                >
                  <div className="flex items-center gap-3">
                    <Moon className="h-4 w-4" />
                    <span>Dark Mode</span>
                  </div>
                  <div
                    className={`w-9 h-5 flex items-center rounded-full p-1 transition-colors ${
                      isDarkMode ? 'bg-cerulean-blue-500' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        isDarkMode ? 'translate-x-3.5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Đã xóa SidebarFooter đi để tránh trùng lặp thông tin User với Header */}
    </Sidebar>
  );
}
