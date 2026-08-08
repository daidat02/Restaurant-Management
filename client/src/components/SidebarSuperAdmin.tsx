import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

import { Moon, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getMenuForRole, getRoleLabel, type MenuItem } from '@/configs/adminMenu';

interface SidebarSuperAdminProps {
  onOpenSetting?: () => void;
}

export default function SidebarSuperAdmin({ onOpenSetting }: SidebarSuperAdminProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const menuGroups = getMenuForRole('super-admin');

  const isActive = (path?: string) => location.pathname === path;

  const handleItemClick = (item: MenuItem) => {
    if (item.path) {
      navigate(item.path);
    } else if (item.action === 'setting') {
      onOpenSetting?.();
    }
  };

  return (
    <Sidebar>
      {/* --- HEADER --- */}
      <SidebarHeader className="flex flex-col gap-4 p-5 bg-white">
        {/* Logo: box icon cerulean + tên + tagline (giống preview) */}
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cerulean-blue-600 text-white shadow-lg shadow-cerulean-blue-200">
            <span className="text-sm font-extrabold">OS</span>
          </span>
          <div className="leading-tight">
            <p className="text-base font-extrabold tracking-tight text-gray-900">NhàHàng OS</p>
            <p className="text-[11px] font-medium text-slate-400">Quản lý nhà hàng Việt</p>
          </div>
        </div>

        {/* Box scope: Hệ Thống OS — quản trị nền tảng (giống preview) */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cerulean-blue-100 text-cerulean-blue-600">
            <span className="text-sm font-bold">OS</span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-gray-900">Hệ Thống OS</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Quản trị nền tảng
            </p>
          </div>
        </div>
      </SidebarHeader>

      {/* --- CONTENT --- */}
      <SidebarContent className="px-2 bg-white">
        {menuGroups.map((group, idx) => (
          <SidebarGroup key={group.label} className={idx > 0 ? 'mt-2' : ''}>
            <SidebarGroupLabel className="text-xs text-gray-400 font-light tracking-wider mb-2">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => handleItemClick(item)}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 h-10 transition mb-1
                      ${
                        isActive(item.path)
                          ? 'bg-cerulean-blue-600 text-white shadow-md shadow-cerulean-blue-200 hover:bg-cerulean-blue-600 hover:text-white'
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
        ))}

        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="text-xs text-gray-400 font-light tracking-wider mb-2">
            Giao diện
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

      {/* --- FOOTER: thông tin user + nút đăng xuất (giống preview) --- */}
      <SidebarFooter className="border-t border-slate-100 p-4 bg-white">
        <div className="flex items-center gap-3 rounded-xl bg-slate-50/70 p-2.5">
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
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-gray-900">Hệ Thống OS</p>
            <p className="text-[10px] font-medium text-slate-400">
              {user?.name || 'Người dùng'} · {getRoleLabel(user?.role)}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-md p-1 text-slate-400 transition hover:bg-white hover:text-cerulean-blue-600"
            title="Đăng xuất"
            aria-label="Đăng xuất"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
