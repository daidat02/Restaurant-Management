import type { RestaurantSubscription } from '@/types/restaurant.type';

// Cấu hình hiển thị cho từng trạng thái thuê bao
const SUBSCRIPTION_CONFIG: Record<
  RestaurantSubscription,
  { label: string; className: string }
> = {
  trial: {
    label: 'Trial',
    className: 'bg-sky-100 text-sky-700 border-sky-300',
  },
  active: {
    label: 'Đang hoạt động',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  },
  locked: {
    label: 'Bị khoá',
    className: 'bg-rose-100 text-rose-700 border-rose-300',
  },
  pending: {
    label: 'Chờ thanh toán',
    className: 'bg-orange-100 text-orange-700 border-orange-300',
  },
};

interface SubscriptionBadgeProps {
  subscription?: RestaurantSubscription;
  /** Phụ chú (số ngày còn lại / ngày hết hạn). */
  hint?: string;
  className?: string;
}

/** Badge trạng thái thuê bao: Trial / Đang hoạt động / Bị khoá / Chờ thanh toán. */
export function SubscriptionBadge({ subscription, hint, className }: SubscriptionBadgeProps) {
  if (!subscription) return null;
  const config = SUBSCRIPTION_CONFIG[subscription];
  if (!config) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${config.className} ${className || ''}`}
      >
        {config.label}
      </span>
      {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
    </span>
  );
}
