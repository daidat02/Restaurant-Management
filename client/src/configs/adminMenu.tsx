/* ============================================================
   Cấu hình menu Sidebar theo vai trò — tách riêng khỏi component.
   Mỗi vai trò: mảng các nhóm menu (general / tools).
   ============================================================ */
import type { LucideIcon } from 'lucide-react';
import {
  Home,
  Store,
  Users,
  History,
  Settings,
  HelpCircle,
  Utensils,
  LayoutGrid,
  ClipboardList,
  ChartLine,
  MonitorCheck,
  ReceiptText,
  CalendarDays,
  MessageCircle,
  CreditCard,
  LayoutDashboard,
  Receipt,
  ScrollText,
} from 'lucide-react';
import type { FeatureKey } from '@/constants/feature-catalog';

export type MenuItem = {
  title: string;
  icon: LucideIcon;
  path?: string;
  /** Link ngoài (vd mailto:) — mở trực tiếp, không điều hướng SPA. */
  href?: string;
  children?: { title: string; path: string }[];
  /** Tính năng gói yêu cầu — ẩn mục menu khi gói hiện tại không có (không đặt = luôn hiện). */
  feature?: FeatureKey;
};

export type MenuGroup = {
  label: string;
  items: MenuItem[];
};

export type AppRole = 'admin' | 'manager' | 'staff' | 'super-admin';

/** Nhãn tiếng Việt cho từng vai trò — dùng chung ở Header + Sidebar footer. */
export const ROLE_LABEL: Record<AppRole, string> = {
  admin: 'Admin',
  manager: 'Quản lý',
  staff: 'Nhân viên',
  'super-admin': 'Super Admin',
};

/** Trả về nhãn tiếng Việt của role; fallback chữ thường khi role không thuộc hệ thống. */
export function getRoleLabel(role?: string): string {
  if (role && role in ROLE_LABEL) return ROLE_LABEL[role as AppRole];
  return role || '';
}

/** Email hỗ trợ + mailto kèm sẵn subject — dùng cho nút "Trợ Giúp" sidebar. */
export const SUPPORT_EMAIL = 'nhahangos.suport@gmail.com';
const SUPPORT_SUBJECT = 'Yêu cầu hỗ trợ NhaHang OS';
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(SUPPORT_SUBJECT)}`;

const ADMIN_MENU: MenuGroup[] = [
  {
    label: 'Tổng quan',
    items: [
      { title: 'Tổng Quan Hệ Thống', icon: Home, path: '/admin' },
      { title: 'Quản Lý Nhà Hàng', icon: Store, path: '/admin/restaurants' },
      { title: 'Người Dùng Hệ Thống', icon: Users, path: '/admin/customers' },
    ],
  },
  {
    label: 'Tài chính',
    items: [
      { title: 'Báo Cáo Kinh Doanh', icon: ChartLine, path: '/admin/reports', feature: 'advanced_report' },
      { title: 'Thanh Toán & Gói', icon: CreditCard, path: '/admin/billing' },
    ],
  },
  {
    label: 'Công cụ',
    items: [
      { title: 'Tin Nhắn', icon: MessageCircle, path: '/admin/messages', feature: 'messaging_group' },
      { title: 'Nhật Ký Hệ Thống', icon: History, path: '/admin/logs' },
      { title: 'Cài Đặt Chung', icon: Settings, path: '/admin/settings' },
    ],
  },
];

const MANAGER_MENU: MenuGroup[] = [
  {
    label: 'Tổng quan',
    items: [
      { title: 'Tổng Quan Chi Nhánh', icon: Home, path: '/manager' },
    ],
  },
  {
    label: 'Vận hành',
    items: [
      { title: 'Quản Lý Thực Đơn', icon: Utensils, path: '/manager/menu/items' },
      { title: 'Sơ Đồ Bàn', icon: LayoutGrid, path: '/manager/tables' },
      { title: 'Đơn Hiện Tại', icon: ReceiptText, path: '/manager/orders' },
      { title: 'Quản Lý Đơn Hàng', icon: ClipboardList, path: '/manager/orders/management' },
      { title: 'Lịch Đặt Bàn', icon: CalendarDays, path: '/manager/reservations' },
      { title: 'Nhân Viên', icon: Users, path: '/manager/staff' },
    ],
  },
  {
    label: 'Công cụ',
    items: [
      { title: 'Tin Nhắn', icon: MessageCircle, path: '/manager/messages', feature: 'messaging_group' },
      { title: 'Nhật Ký Hệ Thống', icon: History, path: '/manager/logs' },
      { title: 'Cài Đặt Chung', icon: Settings, path: '/manager/settings' },
      { title: 'Trợ Giúp', icon: HelpCircle, href: SUPPORT_MAILTO },
    ],
  },
];

const STAFF_MENU: MenuGroup[] = [
  {
    label: 'Bán Hàng',
    items: [
      { title: 'Sơ Đồ Bàn (Live)', icon: LayoutGrid, path: '/staff/tables' },
      { title: 'Đơn Hiện Tại', icon: MonitorCheck, path: '/staff/orders' },
      { title: 'Lịch Đặt Bàn', icon: CalendarDays, path: '/staff/reservations' },
    ],
  },
  {
    label: 'Công cụ',
    items: [
      { title: 'Tin Nhắn', icon: MessageCircle, path: '/staff/messages', feature: 'messaging_group' },
      { title: 'Cài Đặt Chung', icon: Settings, path: '/staff/settings' },
    ],
  },
];

const SUPER_ADMIN_MENU: MenuGroup[] = [
  {
    label: 'Quản Trị Nền Tảng',
    items: [
      { title: 'Tổng Quan Hệ Thống', icon: LayoutDashboard, path: '/super-admin' },
      { title: 'Tài Khoản Người Thuê', icon: Users, path: '/super-admin/tenants' },
      { title: 'Gói Cước & Giá', icon: CreditCard, path: '/super-admin/pricing' },
      { title: 'Lịch Sử Giao Dịch', icon: Receipt, path: '/super-admin/transactions' },
    ],
  },
  {
    label: 'Công cụ',
    items: [
      { title: 'Nhật Ký Hệ Thống', icon: ScrollText, path: '/super-admin/audit' },
      { title: 'Cài Đặt Chung', icon: Settings, path: '/super-admin/settings' },
    ],
  },
];

const ROLE_MENU: Record<AppRole, MenuGroup[]> = {
  admin: ADMIN_MENU,
  manager: MANAGER_MENU,
  staff: STAFF_MENU,
  'super-admin': SUPER_ADMIN_MENU,
};

/** Trả về cấu hình menu của một vai trò; fallback admin khi role không thuộc hệ thống. */
export function getMenuForRole(role?: string): MenuGroup[] {
  if (role && role in ROLE_MENU) return ROLE_MENU[role as AppRole];
  return ADMIN_MENU;
}

/** Trả về tên trang (title) khớp với pathname — dùng cho breadcrumb Header. */
export function getPageTitle(pathname: string, role?: string): string {
  const groups = getMenuForRole(role);
  for (const group of groups) {
    for (const item of group.items) {
      if (item.path === pathname) return item.title;
      if (item.children?.some((c) => c.path === pathname)) {
        return item.children.find((c) => c.path === pathname)!.title;
      }
    }
  }
  return '';
}
