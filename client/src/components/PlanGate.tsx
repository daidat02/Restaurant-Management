import { type KeyboardEvent, type ReactNode } from 'react';

import { useAppDispatch } from '@/hooks/redux-hook';
import { usePlan } from '@/hooks/use-plan';
import type { LimitResource } from '@/contexts/PlanContext';
import { getFeatureLabel, type FeatureKey } from '@/constants/feature-catalog';
import { openUpsell } from '@/redux/slices/upsellSlice';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface PlanGateProps {
  /** Gate theo tính năng — chặn khi gói không có feature này. */
  featureKey?: FeatureKey;
  /** Gate theo giới hạn số lượng — chặn khi đạt trần. */
  resource?: LimitResource;
  /** Số lượng hiện tại (bắt buộc khi có resource). Bỏ qua với daily_orders/group_chats — tự đếm từ server usage. */
  currentCount?: number;
  /** Ép buộc trạng thái bị chặn (không dựa trên feature/resource) — dùng cho điều kiện "OR" nhiều feature. */
  blocked?: boolean;
  /** Chế độ fallback khi bị chặn: hide (mặc định) / disable / upsell. */
  fallbackMode?: 'hide' | 'disable' | 'upsell';
  /** Ghi đè tooltip mặc định (chế độ disable / message upsell). */
  disabledTooltip?: string;
  /** Nhà hàng bị ảnh hưởng — truyền vào upsell meta khi fallbackMode='upsell'. */
  restaurantId?: string;
  children: ReactNode;
}

/**
 * Component gate tái sử dụng theo gói thuê bao (ticket 08):
 * - `hide`: không render children khi bị chặn.
 * - `disable`: render children nhưng mờ + khoá click + tooltip giải thích.
 * - `upsell`: render children và khi click → mở UpsellSubscriptionModal.
 *   Click được chặn ở capture phase nên onClick của children KHÔNG chạy khi bị chặn —
 *   consumer chỉ cần bọc PlanGate, không cần guard thủ công.
 * Nguồn dữ liệu giống hệt server (featureKeys + limits) nên UI luôn khớp enforcement.
 */
export default function PlanGate({
  featureKey,
  resource,
  currentCount,
  blocked: forcedBlocked,
  fallbackMode = 'hide',
  disabledTooltip,
  restaurantId,
  children,
}: PlanGateProps) {
  const { hasFeature, isLimitReached, plan, resourceCount } = usePlan();
  const dispatch = useAppDispatch();

  // daily_orders / group_chats: tự lấy số lượng từ server usage (không cần currentCount).
  const autoCount =
    currentCount == null && (resource === 'daily_orders' || resource === 'group_chats')
      ? resourceCount(resource)
      : currentCount;

  const featureBlocked = !!featureKey && !hasFeature(featureKey);
  const resourceBlocked = !!resource && autoCount != null && isLimitReached(resource, autoCount);
  const blocked = forcedBlocked ?? (featureBlocked || resourceBlocked);

  const planName = plan?.name || 'gói hiện tại';

  const defaultTooltip = (() => {
    if (resourceBlocked && resource != null && autoCount != null) {
      const limit = plan?.limits?.[resource] ?? 0;
      return `Đã đạt trần ${autoCount}/${limit} của gói ${planName}`;
    }
    if (featureBlocked && featureKey) {
      return `Tính năng ${getFeatureLabel(featureKey)} không có trong gói ${planName}`;
    }
    return '';
  })();

  const tooltip = disabledTooltip ?? defaultTooltip;

  if (!blocked) return <>{children}</>;
  if (fallbackMode === 'hide') return null;

  if (fallbackMode === 'disable') {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <div className={cn('pointer-events-none cursor-not-allowed opacity-50')}>
              {children}
            </div>
          </TooltipTrigger>
          {tooltip && <TooltipContent>{tooltip}</TooltipContent>}
        </Tooltip>
      </TooltipProvider>
    );
  }

  // fallbackMode === 'upsell' — click vào children mở modal upsell (reuse UpsellSubscriptionModal).
  const handleUpsell = () => {
    dispatch(
      openUpsell({
        type: 'plan-limit',
        restaurantId: restaurantId ?? null,
        message: tooltip,
        meta: {
          planKey: plan?.key,
          resource: resourceBlocked ? resource : undefined,
          limit: resourceBlocked ? plan?.limits?.[resource] : undefined,
          used: resourceBlocked ? autoCount : undefined,
          feature: featureBlocked ? featureKey : undefined,
        },
      }),
    );
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleUpsell();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="cursor-pointer"
      onClickCapture={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleUpsell();
      }}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}
