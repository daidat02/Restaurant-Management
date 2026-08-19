import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PlanProvider, usePlanContext } from '@/contexts/PlanContext';
import { ENTERPRISE, FREE, mkRestaurant, PRICING, PRO } from '@/test/fixtures';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useActiveRestaurantId: vi.fn(),
  useRestaurant: vi.fn(),
  useSubscription: vi.fn(),
}));

vi.mock('@/hooks/use-auth', () => ({ useAuth: mocks.useAuth }));
vi.mock('@/hooks/use-active-restaurant', () => ({
  useActiveRestaurantId: mocks.useActiveRestaurantId,
}));
vi.mock('@/hooks/use-restaurant', () => ({ useRestaurant: mocks.useRestaurant }));
vi.mock('@/hooks/use-subscription', () => ({ useSubscription: mocks.useSubscription }));

function Probe() {
  const { planKey, plan, hasFeature, isLimitReached, limitReached, getUsagePercentage } =
    usePlanContext();
  return (
    <div>
      <span data-testid="planKey">{planKey ?? 'none'}</span>
      <span data-testid="planName">{plan?.name ?? 'none'}</span>
      <span data-testid="hasKds">{String(hasFeature('kds'))}</span>
      <span data-testid="hasAdvancedReport">{String(hasFeature('advanced_report'))}</span>
      <span data-testid="limitTables5">{String(isLimitReached('tables', 5))}</span>
      <span data-testid="limitTables4">{String(isLimitReached('tables', 4))}</span>
      <span data-testid="limitUnlimited">{String(isLimitReached('tables', 999))}</span>
      <span data-testid="limitAlias">{String(limitReached('tables', 5))}</span>
      <span data-testid="pct3of5">{String(getUsagePercentage('tables', 3))}</span>
      <span data-testid="pct15of5">{String(getUsagePercentage('tables', 15))}</span>
      <span data-testid="pctUnlimited">{String(getUsagePercentage('tables', 999))}</span>
    </div>
  );
}

/** Harness cho test override — set overrideRestaurantId ngay sau khi mount. */
function OverrideHarness({ overrideTo }: { overrideTo: string }) {
  const { setOverrideRestaurantId } = usePlanContext();
  useEffect(() => {
    setOverrideRestaurantId(overrideTo);
  }, [overrideTo, setOverrideRestaurantId]);
  return <Probe />;
}

function renderPlan() {
  return render(
    <PlanProvider>
      <Probe />
    </PlanProvider>,
  );
}

const emptyRestaurantHook = () => ({
  restaurants: [],
  fetchRestaurants: vi.fn().mockResolvedValue(undefined),
});

beforeEach(() => {
  mocks.useAuth.mockReturnValue({ user: null });
  mocks.useActiveRestaurantId.mockReturnValue('');
  mocks.useRestaurant.mockReturnValue(emptyRestaurantHook());
  mocks.useSubscription.mockReturnValue({ pricing: null });
});

describe('PlanContext — hasFeature', () => {
  it('super-admin bypass: hasFeature luôn true, không cần plan', () => {
    mocks.useAuth.mockReturnValue({ user: { role: 'super-admin' } });
    mocks.useRestaurant.mockReturnValue({
      restaurants: [mkRestaurant('r1', 'free')],
      fetchRestaurants: vi.fn(),
    });
    mocks.useSubscription.mockReturnValue({ pricing: PRICING });

    renderPlan();

    expect(screen.getByTestId('planKey')).toHaveTextContent('none');
    expect(screen.getByTestId('hasKds')).toHaveTextContent('true');
    expect(screen.getByTestId('hasAdvancedReport')).toHaveTextContent('true');
    expect(screen.getByTestId('limitTables5')).toHaveTextContent('false');
    expect(screen.getByTestId('limitUnlimited')).toHaveTextContent('false');
    expect(screen.getByTestId('pctUnlimited')).toHaveTextContent('0');
  });

  it('manager chi nhánh gói Miễn Phí: không có feature', () => {
    mocks.useAuth.mockReturnValue({ user: { role: 'manager' } });
    mocks.useActiveRestaurantId.mockReturnValue('r1');
    mocks.useRestaurant.mockReturnValue({
      restaurants: [mkRestaurant('r1', 'free')],
      fetchRestaurants: vi.fn(),
    });
    mocks.useSubscription.mockReturnValue({ pricing: PRICING });

    renderPlan();

    expect(screen.getByTestId('planKey')).toHaveTextContent('free');
    expect(screen.getByTestId('planName')).toHaveTextContent('Miễn Phí');
    expect(screen.getByTestId('hasKds')).toHaveTextContent('false');
    expect(screen.getByTestId('hasAdvancedReport')).toHaveTextContent('false');
  });

  it('manager chi nhánh gói Pro: có feature', () => {
    mocks.useAuth.mockReturnValue({ user: { role: 'manager' } });
    mocks.useActiveRestaurantId.mockReturnValue('r1');
    mocks.useRestaurant.mockReturnValue({
      restaurants: [mkRestaurant('r1', 'pro')],
      fetchRestaurants: vi.fn(),
    });
    mocks.useSubscription.mockReturnValue({ pricing: PRICING });

    renderPlan();

    expect(screen.getByTestId('hasKds')).toHaveTextContent('true');
    expect(screen.getByTestId('hasAdvancedReport')).toHaveTextContent('true');
  });
});

describe('PlanContext — admin chủ chuỗi (fix bypass)', () => {
  it('chuỗi [free, pro] → resolve theo gói yếu nhất (free), không bypass', () => {
    mocks.useAuth.mockReturnValue({ user: { role: 'admin' } });
    mocks.useActiveRestaurantId.mockReturnValue('');
    mocks.useRestaurant.mockReturnValue({
      restaurants: [mkRestaurant('a', 'free'), mkRestaurant('b', 'pro')],
      fetchRestaurants: vi.fn(),
    });
    mocks.useSubscription.mockReturnValue({ pricing: PRICING });

    renderPlan();

    expect(screen.getByTestId('planKey')).toHaveTextContent('free');
    expect(screen.getByTestId('hasAdvancedReport')).toHaveTextContent('false');
    expect(screen.getByTestId('limitTables5')).toHaveTextContent('true');
  });

  it('chuỗi toàn Pro → cho phép feature', () => {
    mocks.useAuth.mockReturnValue({ user: { role: 'admin' } });
    mocks.useActiveRestaurantId.mockReturnValue('');
    mocks.useRestaurant.mockReturnValue({
      restaurants: [mkRestaurant('a', 'pro'), mkRestaurant('b', 'pro')],
      fetchRestaurants: vi.fn(),
    });
    mocks.useSubscription.mockReturnValue({ pricing: PRICING });

    renderPlan();

    expect(screen.getByTestId('planKey')).toHaveTextContent('pro');
    expect(screen.getByTestId('hasAdvancedReport')).toHaveTextContent('true');
    expect(screen.getByTestId('limitTables5')).toHaveTextContent('false');
  });

  it('admin chưa có chi nhánh (onboarding) → cho phép (server là lưới cuối)', () => {
    mocks.useAuth.mockReturnValue({ user: { role: 'admin' } });
    mocks.useActiveRestaurantId.mockReturnValue('');
    mocks.useSubscription.mockReturnValue({ pricing: PRICING });

    renderPlan();

    expect(screen.getByTestId('planKey')).toHaveTextContent('none');
    expect(screen.getByTestId('hasAdvancedReport')).toHaveTextContent('true');
    expect(screen.getByTestId('limitTables5')).toHaveTextContent('false');
  });

  it('overrideRestaurantId → ưu tiên plan của chi nhánh được cấu hình', () => {
    mocks.useAuth.mockReturnValue({ user: { role: 'admin' } });
    mocks.useActiveRestaurantId.mockReturnValue('');
    mocks.useRestaurant.mockReturnValue({
      restaurants: [mkRestaurant('a', 'free'), mkRestaurant('b', 'pro')],
      fetchRestaurants: vi.fn(),
    });
    mocks.useSubscription.mockReturnValue({ pricing: PRICING });

    render(
      <PlanProvider>
        <OverrideHarness overrideTo="b" />
      </PlanProvider>,
    );

    expect(screen.getByTestId('planKey')).toHaveTextContent('pro');
    expect(screen.getByTestId('hasAdvancedReport')).toHaveTextContent('true');
  });
});

describe('PlanContext — isLimitReached', () => {
  it('limit 0 (không giới hạn) → false kể cả khi dùng nhiều', () => {
    mocks.useAuth.mockReturnValue({ user: { role: 'manager' } });
    mocks.useActiveRestaurantId.mockReturnValue('r1');
    mocks.useRestaurant.mockReturnValue({
      restaurants: [mkRestaurant('r1', 'enterprise')],
      fetchRestaurants: vi.fn(),
    });
    mocks.useSubscription.mockReturnValue({ pricing: PRICING });

    renderPlan();

    expect(screen.getByTestId('limitUnlimited')).toHaveTextContent('false');
    expect(screen.getByTestId('pctUnlimited')).toHaveTextContent('0');
    expect(screen.getByTestId('planName')).toHaveTextContent('Doanh Nghiệp');
  });

  it('đúng ngưỡng: used = limit → true; used = limit - 1 → false', () => {
    mocks.useAuth.mockReturnValue({ user: { role: 'manager' } });
    mocks.useActiveRestaurantId.mockReturnValue('r1');
    mocks.useRestaurant.mockReturnValue({
      restaurants: [mkRestaurant('r1', 'free')],
      fetchRestaurants: vi.fn(),
    });
    mocks.useSubscription.mockReturnValue({ pricing: PRICING });

    renderPlan();

    expect(screen.getByTestId('limitTables5')).toHaveTextContent('true');
    expect(screen.getByTestId('limitTables4')).toHaveTextContent('false');
    expect(screen.getByTestId('limitAlias')).toHaveTextContent('true');
  });
});

describe('PlanContext — getUsagePercentage', () => {
  it('tính phần trăm làm tròn, kẹp tối đa 100; không giới hạn → 0', () => {
    mocks.useAuth.mockReturnValue({ user: { role: 'manager' } });
    mocks.useActiveRestaurantId.mockReturnValue('r1');
    mocks.useRestaurant.mockReturnValue({
      restaurants: [mkRestaurant('r1', 'free')],
      fetchRestaurants: vi.fn(),
    });
    mocks.useSubscription.mockReturnValue({ pricing: PRICING });

    renderPlan();

    expect(screen.getByTestId('pct3of5')).toHaveTextContent('60');
    expect(screen.getByTestId('pct15of5')).toHaveTextContent('100');
  });

  it('chưa resolve plan (onboarding) → 0', () => {
    mocks.useAuth.mockReturnValue({ user: { role: 'manager' } });
    mocks.useActiveRestaurantId.mockReturnValue('r1');
    mocks.useRestaurant.mockReturnValue(emptyRestaurantHook());
    mocks.useSubscription.mockReturnValue({ pricing: PRICING });

    renderPlan();

    expect(screen.getByTestId('pct3of5')).toHaveTextContent('0');
  });
});

describe('PlanContext — gói không có trong pricing (fallback an toàn)', () => {
  it('currentPlanKey lạ → plan undefined, không chặn nhầm', () => {
    mocks.useAuth.mockReturnValue({ user: { role: 'manager' } });
    mocks.useActiveRestaurantId.mockReturnValue('r1');
    mocks.useRestaurant.mockReturnValue({
      restaurants: [mkRestaurant('r1', 'gia-vi-lạ')],
      fetchRestaurants: vi.fn(),
    });
    mocks.useSubscription.mockReturnValue({ pricing: { ...PRICING, plans: [PRO, ENTERPRISE] } });

    renderPlan();

    expect(screen.getByTestId('planKey')).toHaveTextContent('gia-vi-lạ');
    expect(screen.getByTestId('planName')).toHaveTextContent('none');
    expect(screen.getByTestId('hasAdvancedReport')).toHaveTextContent('true');
    expect(screen.getByTestId('limitTables5')).toHaveTextContent('false');
  });
});
