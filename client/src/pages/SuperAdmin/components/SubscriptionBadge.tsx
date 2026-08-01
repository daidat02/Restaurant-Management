import type { SubscriptionState } from '@/types/superadmin.type';

const SUBSCRIPTION_META: Record<SubscriptionState, { label: string; className: string }> = {
  trial: { label: 'Dùng thử', className: 'bg-sky-100 text-sky-700 border border-sky-200' },
  active: { label: 'Đã thanh toán', className: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  locked: { label: 'Bị khoá', className: 'bg-rose-100 text-rose-700 border border-rose-200' },
};

/** Badge trạng thái subscription (trial / active / locked). */
export function SubscriptionBadge({ state }: { state: SubscriptionState | undefined }) {
  const meta = SUBSCRIPTION_META[state || 'locked'] || SUBSCRIPTION_META.locked;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold tracking-wide ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}
