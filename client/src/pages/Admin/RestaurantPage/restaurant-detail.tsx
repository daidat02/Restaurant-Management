import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CalendarClock,
  CreditCard,
  Gem,
  LayoutGrid,
  Mail,
  MapPin,
  Phone,
  Save,
  Store,
  Tags,
  Users,
} from 'lucide-react';

import { useRestaurant } from '@/hooks/use-restaurant';
import { useSetting } from '@/hooks/use-setting';
import { useSubscription } from '@/hooks/use-subscription';
import { SubscriptionBadge } from '@/components/SubscriptionBadge';
import { Switch } from '@/components/ui/switch';
import TabStoreSystem from '../SettingPage/components/TabStoreSystem';
import TabTables from '../SettingPage/components/TabTables';
import TabMenuCategories from '../SettingPage/components/TabMenuCategories';
import TabPayment from '../SettingPage/components/TabPayment';
import { cn } from '@/lib/utils';

type DetailTabKey = 'store' | 'tables' | 'menu' | 'payment';

interface DetailTab {
  key: DetailTabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: DetailTab[] = [
  { key: 'store', label: 'Cửa hàng & Hệ thống', icon: Store },
  { key: 'tables', label: 'Sơ đồ bàn', icon: LayoutGrid },
  { key: 'menu', label: 'Danh mục món ăn', icon: Tags },
  { key: 'payment', label: 'Thanh toán', icon: CreditCard },
];

type TabSaveHandler = () => Promise<boolean>;

const fmtDate = (d?: Date | string) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Trang chi tiết / cài đặt riêng của một chi nhánh.
 * Chỉ chứa các tab phạm vi nhà hàng (Cửa hàng, Sơ đồ bàn, Món ăn, Thanh toán) —
 * tách biệt với trang Cài Đặt chung (tài khoản, thông báo...).
 */
export default function RestaurantDetailPage() {
  const navigate = useNavigate();
  const { id = '' } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const { restaurants, isLoading, updateRestaurant, fetchRestaurants } = useRestaurant();
  const {
    currentSetting,
    isLoading: settingLoading,
    error,
    fetchOrCreateSetting,
    editSetting,
    changePaymentMethodType,
    generateKitchenCode,
  } = useSetting();

  const [activeTab, setActiveTab] = useState<DetailTabKey>('store');
  const [isDirty, setIsDirty] = useState(false);

  const saveHandlers = useRef<Partial<Record<DetailTabKey, TabSaveHandler>>>({});

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  // Cấu hình (setting) theo đúng chi nhánh đang xem.
  useEffect(() => {
    if (id) {
      void fetchOrCreateSetting('restaurant', 'Restaurant', id);
    }
  }, [id, fetchOrCreateSetting]);

  const restaurant = useMemo(
    () => restaurants.find((r) => String(r._id) === String(id)),
    [restaurants, id],
  );

  // Thông tin thuê bao + tên gói đang dùng của chi nhánh (GET /subscriptions/me + /pricing).
  const { pricing, getStateForRestaurant } = useSubscription();
  const subInfo = useMemo(() => getStateForRestaurant(String(id)), [getStateForRestaurant, id]);
  const currentPlanKey = subInfo?.currentPlanKey ?? restaurant?.currentPlanKey;
  const planName = useMemo(() => {
    if (!currentPlanKey) return undefined;
    return pricing?.plans?.find((p) => p.key === currentPlanKey)?.name;
  }, [currentPlanKey, pricing]);

  // Hỗ trợ deep-link tab qua ?tab=store|tables|menu|payment
  const tabParam = searchParams.get('tab') as DetailTabKey | null;
  const effectiveTab: DetailTabKey =
    (tabParam && TABS.some((t) => t.key === tabParam) ? tabParam : null) ?? activeTab;

  const goTab = (key: DetailTabKey) => {
    setActiveTab(key);
    setSearchParams({ tab: key }, { replace: true });
  };

  const registerSave = useCallback((key: string, handler?: TabSaveHandler) => {
    saveHandlers.current[key as DetailTabKey] = handler;
  }, []);

  const handleSave = async () => {
    const handler = saveHandlers.current[effectiveTab];
    if (!handler) {
      toast.success('Đã lưu cài đặt thành công!', { position: 'top-right' });
      setIsDirty(false);
      return;
    }
    const ok = await handler();
    if (ok) setIsDirty(false);
  };

  const markDirty = useCallback(() => setIsDirty(true), []);

  const handleStatusChange = async (status: 'active' | 'inactive') => {
    if (!restaurant) return;
    const ok = await updateRestaurant(String(restaurant._id), { status });
    if (ok) {
      toast.success(
        status === 'active' ? 'Chi nhánh đã hoạt động trở lại.' : 'Chi nhánh đã ngưng hoạt động.',
        {
          position: 'top-right',
        },
      );
      fetchRestaurants();
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 p-8 text-sm text-slate-400">
        Đang tải thông tin chi nhánh...
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-slate-50 p-8 text-center">
        <Store className="h-10 w-10 text-slate-300" />
        <div>
          <p className="text-lg font-bold text-gray-900">Không tìm thấy chi nhánh</p>
          <p className="mt-1 text-sm text-slate-500">
            Chi nhánh này có thể đã bị xoá hoặc bạn không có quyền truy cập.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/restaurants')}
          className="rounded-xl bg-cerulean-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cerulean-blue-700"
        >
          Quay lại danh sách nhà hàng
        </button>
      </div>
    );
  }

  const renderTab = (key: DetailTabKey) => {
    switch (key) {
      case 'store':
        return (
          <TabStoreSystem
            key={currentSetting?._id || 'store'}
            setting={currentSetting}
            restaurant={restaurant}
            isAdmin
            editSetting={editSetting}
            updateRestaurant={updateRestaurant}
            generateKitchenCode={generateKitchenCode}
            registerSave={registerSave}
            onDirty={markDirty}
          />
        );
      case 'tables':
        return <TabTables key={String(id)} restaurantId={String(id)} />;
      case 'menu':
        return <TabMenuCategories key={String(id)} restaurantId={String(id)} />;
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
      default:
        return null;
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8">
        {/* HEADER */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/restaurants')}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:text-cerulean-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Chi Nhánh</h1>
            <p className="text-sm text-slate-500">Quản lý và cấu hình riêng cho chi nhánh này.</p>
          </div>
        </div>

        {/* CARD THÔNG TIN CHI NHÁNH */}
        <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cerulean-blue-600 to-cerulean-blue-800 text-lg font-bold uppercase text-white shadow-lg shadow-cerulean-blue-200">
                {(restaurant.name || '?').charAt(0)}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-bold text-slate-900">{restaurant.name}</h2>
                  {planName && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-700 ring-1 ring-violet-100">
                      <Gem className="h-3 w-3" />
                      {planName}
                    </span>
                  )}
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  {restaurant.email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      {restaurant.email}
                    </span>
                  )}
                  {restaurant.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {restaurant.phone}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {/* Trạng thái hoạt động hiện tại của chi nhánh */}
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Trạng thái
              </span>
              <span
                className={cn(
                  'text-xs font-semibold',
                  restaurant.status === 'inactive' ? 'text-amber-600' : 'text-emerald-600',
                )}
              >
                {restaurant.status === 'inactive' ? 'Ngưng hoạt động' : 'Đang hoạt động'}
              </span>
              <Switch
                checked={restaurant.status !== 'inactive'}
                onCheckedChange={(on) => handleStatusChange(on ? 'active' : 'inactive')}
                aria-label="Cập nhật trạng thái chi nhánh"
                className={cn(
                  'data-[state=checked]:bg-emerald-500',
                  restaurant.status === 'inactive' && 'data-[state=unchecked]:bg-amber-400',
                )}
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs sm:grid-cols-2 md:grid-cols-4">
            <div className="flex flex-col items-center gap-1 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-500">
                <MapPin className="h-3.5 w-3.5 text-cerulean-blue-500" />
                Địa chỉ
              </span>
              <span className="max-w-44 truncate text-center text-slate-900">
                {restaurant.address || 'Chưa cập nhật'}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
              <span className="inline-flex items-center gap-1.5  text-slate-500">
                <Phone className="h-3.5 w-3.5 text-cerulean-blue-500" />
                Số điện thoại
              </span>
              <span className="max-w-44 truncate text-center  text-slate-900">
                {restaurant.phone || 'Chưa cập nhật'}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-500">
                <Users className="h-3.5 w-3.5 text-cerulean-blue-500" />
                Quy mô
              </span>
              <span className="max-w-44 truncate text-center  text-slate-900">
                {restaurant.capacity
                  ? `${restaurant.capacity} khách · ${restaurant.operatingHours || '—'}`
                  : restaurant.operatingHours || 'Chưa cập nhật'}
              </span>
            </div>
            <div className="col-span-2 flex flex-col items-center gap-1 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100 md:col-span-1">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-500">
                <CalendarClock className="h-3.5 w-3.5 text-cerulean-blue-500" />
                Gói & Thuê bao
              </span>
              <span className="flex max-w-44 flex-col items-center gap-1">
                <span className="truncate text-[10px] text-slate-400">
                  {restaurant.subscription === 'trial'
                    ? `Dùng thử đến ${fmtDate(restaurant.trialEndsAt)}`
                    : restaurant.subscription === 'active'
                      ? `Hoạt động đến ${fmtDate(restaurant.paidUntil)}`
                      : 'Đã khoá — cần gia hạn'}
                </span>
              </span>
            </div>
          </div>

          {restaurant.description && (
            <p className="mt-5 border-t border-slate-100 pt-3 text-sm text-slate-500">
              {restaurant.description}
            </p>
          )}
        </div>

        {/* TABS RIÊNG CHI NHÁNH */}
        <div className="sticky top-4 z-30 mt-6 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white/90 p-1.5 shadow-card backdrop-blur lg:top-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = effectiveTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => goTab(tab.key)}
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

        {/* TRẠNG THÁI TẢI */}
        {settingLoading && (
          <div className="mt-6 rounded-2xl border border-cerulean-blue-100 bg-cerulean-blue-50/60 px-4 py-3 text-sm text-cerulean-blue-700">
            Đang tải cấu hình chi nhánh...
          </div>
        )}
        {error && !currentSetting && (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            Không tải được cấu hình: {error}
          </div>
        )}

        {/* PANEL */}
        <div className="mt-6">{renderTab(effectiveTab)}</div>
      </div>

      {/* ACTION BAR LƯU */}
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
