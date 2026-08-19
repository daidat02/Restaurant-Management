import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useActiveRestaurantId } from '@/hooks/use-active-restaurant';
import { useRestaurant } from '@/hooks/use-restaurant';
import { useSubscription } from '@/hooks/use-subscription';
import { getSubscriptionUsage } from '@/api/subscription.api';
import type { FeatureKey } from '@/constants/feature-catalog';
import type { IPlan, IPricingConfig, IPlanLimits, IPlanUsage } from '@/types/subscription.type';
import type { IRestaurant } from '@/types/restaurant.type';

export type LimitResource = keyof IPlanLimits;

interface PlanContextValue {
  planKey?: string;
  plan?: IPlan;
  restaurants: IRestaurant[];
  pricing: IPricingConfig | null;
  activeRestaurantId: string;
  overrideRestaurantId: string;
  role?: string;
  isSuperAdmin: boolean;
  setOverrideRestaurantId: (id: string) => void;
  hasFeature: (feature: FeatureKey) => boolean;
  limitReached: (resource: LimitResource, used: number) => boolean;
  isLimitReached: (resource: LimitResource, used: number) => boolean;
  getUsagePercentage: (resource: LimitResource, used: number) => number;
  usage?: IPlanUsage;
  resourceCount: (resource: LimitResource) => number;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const role = user?.role;
  const isSuperAdmin = role === 'super-admin';
  const activeRestaurantId = useActiveRestaurantId();
  const { restaurants, fetchRestaurants } = useRestaurant();
  const { pricing } = useSubscription();

  const [overrideRestaurantId, setOverrideRestaurantId] = useState('');
  const [usage, setUsage] = useState<IPlanUsage | undefined>(undefined);

  useEffect(() => {
    void fetchRestaurants();
  }, [fetchRestaurants]);

  const { planKey, plan } = useMemo(() => {
    if (isSuperAdmin) return { planKey: undefined, plan: undefined };
    const targetId = overrideRestaurantId || activeRestaurantId;
    if (targetId) {
      const restaurant = restaurants.find((r) => String(r._id) === String(targetId));
      const key = restaurant?.currentPlanKey;
      const matched = pricing?.plans?.find((p) => p.key === key);
      return { planKey: key, plan: matched };
    }

    const keys = [
      ...new Set(
        restaurants
          .map((r) => r.currentPlanKey)
          .filter((k): k is string => typeof k === 'string' && k.length > 0),
      ),
    ];
    if (keys.length === 0) return { planKey: undefined, plan: undefined };
    const plans = pricing?.plans ?? [];
    const matched = plans.filter((p) => keys.includes(p.key));
    if (matched.length === 0) return { planKey: keys[0], plan: undefined };
    const strictest = matched.reduce((a, b) => ((a.sortOrder ?? 0) <= (b.sortOrder ?? 0) ? a : b));
    return { planKey: strictest.key, plan: strictest };
  }, [isSuperAdmin, overrideRestaurantId, activeRestaurantId, restaurants, pricing]);

  const usageRestaurantId = overrideRestaurantId || activeRestaurantId || '';
  useEffect(() => {
    let cancelled = false;
    if (!usageRestaurantId || isSuperAdmin) {
      setUsage(undefined);
      return;
    }
    setUsage(undefined);
    getSubscriptionUsage(usageRestaurantId)
      .then((u) => {
        if (!cancelled && u) setUsage(u);
      })
      .catch((err) => {
        console.error('[PlanContext] Lỗi lấy mức sử dụng:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [usageRestaurantId, isSuperAdmin]);

  /** ⚡ BẬC BẢO VỆ CHẶT CHẼ: Super-admin bypass (true). Chưa có plan/planKey -> Khóa (false). */
  const hasFeature = useCallback(
    (feature: FeatureKey): boolean => {
      if (isSuperAdmin) return true;
      if (!planKey || !plan) return false;
      return (plan.featureKeys ?? []).includes(feature);
    },
    [isSuperAdmin, planKey, plan],
  );

  const isLimitReached = useCallback(
    (resource: LimitResource, used: number): boolean => {
      if (isSuperAdmin) return false;
      if (!plan) return false;
      const limit = plan.limits?.[resource] ?? 0;
      if (limit <= 0) return false;
      return used >= limit;
    },
    [isSuperAdmin, plan],
  );

  const getUsagePercentage = useCallback(
    (resource: LimitResource, used: number): number => {
      if (!plan) return 0;
      const limit = plan.limits?.[resource] ?? 0;
      if (limit <= 0) return 0;
      return Math.min(100, Math.round((used / limit) * 100));
    },
    [plan],
  );

  const resourceCount = useCallback(
    (resource: LimitResource): number => usage?.[resource] ?? 0,
    [usage],
  );

  const value = useMemo<PlanContextValue>(
    () => ({
      planKey,
      plan,
      restaurants,
      pricing,
      activeRestaurantId,
      overrideRestaurantId,
      role,
      isSuperAdmin,
      setOverrideRestaurantId,
      hasFeature,
      limitReached: isLimitReached,
      isLimitReached,
      getUsagePercentage,
      usage,
      resourceCount,
    }),
    [
      planKey,
      plan,
      restaurants,
      pricing,
      activeRestaurantId,
      overrideRestaurantId,
      role,
      isSuperAdmin,
      hasFeature,
      isLimitReached,
      getUsagePercentage,
      usage,
      resourceCount,
    ],
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlanContext(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlanContext phải được dùng bên trong <PlanProvider>');
  return ctx;
}
