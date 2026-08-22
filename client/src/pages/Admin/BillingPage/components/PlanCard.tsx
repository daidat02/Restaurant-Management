import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { IPlan } from '@/types/subscription.type';

import { fmtVND } from './billing-utils';

export type PlanChangeType = 'current' | 'renew' | 'upgrade' | 'downgrade';

interface PlanCardProps {
  plan: IPlan;
  isCurrent: boolean;
  isPopularNow: boolean;
  price: number;
  cycleMonths: number;
  saving: number;
  changeType: PlanChangeType;
  onSelect: () => void;
}

export function PlanCard({
  plan,
  isCurrent,
  isPopularNow,
  price,
  cycleMonths,
  saving,
  changeType,
  onSelect,
}: PlanCardProps) {
  const isFree = price === 0 && !plan.contactOnly;
  // Hạ gói về Miễn Phí giữa chu kỳ vẫn phải bấm được (lên lịch áp dụng cuối kỳ) —
  // chỉ khoá nút khi gói free KHÔNG phải hành động hạ gói (vd: mua lại khi đã hết hạn).
  const isDowngradeAction = changeType === 'downgrade';
  const isLocked = isCurrent || (isFree && !isDowngradeAction);

  return (
    <div
      className={cn(
        'relative flex flex-col justify-between rounded-3xl p-6 transition-all duration-200 hover:shadow-md',
        isPopularNow
          ? 'border-2 border-cerulean-blue-600 bg-white shadow-sm'
          : 'border border-slate-200/80 bg-slate-50/40',
      )}
    >
      <div>
        {/* Tiêu đề & Badge Đang dùng */}
        <div className="flex items-center gap-2">
          <h4 className="text-[14px] font-bold text-slate-900">{plan.name}</h4>
          {isCurrent && (
            <span className="rounded-md bg-cerulean-blue-600 px-2 py-0.5 text-[9px] font-semibold text-white uppercase tracking-wider">
              Đang dùng
            </span>
          )}
        </div>

        {/* Mô tả hoặc Tag nổi bật */}
        <p className="mt-1 min-h-[36px] text-xs text-slate-500 leading-relaxed">
          {isPopularNow && !plan.description ? 'Gói được chọn nhiều nhất' : plan.description}
        </p>

        {/* Giá cước */}
        <div className="mt-4">
          {plan.contactOnly ? (
            <p className="text-2xl font-black text-slate-900">Liên hệ</p>
          ) : isFree ? (
            <p className="text-2xl font-black text-slate-900">Miễn phí</p>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900">{fmtVND(price)}đ</span>
              <span className="text-xs text-slate-400 font-medium">
                /{cycleMonths === 12 ? 'năm' : `${cycleMonths}tháng`}
              </span>
            </div>
          )}

          {/* Tiết kiệm % */}
          {saving > 0 && !plan.contactOnly && !isFree && (
            <p className="mt-1 text-xs font-bold text-emerald-600">Tiết kiệm {saving}%</p>
          )}
        </div>

        {/* Danh sách tính năng */}
        <ul className="mt-6 flex flex-col gap-2.5 text-xs text-slate-600">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 leading-tight">
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Nút hành động */}
      <div className="mt-8 pt-2">
        <button
          type="button"
          disabled={isLocked}
          onClick={onSelect}
          className={cn(
            'w-full rounded-2xl py-2.5 text-xs font-bold transition-all',
            isLocked
              ? 'border border-slate-200 bg-white text-slate-400 cursor-not-allowed'
              : isPopularNow
                ? 'bg-cerulean-blue-600 text-white shadow-sm hover:bg-cerulean-blue-700'
                : changeType === 'downgrade'
                  ? 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-100',
          )}
        >
          {isCurrent
            ? 'Gói hiện tại'
            : isDowngradeAction
              ? 'Lên lịch hạ gói'
              : isFree
                ? 'Gói miễn phí'
                : plan.contactOnly
                  ? 'Liên hệ'
                  : 'Nâng cấp'}
        </button>
      </div>
    </div>
  );
}
