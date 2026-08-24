import { formatVND } from '@/utils/helpers';
import type { ITopItem } from '@/types/analytic.type';
import { Utensils } from 'lucide-react';

interface TopDishesTableProps {
  items: ITopItem[];
  isLoading?: boolean;
  limit?: number;
}

/**
 * Bảng xếp hạng món bán chạy (Home — mọi gói) — dữ liệu thật từ
 * GET /analytics/top-items (aggregate OrderItem, loại deleted/refunded).
 */
export function TopDishesTable({ items, isLoading = false, limit = 5 }: TopDishesTableProps) {
  const maxQuantity = Math.max(...items.map((i) => i.quantity), 1);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Utensils size={16} />
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-900">Xếp hạng món ăn thịnh hành</h3>
            <p className="text-xs text-slate-400">
              Top {limit} món bán nhiều nhất trong kỳ — theo khối lượng suất bán ra
            </p>
          </div>
        </div>
        {items.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
            <Utensils size={13} /> {items.length} món
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2.5 py-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
            <Utensils className="h-6 w-6" />
          </span>
          <p className="text-sm font-medium text-slate-400">Chưa có món nào được bán trong kỳ này</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/70">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <th className="px-6 py-3.5">#</th>
                <th className="px-6 py-3.5">Tên Món Ăn</th>
                <th className="px-6 py-3.5 text-center">Số lượng bán</th>
                <th className="px-6 py-3.5 text-right">Tổng Doanh Thu</th>
                <th className="px-6 py-3.5 text-center">Số đơn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {items.map((dish, i) => (
                <tr key={dish.menuItemId ?? i} className="transition-colors hover:bg-slate-50/40">
                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-bold ${
                        i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 font-semibold text-slate-900">{dish.itemName}</td>
                  <td className="px-6 py-3.5 text-center">
                    <div className="mx-auto flex max-w-[180px] flex-col gap-1">
                      <span className="font-semibold text-slate-700">{dish.quantity} suất</span>
                      {/* Thanh tỷ trọng so với món bán chạy nhất */}
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${Math.round((dish.quantity / maxQuantity) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-right font-bold text-cerulean-blue-600">
                    {formatVND(dish.revenue)}
                  </td>
                  <td className="px-6 py-3.5 text-center font-medium text-slate-500">
                    {dish.orderCount} đơn
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
