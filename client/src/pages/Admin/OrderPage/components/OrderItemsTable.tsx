import { Plus, UtensilsCrossed } from 'lucide-react';
import type { IOrderItem } from '@/types/order.type';
import { calcItemTotal, formatPrice } from './orderDetailHelpers';
import { mergeOrderItems } from '@/utils/orderItems';

const itemStatusCfg: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Chờ bếp', cls: 'bg-slate-100 text-slate-600' },
  preparing: { label: 'Đang chế biến', cls: 'bg-violet-50 text-violet-700' },
  served: { label: 'Đã phục vụ', cls: 'bg-emerald-50 text-emerald-600' },
};

interface OrderItemsTableProps {
  items: IOrderItem[];
  isLoading?: boolean;
}

export default function OrderItemsTable({ items, isLoading }: OrderItemsTableProps) {
  const active = items.filter((it) => it.status !== 'deleted');
  const deleted = items.filter((it) => it.status === 'deleted');
  const merged = mergeOrderItems(active);
  const mergedDeleted = mergeOrderItems(deleted);

  if (isLoading) {
    return (
      <div className="space-y-3 py-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-3">
            <div className="h-4 w-1/2 animate-pulse rounded-md bg-slate-100" />
            <div className="h-4 w-1/6 animate-pulse rounded-md bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }

  if (merged.length === 0 && mergedDeleted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-slate-300">
        <UtensilsCrossed className="h-9 w-9" />
        <p className="mt-2 text-sm">Chưa có món nào</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {merged.map((item) => {
        const originItems = active.filter((it) => it._id === item?._id);
        const sCfg =
          itemStatusCfg[item.status || 'pending'] ||
          itemStatusCfg[originItems[0]?.status || 'pending'];
        const note = item.note;

        return (
          <li key={item?._id as string} className="flex items-start gap-3 py-4">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cerulean-blue-50 text-xs font-bold text-cerulean-blue-700">
              {item.quantity}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm font-semibold text-gray-900">
                  {item.nameSnapshot}
                </p>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${sCfg.cls}`}
                >
                  {sCfg.label}
                </span>
              </div>
              {item.toppings && item.toppings.length > 0 && (
                <div className="mt-1 flex items-center gap-1.5">
                  <Plus className="h-3 w-3 shrink-0 text-cerulean-blue-400" />
                  <p className="text-xs font-medium text-cerulean-blue-700">
                    {item.toppings.map((t) => `${t.name} +${formatPrice(t.price)}`).join(' · ')}
                  </p>
                </div>
              )}
              {note && (
                <p className="mt-1.5 text-xs text-amber-700">
                  <span className="font-semibold">Ghi chú:</span> {note}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-bold text-gray-900">{formatPrice(calcItemTotal(item))}</p>
              <p className="text-[11px] text-slate-400">
                {formatPrice(item.priceSnapshot)} × {item.quantity}
              </p>
            </div>
          </li>
        );
      })}

      {mergedDeleted.map((item) => (
        <li key={`deleted-${item?._id as string}`} className="flex items-start gap-3 py-4 opacity-75">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-xs font-bold text-rose-500">
            {item.quantity}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-semibold text-slate-400 line-through">
                {item.nameSnapshot}
              </p>
              <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                Đã xóa
              </span>
            </div>
            {item.deletedReason && (
              <p className="mt-1 text-xs text-rose-500">Lý do xóa: {item.deletedReason}</p>
            )}
          </div>
          <span className="shrink-0 text-sm font-bold text-slate-300 line-through">
            {formatPrice(calcItemTotal(item))}
          </span>
        </li>
      ))}
    </ul>
  );
}