import { UtensilsCrossed } from 'lucide-react';
import type { IOrderItem } from '@/types/order.type';
import { calcItemTotal, formatPrice } from './orderDetailHelpers';
import { mergeOrderItems } from '@/utils/orderItems';

const itemStatusCfg: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Chờ bếp', cls: 'bg-slate-100 text-slate-600' },
  preparing: { label: 'Đang chế biến', cls: 'bg-violet-50 text-violet-700' },
  served: { label: 'Đã phục vụ', cls: 'bg-emerald-50 text-emerald-700' },
};

interface OrderItemsTableProps {
  items: IOrderItem[];
  isLoading?: boolean;
}

export default function OrderItemsTable({ items, isLoading }: OrderItemsTableProps) {
  const merged = mergeOrderItems(items);

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

  if (merged.length === 0) {
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
        const originItems = items.filter((it) => it._id === item?._id);
        const sCfg =
          itemStatusCfg[item.status || 'pending'] ||
          itemStatusCfg[originItems[0]?.status || 'pending'];
        const note = item.note;

        return (
          <li key={item?._id as string} className="flex items-start justify-between gap-4 py-4">
            <div className="min-w-0">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 ring-1 ring-slate-100">
                  <UtensilsCrossed className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-slate-900">
                    <span className="truncate">{item.nameSnapshot}</span>
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-cerulean-blue-50 px-1.5 text-xs font-bold text-cerulean-blue-700">
                      ×{item.quantity}
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {formatPrice(item.priceSnapshot)}
                  </p>
                  {item.toppings && item.toppings.length > 0 && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      {item.toppings.map((t) => t.name).join(', ')}
                    </p>
                  )}
                  {note && (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-amber-600">
                      <span className="rounded-sm bg-amber-50 px-1.5 py-0.5">{note}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${sCfg.cls}`}
              >
                {sCfg.label}
              </span>
              <span className="font-bold text-slate-900">
                {formatPrice(calcItemTotal(item))}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
