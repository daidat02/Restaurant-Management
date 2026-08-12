import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Bell,
  CreditCard,
  Globe,
  Layers,
  LayoutGrid,
  Save,
  ShieldCheck,
  Store,
  Tags,
  UserRound,
} from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { useRestaurant } from '@/hooks/use-restaurant';
import { useSetting } from '@/hooks/use-setting';
import { useActiveRestaurantId } from '@/hooks/use-active-restaurant';
import { extractId } from '@/utils/helpers';

import TabStoreSystem from './components/TabStoreSystem';
import TabPayment from './components/TabPayment';
import TabNotifyAppearance from './components/TabNotifyAppearance';
import TabRoles from './components/TabRoles';
import TabAccount from './components/TabAccount';
import TabTables from './components/TabTables';
import TabMenuCategories from './components/TabMenuCategories';
import TabPlatform from './components/TabPlatform';
import TabInfrastructure from './components/TabInfrastructure';
import { cn } from '@/lib/utils';
import type { IRestaurant } from '@/types/restaurant.type';

type SettingTabKey =
  | 'store'
  | 'tables'
  | 'menu'
  | 'payment'
  | 'notify'
  | 'roles'
  | 'account'
  | 'platform'
  | 'infra';

interface SettingTab {
  key: SettingTabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

const TABS: SettingTab[] = [
  {
    key: 'account',
    label: 'Tài khoản',
    icon: UserRound,
    roles: ['admin', 'manager', 'staff', 'super-admin'],
  },
  {
    key: 'store',
    label: 'Cửa hàng & Hệ thống',
    icon: Store,
    roles: ['manager'],
  },
  {
    key: 'payment',
    label: 'Thanh toán',
    icon: CreditCard,
    roles: ['manager'],
  },
  { key: 'tables', label: 'Sơ đồ bàn', icon: LayoutGrid, roles: ['manager'] },
  { key: 'menu', label: 'Danh mục món ăn', icon: Tags, roles: ['manager'] },
  {
    key: 'notify',
    label: 'Thông báo & Giao diện',
    icon: Bell,
    roles: ['admin', 'manager', 'staff'],
  },
  {
    key: 'roles',
    label: 'Phân quyền & Vai trò',
    icon: ShieldCheck,
    roles: ['super-admin'],
  },

  { key: 'platform', label: 'Nền tảng', icon: Layers, roles: ['super-admin'] },
  {
    key: 'infra',
    label: 'Hệ thống & Hạ tầng',
    icon: Globe,
    roles: ['super-admin'],
  },
];

/** Hàm lưu do từng tab đăng ký; trả true khi thành công. */
type TabSaveHandler = () => Promise<boolean>;

export default function SettingsPage() {
  const { user } = useAuth();
  const role = user?.role || 'staff';
  const { restaurants, updateRestaurant, fetchRestaurants } = useRestaurant();
  const {
    currentSetting,
    isLoading,
    error,
    fetchOrCreateSetting,
    editSetting,
    changePaymentMethodType,
    generateKitchenCode,
  } = useSetting();
  const activeRestaurantId = useActiveRestaurantId();

  const [searchParams] = useSearchParams();
  const overrideRestaurantId = searchParams.get('restaurant') || '';

  const [activeTab, setActiveTab] = useState<SettingTabKey>('account');
  const [isDirty, setIsDirty] = useState(false);

  // Registry các hàm lưu của tab đang mounted (không phải state → không gây re-render).
  const saveHandlers = useRef<Partial<Record<SettingTabKey, TabSaveHandler>>>({});

  // Admin từ trang Quản Lý Nhà Hàng bấm "Cài đặt chi nhánh" → ?restaurant=<id>,
  // cần biết tên chi nhánh để hiển thị badge khoá.
  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  // Chỉ manager mới có tab cấu hình theo nhà hàng (scope restaurant).
  // Admin dùng trang Chi Nhánh riêng (/admin/restaurants/:id) để cấu hình từng cơ sở.
  const canLoadSetting = role === 'manager';
  const targetId =
    overrideRestaurantId ||
    activeRestaurantId ||
    (role === 'admin' ? extractId(user?.restaurantIds?.[0]) : '');

  useEffect(() => {
    if (canLoadSetting && targetId) {
      fetchOrCreateSetting('restaurant', 'Restaurant', targetId);
    }
  }, [canLoadSetting, targetId, fetchOrCreateSetting]);

  const visibleTabs = useMemo(() => TABS.filter((t) => t.roles.includes(role)), [role]);

  // Tab hiệu dụng: nếu tab đang chọn không thuộc scope role (vd admin đổi sang user khác)
  // thì tự fallback về tab đầu tiên hợp lệ — không cần effect/setState.
  const effectiveTab = visibleTabs.some((t) => t.key === activeTab)
    ? activeTab
    : (visibleTabs[0]?.key ?? 'store');

  const overrideRestaurant = useMemo(() => {
    if (!overrideRestaurantId) return undefined;
    return restaurants.find((r) => String(r._id) === overrideRestaurantId);
  }, [restaurants, overrideRestaurantId]);

  // Nhà hàng đang được cấu hình — dữ liệu thật, phục vụ tab Cửa hàng & Hệ thống.
  const resolvedRestaurant = useMemo<IRestaurant | undefined>(() => {
    if (overrideRestaurant) return overrideRestaurant;
    if (!targetId) return undefined;
    return restaurants.find((r) => String(r._id) === String(targetId));
  }, [overrideRestaurant, targetId, restaurants]);

  const registerSave = useCallback((key: string, handler?: TabSaveHandler) => {
    saveHandlers.current[key as SettingTabKey] = handler;
  }, []);

  const handleSave = async () => {
    const handler = saveHandlers.current[effectiveTab];
    if (!handler) {
      // Tab chưa có logic lưu thật (mock) → chỉ báo thành công.
      toast.success('Đã lưu cài đặt thành công!', { position: 'top-right' });
      setIsDirty(false);
      return;
    }
    const ok = await handler();
    if (ok) setIsDirty(false);
  };

  const markDirty = useCallback(() => setIsDirty(true), []);

  const renderTab = (key: SettingTabKey) => {
    switch (key) {
      case 'store':
        return (
          <TabStoreSystem
            key={currentSetting?._id || 'store'}
            setting={currentSetting}
            restaurant={resolvedRestaurant}
            isAdmin={role === 'admin'}
            editSetting={editSetting}
            updateRestaurant={updateRestaurant}
            generateKitchenCode={generateKitchenCode}
            registerSave={registerSave}
            onDirty={markDirty}
          />
        );
      case 'tables':
        return <TabTables key={String(targetId)} restaurantId={String(targetId || '')} />;
      case 'menu':
        return <TabMenuCategories key={String(targetId)} restaurantId={String(targetId || '')} />;
      case 'payment':
        return (
          <TabPayment
            key={currentSetting?._id || 'payment'}
            setting={currentSetting}
            editSetting={editSetting}
            changePaymentMethodType={changePaymentMethodType}
            registerSave={registerSave}
            onDirty={markDirty}
          />
        );
      case 'notify':
        return <TabNotifyAppearance onDirty={markDirty} />;
      case 'roles':
        return <TabRoles onDirty={markDirty} />;
      case 'account':
        return (
          <TabAccount
            isSuperAdmin={role === 'super-admin'}
            onDirty={markDirty}
            registerSave={registerSave}
          />
        );
      case 'platform':
        return <TabPlatform onDirty={markDirty} registerSave={registerSave} />;
      case 'infra':
        return <TabInfrastructure onDirty={markDirty} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8">
        {/* ══════════ HEADER ══════════ */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 md:text-3xl">
              Cài Đặt
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Cấu hình cửa hàng, thanh toán, thông báo và phân quyền.
            </p>
          </div>

          {/* Badge chi nhánh đang được cấu hình */}
          {canLoadSetting && resolvedRestaurant && (
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cerulean-blue-100 text-xs font-extrabold text-cerulean-blue-700">
                {(resolvedRestaurant.name || '?').charAt(0).toUpperCase()}
              </span>
              <div className="leading-tight">
                <p className="text-[11px] font-medium text-slate-400">
                  {overrideRestaurantId ? 'Đang cấu hình chi nhánh' : 'Chi nhánh đang cấu hình'}
                </p>
                <p className="text-sm font-bold text-gray-900">{resolvedRestaurant.name}</p>
              </div>
            </div>
          )}
        </div>

        {/* ══════════ TABS NGANG ══════════ */}
        <div className="sticky top-4 z-30 mt-6 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white/90 p-1.5 shadow-card backdrop-blur lg:top-6">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = effectiveTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition',
                  isActive
                    ? 'bg-cerulean-blue-50 text-cerulean-blue-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700',
                )}
              >
                <Icon className="h-4 w-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* ══════════ TRẠNG THÁI TẢI ══════════ */}
        {canLoadSetting && isLoading && (
          <div className="mt-6 rounded-2xl border border-cerulean-blue-100 bg-cerulean-blue-50/60 px-4 py-3 text-sm text-cerulean-blue-700">
            Đang tải cấu hình hệ thống...
          </div>
        )}
        {canLoadSetting && error && !currentSetting && (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            Không tải được cấu hình: {error}
          </div>
        )}
        {canLoadSetting && !targetId && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Không xác định được nhà hàng đang cấu hình. Hãy chọn chi nhánh để mở cài đặt.
          </div>
        )}

        {/* ══════════ PANEL ══════════ */}
        <div className="mt-6">{renderTab(effectiveTab)}</div>
      </div>

      {/* ══════════ ACTION BAR: LƯU CÀI ĐẶT (FIXED) ══════════ */}
      <button
        type="button"
        onClick={handleSave}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-11 items-center gap-2 rounded-2xl bg-cerulean-blue-600 px-5 text-sm font-semibold text-white shadow-xl shadow-cerulean-blue-300/60 transition hover:bg-cerulean-blue-700',
          isDirty && 'ring-2 ring-cerulean-blue-600 ring-offset-2',
        )}
      >
        <Save className="h-4 w-4" /> Lưu cài đặt
      </button>
    </div>
  );
}
