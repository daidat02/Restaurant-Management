import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Armchair, Plus, Utensils, Users } from 'lucide-react';

import { useRestaurant } from '@/hooks/use-restaurant';
import { useSubscription } from '@/hooks/use-subscription';
import { getTablesByRestaurant } from '@/api/table.api';
import { getAllItems } from '@/api/category.api';
import type { IRestaurant } from '@/types/restaurant.type';

import { SubscriptionBadge } from '@/components/SubscriptionBadge';

type RestaurantWithExtra = IRestaurant & {
  _daysLeft?: number;
  _tableCount?: number;
  _menuItemCount?: number;
};

export default function RestaurantsPage() {
  const navigate = useNavigate();
  const { fetchRestaurants, restaurants, isLoading } = useRestaurant();
  const { subscriptions } = useSubscription();

  // State quản lý tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');

  // Đếm số bàn & số món thật của từng nhà hàng để đổ lên card
  const [counts, setCounts] = useState<Record<string, { tables: number; items: number }>>({});

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const ownerRestaurants = useMemo(() => {
    const subMap = new Map(subscriptions.map((s) => [String(s._id), s]));
    return (restaurants || [])
      .filter((r) => subMap.has(String(r._id)))
      .map((r) => {
        const sub = subMap.get(String(r._id));
        return {
          ...r,
          subscription: sub?.subscription || r.subscription,
          trialEndsAt: sub?.trialEndsAt || r.trialEndsAt,
          paidUntil: sub?.paidUntil || r.paidUntil,
          _daysLeft: sub?.daysLeft,
        } as RestaurantWithExtra;
      });
  }, [restaurants, subscriptions]);

  // Tải số bàn & món (chỉ count, không ảnh hưởng state chung của hook)
  const loadCounts = useCallback(async (restaurantId: string) => {
    try {
      const [tables, items] = await Promise.all([
        getTablesByRestaurant(restaurantId),
        getAllItems(restaurantId),
      ]);
      setCounts((prev) => ({
        ...prev,
        [restaurantId]: { tables: tables?.length ?? 0, items: items?.length ?? 0 },
      }));
    } catch {
      setCounts((prev) => ({
        ...prev,
        [restaurantId]: { tables: 0, items: 0 },
      }));
    }
  }, []);

  useEffect(() => {
    ownerRestaurants.forEach((r) => loadCounts(String(r._id)));
  }, [ownerRestaurants, loadCounts]);

  // Tìm kiếm cục bộ theo tên, địa chỉ, số điện thoại
  const filteredRestaurants = useMemo(() => {
    if (!ownerRestaurants) return [];
    if (!searchTerm.trim()) return ownerRestaurants;
    const keyword = searchTerm.toLowerCase();
    return ownerRestaurants.filter(
      (item) =>
        item.name?.toLowerCase().includes(keyword) ||
        item.address?.toLowerCase().includes(keyword) ||
        item.phone?.toLowerCase().includes(keyword),
    );
  }, [ownerRestaurants, searchTerm]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8">
        {/* TOP HEADER */}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 md:text-3xl">
            Nhà Hàng
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý chuỗi cửa hàng · {ownerRestaurants.length}/{subscriptions.length} chi nhánh
            trong gói
          </p>
        </div>

        {/* THANH TÌM KIẾM */}
        <div className="relative mt-6 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm tên nhà hàng, số điện thoại, địa chỉ chi nhánh..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-cerulean-blue-500 focus:ring-2 focus:ring-cerulean-blue-100"
          />
        </div>

        {/* CARDS NHÀ HÀNG */}
        {isLoading ? (
          <div className="mt-6 text-sm text-slate-400">Đang tải danh sách nhà hàng...</div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredRestaurants.map((item) => {
              const sub = item as RestaurantWithExtra;
              const tableCount = sub._tableCount ?? counts[String(item._id)]?.tables ?? 0;
              const menuItemCount = sub._menuItemCount ?? counts[String(item._id)]?.items ?? 0;
              const staffCount = item.staffCount ?? 0;

              return (
                <div
                  key={item._id}
                  onClick={() => navigate(`/admin/restaurants/${item._id}`)}
                  className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-cerulean-blue-200 hover:shadow-card-hover"
                >
                  <div className="flex items-center justify-between gap-3 px-5 pt-5">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cerulean-blue-600 to-cerulean-blue-800 text-lg font-bold uppercase text-white shadow-md shadow-cerulean-blue-200">
                      {(item.name || '?').charAt(0)}
                    </span>
                    <SubscriptionBadge subscription={sub.subscription} />
                  </div>

                  <div className="px-5 pb-5 pt-4">
                    <h3 className="truncate text-base font-bold text-slate-900">{item.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                      {[item.address, item.phone].filter(Boolean).join(' · ') || 'Chưa cập nhật'}
                    </p>

                    <div className="mt-4 flex items-center gap-4 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Armchair className="h-3.5 w-3.5 text-cerulean-blue-500" /> {tableCount} bàn
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Utensils className="h-3.5 w-3.5 text-cerulean-blue-500" /> {menuItemCount} món
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-cerulean-blue-500" /> {staffCount} NV
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/restaurants/${item._id}?tab=store`);
                      }}
                      className="mt-4 w-full rounded-xl bg-cerulean-blue-600 py-2 text-xs font-semibold text-white transition hover:bg-cerulean-blue-700"
                    >
                      Quản lý chi nhánh
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Card thêm nhà hàng mới (luôn ở cuối lưới) */}
            <button
              type="button"
              onClick={() => navigate('/admin/restaurants/new')}
              className="group flex min-h-[250px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-cerulean-blue-400 hover:bg-cerulean-blue-50/40"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors group-hover:bg-white group-hover:text-cerulean-blue-600">
                <Plus className="h-6 w-6" />
              </span>
              <span className="text-sm font-semibold text-slate-700 transition-colors group-hover:text-cerulean-blue-600">
                Thêm nhà hàng
              </span>
              <span className="text-xs text-slate-400">Mở chi nhánh mới trong cùng gói</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}