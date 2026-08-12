import { Check } from 'lucide-react';
import type { IOrder } from '@/types/order.type';
import { cn } from '@/lib/utils';

interface OrderStatusControlProps {
  order: IOrder;
  onStatusChange: (id: string, status: string) => void;
}

interface Step {
  key: string;
  label: string;
}

const ORDER_FLOW: Step[] = [
  { key: 'pending', label: 'Chờ xác nhận' },
  { key: 'confirmed', label: 'Đã xác nhận' },
  { key: 'preparing', label: 'Đang chế biến' },
  { key: 'served', label: 'Đã phục vụ' },
  { key: 'delivered', label: 'Đã giao' },
];

const TERMINAL: Record<string, string> = {
  paid: 'Đã thanh toán',
  cancelled: 'Đã hủy',
};

export default function OrderStatusControl({ order, onStatusChange }: OrderStatusControlProps) {
  const current = order.status || 'pending';
  const currentIdx = ORDER_FLOW.findIndex((s) => s.key === current);

  const isTerminal = current === 'paid' || current === 'cancelled';
  const reachedIdx = isTerminal ? ORDER_FLOW.length - 1 : currentIdx;
  const activeIndex = isTerminal ? currentIdx : currentIdx;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-bold text-slate-900">Cập nhật trạng thái</h3>
        {isTerminal && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            {TERMINAL[current]}
          </span>
        )}
      </div>

      <ol className="space-y-0">
        {ORDER_FLOW.map((step, i) => {
          const isDone = i < reachedIdx || (isTerminal && i <= reachedIdx && current === 'paid');
          const isActive = !isTerminal && i === activeIndex;
          const isReachable = i <= currentIdx + 1 && !isTerminal;

          return (
            <li key={step.key} className="relative flex gap-3">
              {/* Line nối */}
              {i < ORDER_FLOW.length - 1 && (
                <span
                  className={cn(
                    'absolute left-[9px] top-[22px] h-[calc(100%-14px)] w-0.5',
                    isDone ? 'bg-cerulean-blue-500' : 'bg-slate-200',
                  )}
                />
              )}

              <button
                type="button"
                disabled={!isReachable}
                onClick={() => {
                  if (order._id && isReachable) onStatusChange(order._id, step.key);
                }}
                className={cn(
                  'relative z-10 flex shrink-0 items-center justify-center rounded-full transition-all',
                  'h-[18px] w-[18px] border-2',
                  isDone
                    ? 'border-cerulean-blue-500 bg-cerulean-blue-500 text-white'
                    : isActive
                      ? 'border-cerulean-blue-500 bg-white text-cerulean-blue-600'
                      : 'border-slate-300 bg-white',
                  !isTerminal && isReachable && 'cursor-pointer hover:border-cerulean-blue-400',
                  isTerminal && 'cursor-not-allowed opacity-60',
                )}
                aria-label={step.label}
                title={isReachable && !isTerminal ? `Chuyển sang ${step.label}` : step.label}
              >
                {isDone ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
              </button>

              <button
                type="button"
                disabled={!isReachable}
                onClick={() => {
                  if (order._id && isReachable) onStatusChange(order._id, step.key);
                }}
                className={cn(
                  'rounded-md pb-4 pt-1 text-sm transition-colors',
                  !isTerminal && isReachable
                    ? 'cursor-pointer text-left hover:text-cerulean-blue-700'
                    : 'cursor-default',
                  isActive ? 'font-bold text-cerulean-blue-700' : 'font-medium text-slate-600',
                  !isReachable && 'opacity-40',
                )}
              >
                {step.label}
              </button>
            </li>
          );
        })}
      </ol>

      {isTerminal && (
        <p className="mt-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Đơn hàng đã kết thúc, không thể thay đổi trạng thái.
        </p>
      )}
    </div>
  );
}
