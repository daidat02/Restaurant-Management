import { useCallback, useEffect, useMemo } from 'react';
import { useActiveRestaurantId } from './use-active-restaurant';
import { useRestaurant } from './use-restaurant';
import { useSubscription } from './use-subscription';
import type { FeatureKey } from '@/constants/feature-catalog';
import type { IPlan } from '@/types/subscription.type';

export type LimitResource = 'tables' | 'items' | 'staff';

/**
 * PLAN CỦA NHÀ HÀNG ĐANG LÀM VIỆC — nguồn gate UX duy nhất (menu/route/action).
 * - Resolve nhà hàng từ `useActiveRestaurantId()` → `currentPlanKey` → tìm plan trong pricing.
 * - Không có dữ liệu (chưa load, hoặc admin quản toàn chuỗi — không có 1 chi nhánh) → mặc định CHO PHÉP,
 *   vì server (assertFeature/assertLimit) là lưới cuối.
 */
export const usePlan = () => {
  const activeRestaurantId = useActiveRestaurantId();
  const { restaurants, fetchRestaurants } = useRestaurant();
  const { pricing } = useSubscription();

  // Đảm bảo danh sách nhà hàng (kèm currentPlanKey) có sẵn để resolve gói.
  useEffect(() => {
    void fetchRestaurants();
  }, [fetchRestaurants]);

  const { planKey, plan } = useMemo(() => {
    if (!activeRestaurantId) return { planKey: undefined, plan: undefined };
    const restaurant = restaurants.find((r) => String(r._id) === String(activeRestaurantId));
    const key = restaurant?.currentPlanKey;
    const matched = pricing?.plans?.find((p: IPlan) => p.key === key);
    return { planKey: key, plan: matched };
  }, [activeRestaurantId, restaurants, pricing]);

  /** Gói có tính năng này không? Thiếu dữ liệu plan → cho phép (không chặn nhầm). */
  const hasFeature = useCallback(
    (feature: FeatureKey): boolean => {
      if (!plan) return true;
      return (plan.featureKeys ?? []).includes(feature);
    },
    [plan],
  );

  /** Đã đạt trần giới hạn tài nguyên chưa? Không có plan/limit (0 = không giới hạn) → false. */
  const limitReached = useCallback(
    (resource: LimitResource, used: number): boolean => {
      if (!plan) return false;
      const limit = plan.limits?.[resource];
      if (!limit || limit <= 0) return false;
      return used >= limit;
    },
    [plan],
  );

  return { planKey, plan, hasFeature, limitReached };
};
