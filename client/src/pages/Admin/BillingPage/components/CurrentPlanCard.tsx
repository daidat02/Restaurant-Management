import { CalendarClock, Crown, ReceiptText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { IPlan, ISubscriptionInfo } from '@/types/subscription.type';

import { fmtDate, fmtVND } from './billing-utils';

const STATE_LABEL: Record<string, { text: string; className: string }> = {
  active: { text: 'Đang hoạt động', className: 'bg-emerald-50 text-emerald-700' },
  trial: { text: 'Dùng thử', className: 'bg-amber-50 text-amber-700' },
  locked: { text: 'Bị khoá', className: 'bg-rose-50 text-rose-700' },
  pending: { text: 'Chờ thanh toán', className: 'bg-orange-50 text-orange-700' },
};

interface CurrentPlanCardProps {
  selected: ISubscriptionInfo | undefined;
  currentPlan: IPlan | undefined;
  subscriptions: ISubscriptionInfo[];
  onRestaurantChange: (value: string) => void;
  onViewInvoices: () => void;
  activeCount: number;
  currentMonthBilling: number;
  paidTransactionCount: number;
}

export function CurrentPlanCard({
  selected,
  currentPlan,
  subscriptions,
  onRestaurantChange,
  onViewInvoices,
  activeCount,
  currentMonthBilling,
  paidTransactionCount,
}: CurrentPlanCardProps) {
  const renewDate = selected
    ? selected.subscription === 'trial'
      ? selected.trialEndsAt
      : selected.paidUntil
    : undefined;

  return (
    <div className="rounded-2xl border-2 border-cerulean-blue-200 bg-white p-6 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-gray-900">Gói đang sử dụng</h3>
        {selected && (
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-bold',
              STATE_LABEL[selected.subscription]?.className ?? 'bg-slate-100 text-slate-600',
            )}
          >
            {STATE_LABEL[selected.subscription]?.text ?? selected.subscription}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cerulean-blue-600 text-white shadow-lg shadow-cerulean-blue-200">
          <Crown className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold text-gray-900">
            {currentPlan?.name ?? 'Chưa chọn gói'}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            {currentPlan && !currentPlan.contactOnly ? (
              <>
                {fmtVND(currentPlan.priceMonthly)}/tháng
                {renewDate ? (
                  <>
                    {' · '}
                    <span className="font-semibold text-gray-800">
                      {selected?.subscription === 'trial' ? 'Hết hạn dùng thử' : 'Gia hạn'}{' '}
                      {fmtDate(renewDate)}
                    </span>
                  </>
                ) : null}
              </>
            ) : (
              <span>Chọn một gói bên dưới để gia hạn hoặc mở lại chi nhánh.</span>
            )}
          </p>
          {/* Đang chờ hạ gói cuối chu kỳ */}
          {selected?.pendingPlanKey && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
              <CalendarClock className="h-3.5 w-3.5" />
              Đã lên lịch hạ gói — áp dụng khi hết hạn chu kỳ
            </span>
          )}
        </div>
      </div>

      {/* Đang dùng X/Y theo gói + progress bar */}
      {selected?.usage && currentPlan && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {(
            [
              { label: 'Bàn', key: 'tables', caption: 'đang dùng' },
              { label: 'Món', key: 'items', caption: 'đang dùng' },
              { label: 'Nhân viên', key: 'staff', caption: 'đang dùng' },
              { label: 'Đơn hôm nay', key: 'daily_orders', caption: '' },
              { label: 'Nhóm chat', key: 'group_chats', caption: 'đang dùng' },
            ] as const
          ).map(({ label, key, caption }) => {
            const limit = currentPlan.limits?.[key] ?? 0;
            const used = selected.usage?.[key] ?? 0;
            const unlimited = limit <= 0;
            const hit = !unlimited && used >= limit;
            const percent = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
            return (
              <div
                key={key}
                className={cn(
                  'rounded-xl border p-3',
                  hit ? 'border-amber-200 bg-amber-50/60' : 'border-slate-100 bg-slate-50',
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {label} {caption}
                </p>
                <p
                  className={cn(
                    'mt-1 text-lg font-extrabold',
                    hit ? 'text-amber-700' : 'text-gray-900',
                  )}
                >
                  {used}
                  <span className="text-sm font-semibold text-slate-400">
                    {unlimited ? ' / ∞' : ` / ${limit}`}
                  </span>
                </p>
                {unlimited ? (
                  <p className="mt-2 text-[10px] font-semibold text-slate-400">Không giới hạn</p>
                ) : (
                  <div className="mt-2">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          hit ? 'bg-amber-500' : 'bg-cerulean-blue-500',
                        )}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="mt-1 text-right text-[10px] font-semibold text-slate-500">
                      {percent}%
                    </p>
                  </div>
                )}
                {hit && (
                  <p className="mt-1 text-[10px] font-semibold text-amber-600">Đã đạt trần</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Nhà hàng
          </p>
          <p className="mt-1 text-xl font-extrabold text-gray-900">
            {activeCount}{' '}
            <span className="text-sm font-semibold text-slate-400">/ {subscriptions.length}</span>
          </p>
          <p className="text-xs text-emerald-600">đang hoạt động</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Hoá đơn tháng này
          </p>
          <p className="mt-1 text-xl font-extrabold text-cerulean-blue-600">
            {fmtVND(currentMonthBilling)}
          </p>
          <p className="text-xs text-slate-400">{paidTransactionCount} giao dịch</p>
        </div>
      </div>

      <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-600">Nhà hàng thanh toán</p>
          {subscriptions.length > 0 ? (
            <Select value={String(selected?._id ?? '')} onValueChange={onRestaurantChange}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Chọn nhà hàng" />
              </SelectTrigger>
              <SelectContent>
                {subscriptions.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name} —{' '}
                    {s.subscription === 'locked'
                      ? 'Bị khoá'
                      : s.subscription === 'trial'
                        ? `Trial còn ${s.daysLeft} ngày`
                        : s.subscription === 'pending'
                          ? 'Chờ thanh toán'
                          : 'Đang hoạt động'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
              Bạn chưa có nhà hàng nào để thanh toán.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={onViewInvoices}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-cerulean-blue-200 hover:text-cerulean-blue-600"
          >
            <ReceiptText className="h-4 w-4" /> Xem hoá đơn
          </Button>
        </div>
      </div>
    </div>
  );
}