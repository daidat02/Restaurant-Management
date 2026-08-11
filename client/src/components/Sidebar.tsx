import { useEffect, useState } from 'react';
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

import { ChevronDown, Moon, Store, LogOut, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useActiveRestaurantId } from '@/hooks/use-active-restaurant';
import { getMenuForRole, getRoleLabel, type MenuItem } from '@/configs/adminMenu';
import { extractId } from '@/utils/helpers';
import type { IRestaurant } from '@/types/restaurant.type';

export default function SidebarApp() {
  const { user, logout } = useAuth();
  const activeRestaurantId = useActiveRestaurantId();

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const menuGroups = getMenuForRole(user?.role);

  // Nội dung card scope dưới logo, theo role (admin = toàn hệ thống, super-admin = nền tảng).
  const scopeInfo = (() => {
    if (user?.role === 'super-admin') {
      return { title: 'Hệ Thống OS', sub: 'Quản trị nền tảng', icon: 'server' as const };
    }
    if (user?.role === 'admin') {
      const count = Array.isArray(user.restaurantIds) ? user.restaurantIds.length : 0;
      return { title: 'Toàn Hệ Thống', sub: `${count} chi nhánh`, icon: 'store' as const };
    }
    // manager/staff: ưu tiên dùng tên nhà hàng từ restaurantIds (server đã populate 'name').
    const foundRestaurant = Array.isArray(user?.restaurantIds)
      ? user.restaurantIds.find((r) => extractId(r) === activeRestaurantId)
      : undefined;
    const currentRestaurant =
      foundRestaurant && typeof foundRestaurant === 'object'
        ? (foundRestaurant as IRestaurant)
        : undefined;
    return {
      title: currentRestaurant?.name || (activeRestaurantId ? `Nhà hàng #${activeRestaurantId.slice(-4)}` : 'N/A'),
      sub: 'Chi nhánh hiện tại',
      icon: 'store' as const,
    };
  })();

  // Mở sẵn menu cha nếu đang ở menu con
  useEffect(() => {
    menuGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.children?.some((c) => c.path === location.pathname)) {
          setOpenMenu(item.title);
        }
      });
    });
  }, [location.pathname, menuGroups]);

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path;
  };

  const isParentActive = (item: MenuItem) =>
    item.children?.some((c) => c.path === location.pathname);

  const handleItemClick = (item: MenuItem) => {
    if (item.children?.length) {
      setOpenMenu(openMenu === item.title ? null : item.title);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const renderMenuItem = (item: MenuItem) => {
    const hasChildren = !!item.children?.length;

    return (
      <div key={item.title}>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => handleItemClick(item)}
            className={`flex items-center justify-between rounded-lg px-3 py-2 h-10 transition mb-1
              ${
                isActive(item.path) || isParentActive(item)
                  ? 'bg-cerulean-blue-600 text-white shadow-md shadow-cerulean-blue-200 hover:bg-cerulean-blue-600 hover:text-white'
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
                          ? 'bg-cerulean-blue-600 text-white font-medium hover:bg-cerulean-blue-600'
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
      <SidebarHeader className="flex flex-col gap-4 p-5 bg-white">
        {/* Logo: box icon cerulean + tên + tagline (giống preview) */}
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cerulean-blue-600 text-white shadow-lg shadow-cerulean-blue-200">
            <UtensilsCrossed className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="text-base font-extrabold tracking-tight text-gray-900">NhàHàng OS</p>
            <p className="text-[11px] font-medium text-slate-400">Quản lý nhà hàng Việt</p>
          </div>
        </div>

        {/* Box scope: Toàn Hệ Thống / Hệ Thống OS / Nhà hàng hiện tại (giống preview) */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cerulean-blue-100 text-cerulean-blue-600">
            {scopeInfo.icon === 'server' ? (
              <span className="text-sm font-bold">OS</span>
            ) : (
              <Store className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-gray-900">{scopeInfo.title}</p>

            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              {scopeInfo.sub}
            </p>
          </div>
        </div>
      </SidebarHeader>

      {/* --- CONTENT --- */}
      <SidebarContent className="px-2 bg-white">
        {menuGroups.map((group) => (
          <SidebarGroup
            key={group.label}
            className={group.label !== menuGroups[0].label ? 'mt-2' : ''}
          >
            <SidebarGroupLabel className="text-xs text-gray-400 font-light tracking-wider mb-2">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{group.items.map(renderMenuItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="text-xs text-gray-400 font-light tracking-wider mb-2">
            Giao diện
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
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
