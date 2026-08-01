import { useState } from 'react';
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
} from '@/components/ui/sidebar';

import Logo from '@/assets/logo_app.svg';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  ScrollText,
  Moon,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

type MenuItem = {
  title: string;
  icon: LucideIcon;
  path?: string;
};

const GENERAL_MENU: MenuItem[] = [
  { title: 'Tổng Quan Hệ Thống', icon: LayoutDashboard, path: '/super-admin' },
  { title: 'Tài Khoản Người Thuê', icon: Users, path: '/super-admin/tenants' },
  { title: 'Gói Cước & Giá', icon: CreditCard, path: '/super-admin/pricing' },
  { title: 'Lịch Sử Giao Dịch', icon: Receipt, path: '/super-admin/transactions' },
  { title: 'Nhật Ký Hệ Thống', icon: ScrollText, path: '/super-admin/audit' },
];

export default function SidebarSuperAdmin() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path?: string) => location.pathname === path;

  return (
    <Sidebar>
      {/* --- HEADER --- */}
      <SidebarHeader className="flex flex-col gap-4 p-5 bg-white">
        <div className="flex items-center justify-between">
          <img src={Logo} className="h-6 w-auto" alt="Logo" />
        </div>

        <div className="flex items-center gap-3 p-1 border border-gray-200 rounded-lg mt-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cerulean-blue-50 text-cerulean-blue-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
              Nền tảng
            </span>
            <span className="text-sm font-semibold text-gray-900 line-clamp-1">
              Quản Trị Toàn Hệ Thống
            </span>
          </div>
        </div>
      </SidebarHeader>

      {/* --- CONTENT --- */}
      <SidebarContent className="px-2 bg-white">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-gray-400 font-light tracking-wider mb-2">
            QUẢN TRỊ
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {GENERAL_MENU.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => item.path && navigate(item.path)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 h-10 transition mb-1
                      ${
                        isActive(item.path)
                          ? 'bg-cerulean-blue-100 text-black font-medium'
                          : 'text-gray-500 hover:bg-cerulean-blue-100 hover:text-black'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="text-xs text-gray-400 font-light tracking-wider mb-2">
            TOOLS
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
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
    </Sidebar>
  );
}
