import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Store, Armchair, Utensils, Users } from 'lucide-react';

import { useRestaurant } from '@/hooks/use-restaurant';
import { useSubscription } from '@/hooks/use-subscription';
import { getTablesByRestaurant } from '@/api/table.api';
import { getAllItems } from '@/api/category.api';
import type { IRestaurant } from '@/types/restaurant.type';

import { SubscriptionBadge } from '@/components/SubscriptionBadge';
import { cn } from '@/lib/utils';

type RestaurantWithExtra = IRestaurant & {
  _daysLeft?: number;
  _tableCount?: number;
  _menuItemCount?: number;
};

// Gradient xen kẽ cho phần header mỗi card (đồng phong cách preview restaurants.html)
const GRADIENTS = [
  'from-cerulean-blue-600 to-cerulean-blue-800',
  'from-emerald-500 to-teal-700',
  'from-violet-500 to-purple-700',
  'from-amber-500 to-orange-700',
  'from-rose-500 to-red-700',
  'from-cyan-500 to-sky-700',
];

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
            {filteredRestaurants.map((item, index) => {
              const sub = item as RestaurantWithExtra;
              const gradient = GRADIENTS[index % GRADIENTS.length];
              const tableCount = sub._tableCount ?? counts[String(item._id)]?.tables ?? 0;
              const menuItemCount = sub._menuItemCount ?? counts[String(item._id)]?.items ?? 0;
              const staffCount = item.staffCount ?? 0;

              return (
                <div
                  key={item._id}
                  onClick={() => navigate(`/admin/restaurants/${item._id}`)}
                  className="cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
                >
                  <div
                    className={cn(
                      'relative flex h-32 items-center justify-center bg-gradient-to-br',
                      gradient,
                    )}
                  >
                    <Store className="h-12 w-12 text-white/70" />
                    <span className="absolute right-3 top-3">
                      <SubscriptionBadge subscription={sub.subscription} />
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-gray-900">{item.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {[item.address, item.phone].filter(Boolean).join(' · ') || 'Chưa cập nhật'}
                    </p>
                    <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Armchair className="h-3.5 w-3.5" /> {tableCount} bàn
                      </span>
                      <span className="flex items-center gap-1">
                        <Utensils className="h-3.5 w-3.5" /> {menuItemCount} món
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {staffCount} NV
                      </span>
                    </div>
                    <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/restaurants/${item._id}?tab=store`);
                        }}
                        className="flex-1 rounded-xl bg-cerulean-blue-600 py-2 text-xs font-semibold text-white transition hover:bg-cerulean-blue-700"
                      >
                        Quản lý chi nhánh
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}