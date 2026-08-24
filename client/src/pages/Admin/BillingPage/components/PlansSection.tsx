import { useState, type RefObject } from 'react';
import { Loader2, Sparkles, Tag } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { IPlan } from '@/types/subscription.type';

import { PlanCard, type PlanChangeType } from './PlanCard';
import { fmtVND } from './billing-utils';

export type CycleMonths = 1 | 3 | 6 | 12;

/** Đơn thanh toán đang chờ xác nhận (transaction pending có link PayOS). */
export interface PendingOrder {
  planName: string;
  /** Mã giao dịch hiển thị (transactionId). */
  code: string;
  amount: number;
}

interface PlansSectionProps {
  plans: IPlan[];
  isLoading: boolean;
  cycleMonths: CycleMonths;
  onCycleChange: (months: CycleMonths) => void;
  selectedPlanForPrice: IPlan | undefined;
  currentPlan: IPlan | undefined;
  cycleSavingPct: (months: number, p: number) => number;
  changeTypeFor: (plan: IPlan) => PlanChangeType;
  onSelectPlan: (plan: IPlan) => void;
  containerRef: RefObject<HTMLDivElement | null>;
  pendingOrder?: PendingOrder | null;
  onResumePayment?: () => void;
  onCancelPendingOrder?: () => void;
  onApplyPromoCode?: (code: string) => void;
}

export function PlansSection({
  plans,
  isLoading,
  cycleMonths,
  onCycleChange,
  selectedPlanForPrice,
  currentPlan,
  cycleSavingPct,
  changeTypeFor,
  onSelectPlan,
  containerRef,
  pendingOrder = null,
  onResumePayment,
  onCancelPendingOrder,
  onApplyPromoCode,
}: PlansSectionProps) {
  const [promoCode, setPromoCode] = useState('');

  const yearSaving = selectedPlanForPrice
    ? cycleSavingPct(12, selectedPlanForPrice.cycles[12] ?? 0)
    : 17;

  const handleApplyPromo = () => {
    if (onApplyPromoCode && promoCode.trim()) {
      onApplyPromoCode(promoCode.trim());
    }
  };

  return (
    <div
      ref={containerRef}
      className="scroll-mt-24 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm md:p-3"
    >
      {/* Header & Toggle Tháng/Năm */}
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-slate-900">Nâng cấp gói</h3>
          <p className="mt-1 text-xs text-slate-500">
            Chọn gói phù hợp hơn với quy mô hiện tại của gian hàng
          </p>
        </div>

        {/* Toggle Tháng / Năm */}
        <div className="inline-flex items-center rounded-full bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => onCycleChange(1)}
            className={cn(
              'rounded-full px-5 py-1.5 text-xs font-semibold transition-all',
              cycleMonths === 1
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900',
            )}
          >
            Tháng
          </button>
          <button
            type="button"
            onClick={() => onCycleChange(12)}
            className={cn(
              'flex items-center gap-1 rounded-full px-4 py-1.5 text-xs font-semibold transition-all',
              cycleMonths === 12
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900',
            )}
          >
            Năm
            {yearSaving > 0 && (
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                −{yearSaving}%
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Thông báo Đơn nâng cấp chờ chuyển khoản */}
      {pendingOrder && (
        <div className="mt-6 flex flex-col items-start justify-between gap-3 rounded-2xl bg-amber-50/80 px-5 py-3.5 border border-amber-100/60 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5 text-[10px] sm:text-xs font-medium text-amber-900">
            <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              Bạn có một đơn <strong>{pendingOrder.planName}</strong> đang chờ xác nhận (
              {fmtVND(pendingOrder.amount)}) — mã{' '}
              <strong className="font-mono text-amber-950">{pendingOrder.code}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={onResumePayment}
              className="rounded-full bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-600 transition"
            >
              Thanh toán
            </button>
            <button
              type="button"
              onClick={onCancelPendingOrder}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition"
            >
              Huỷ
            </button>
          </div>
        </div>
      )}

      {/* Khung Mã ưu đãi */}
      <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-4">
        <div className="flex items-center gap-1.5 text-[12px] font-semibold mb-2">
          <Tag className="h-3.5 w-3.5 text-cerulean-blue-500" />
          Mã ưu đãi (nếu có)
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="NHẬP MÃ ƯU ĐÃI"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-xs  tracking-wider text-slate-800 uppercase placeholder:text-slate-400 placeholder:normal-case focus:border-cerulean-blue-500 focus:bg-white focus:outline-none"
          />
          <button
            type="button"
            onClick={handleApplyPromo}
            className="shrink-0 rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Áp dụng
          </button>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Mã chỉ áp dụng cho các gói được chỉ định. Giá hiển thị bên dưới đã tự giảm nếu gói đủ điều
          kiện.
        </p>
      </div>

      {/* Grid danh sách các gói */}
      {isLoading ? (
        <div className="mt-8 flex h-48 items-center justify-center text-sm text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-cerulean-blue-600" /> Đang tải danh
          sách gói...
        </div>
      ) : plans.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          Chưa có gói dịch vụ nào được cấu hình.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const isCurrent = currentPlan?.key === plan.key;
            const isPopularNow = plan.isPopular && !isCurrent;
            const changeType = changeTypeFor(plan);
            const price = plan.cycles[cycleMonths] ?? plan.priceMonthly;
            const saving = cycleSavingPct(cycleMonths, price);

            return (
              <PlanCard
                key={plan._id ?? plan.key}
                plan={plan}
                isCurrent={isCurrent}
                isPopularNow={isPopularNow}
                price={price}
                cycleMonths={cycleMonths}
                saving={saving}
                changeType={changeType}
                onSelect={() => onSelectPlan(plan)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
