import { Check, GitBranch, Clock } from 'lucide-react';
import type { IOrder } from '@/types/order.type';
import { cn } from '@/lib/utils';

interface OrderStatusControlProps {
  order: IOrder;
  onStatusChange: (id: string, status: string) => void;
  /** vertical: stepper dọc trong card sidebar; horizontal: thanh tiến trình nằm ngang. */
  variant?: 'vertical' | 'horizontal';
}

interface Step {
  key: string;
  label: string;
}

const ORDER_FLOW: Step[] = [
  { key: 'pending', label: 'Chờ xác nhận' },
  { key: 'confirmed', label: 'Đã xác nhận' },
  { key: 'preparing', label: 'Đang chế biến' },
  { key: 'serving', label: 'Đang phục vụ' },
  { key: 'served', label: 'Đã phục vụ' },
  { key: 'delivered', label: 'Đã giao' },
  { key: 'completed', label: 'Hoàn thành' },
];

const TERMINAL: Record<string, string> = {
  paid: 'Đã thanh toán',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

export default function OrderStatusControl({
  order,
  onStatusChange,
  variant = 'vertical',
}: OrderStatusControlProps) {
  const current = order.status || 'pending';
  const currentIdx = ORDER_FLOW.findIndex((s) => s.key === current);

  const isTerminal = current === 'paid' || current === 'completed' || current === 'cancelled';
  const reachedIdx = isTerminal ? ORDER_FLOW.length - 1 : currentIdx;
  const activeIndex = isTerminal ? currentIdx : currentIdx;

  if (variant === 'horizontal') {
    return (
      <div className="flex items-start">
        {ORDER_FLOW.map((step, i) => {
          const isDone =
            i < reachedIdx ||
            (isTerminal && i <= reachedIdx && (current === 'paid' || current === 'completed'));
          const isActive = !isTerminal && i === activeIndex;
          const isReachable = i <= currentIdx + 1 && !isTerminal;

          return (
            <div key={step.key} className="relative flex flex-1 flex-col items-center">
              {i < ORDER_FLOW.length - 1 && (
                <span
                  className={cn(
                    'absolute left-1/2 right-[-50%] top-[8px] h-0.5',
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
                  'relative z-10 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-all',
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
              <span
                className={cn(
                  'mt-1.5 whitespace-nowrap text-[11px] leading-tight transition-colors',
                  isActive ? 'font-bold text-cerulean-blue-700' : 'font-medium text-slate-500',
                  !isReachable && 'opacity-40',
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <GitBranch className="h-5 w-5 text-cerulean-blue-600" />
        <h3 className="text-sm font-bold text-gray-900">Cập nhật trạng thái</h3>
        {isTerminal && (
          <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
            {TERMINAL[current]}
          </span>
        )}
      </div>

      <ol className="px-5 py-4">
        {ORDER_FLOW.map((step, i) => {
          const isDone =
            i < reachedIdx ||
            (isTerminal && i <= reachedIdx && (current === 'paid' || current === 'completed'));
          const isActive = !isTerminal && i === activeIndex;
          const isReachable = i <= currentIdx + 1 && !isTerminal;

          return (
            <li
              key={step.key}
              className={cn(
                'relative flex gap-3 pb-6 last:pb-0',
                !isReachable && 'opacity-40',
              )}
            >
              {/* Dot */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  disabled={!isReachable}
                  onClick={() => {
                    if (order._id && isReachable) onStatusChange(order._id, step.key);
                  }}
                  className={cn(
                    'relative z-10 flex shrink-0 cursor-pointer items-center justify-center rounded-full transition-all',
                    isDone
                      ? 'bg-emerald-500 ring-4 ring-emerald-100'
                      : isActive
                        ? 'bg-cerulean-blue-600 ring-4 ring-cerulean-blue-100'
                        : 'border-2 border-dashed border-slate-300 bg-white',
                    isTerminal && 'cursor-not-allowed',
                  )}
                  aria-label={step.label}
                  title={isReachable && !isTerminal ? `Chuyển sang ${step.label}` : step.label}
                >
                  <span className="flex h-8 w-8 items-center justify-center text-white">
                    {isDone ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
                    {isActive ? <Clock className="h-4 w-4" strokeWidth={2.5} /> : null}
                  </span>
                </button>
                {/* Line nối */}
                {i < ORDER_FLOW.length - 1 && (
                  <span
                    className={cn(
                      'mt-1 w-0.5 flex-1',
                      isDone ? 'bg-emerald-200' : 'bg-slate-200',
                    )}
                  />
                )}
              </div>

              <div className="flex-1 pb-1 pt-1">
                <button
                  type="button"
                  disabled={!isReachable}
                  onClick={() => {
                    if (order._id && isReachable) onStatusChange(order._id, step.key);
                  }}
                  className={cn(
                    'cursor-pointer rounded-md text-left text-sm transition-colors',
                    !isTerminal && isReachable && 'hover:text-cerulean-blue-700',
                    isActive
                      ? 'font-bold text-cerulean-blue-700'
                      : isDone
                        ? 'font-semibold text-gray-900'
                        : 'font-medium text-slate-400',
                    isTerminal && 'cursor-not-allowed',
                  )}
                >
                  {step.label}
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      {isTerminal && (
        <p className="mx-5 mb-4 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Đơn hàng đã kết thúc, không thể thay đổi trạng thái.
        </p>
      )}
    </div>
  );
}
