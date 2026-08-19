import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';

import PlanGate from '@/components/PlanGate';
import { PlanProvider } from '@/contexts/PlanContext';
import upsellReducer from '@/redux/slices/upsellSlice';
import { FREE, mkRestaurant, PRICING } from '@/test/fixtures';

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

const store = configureStore({ reducer: { upsell: upsellReducer } });

function renderGate(children: React.ReactNode) {
  return render(
    <Provider store={store}>
      <PlanProvider>{children}</PlanProvider>
    </Provider>,
  );
}

beforeEach(() => {
  store.dispatch({ type: 'upsell/closeUpsell' });
  mocks.useAuth.mockReturnValue({ user: { role: 'manager' } });
  mocks.useActiveRestaurantId.mockReturnValue('r1');
  mocks.useRestaurant.mockReturnValue({
    restaurants: [mkRestaurant('r1', 'free')],
    fetchRestaurants: vi.fn(),
  });
  mocks.useSubscription.mockReturnValue({ pricing: PRICING });
});

describe('PlanGate', () => {
  it('không bị chặn (used < limit) → render children nguyên trạng', () => {
    renderGate(
      <PlanGate resource="tables" currentCount={4} fallbackMode="hide">
        <button type="button">Nút bàn</button>
      </PlanGate>,
    );

    expect(screen.getByRole('button', { name: 'Nút bàn' })).toBeInTheDocument();
  });

  it('mode hide: đạt trần (used = limit) → không render children', () => {
    renderGate(
      <PlanGate resource="tables" currentCount={5} fallbackMode="hide">
        <button type="button">Nút bàn</button>
      </PlanGate>,
    );

    expect(screen.queryByRole('button', { name: 'Nút bàn' })).not.toBeInTheDocument();
  });

  it('mode disable: render children + wrapper mờ/khoá click + tooltip đạt trần', async () => {
    const user = userEvent.setup();
    renderGate(
      <PlanGate resource="tables" currentCount={5} fallbackMode="disable">
        <button type="button">Nút bàn</button>
      </PlanGate>,
    );

    const button = screen.getByRole('button', { name: 'Nút bàn' });
    expect(button).toBeInTheDocument();

    const wrapper = button.closest('.pointer-events-none');
    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveClass('opacity-50');
    expect(wrapper).toHaveClass('cursor-not-allowed');

    // wrapper có pointer-events-none nên user-event hover không tới trigger — dùng fireEvent trực tiếp.
    fireEvent.pointerMove(wrapper as HTMLElement);
    // Text xuất hiện 2 lần (bản a11y ẩn + content hiển thị) → dùng findAllByText.
    const tips = await screen.findAllByText('Đã đạt trần 5/5 của gói Miễn Phí', {}, { timeout: 3000 });
    expect(tips.length).toBeGreaterThan(0);
  });

  it('mode disable + featureKey: tooltip thiếu tính năng', async () => {
    renderGate(
      <PlanGate featureKey="kds" fallbackMode="disable">
        <button type="button">Nút KDS</button>
      </PlanGate>,
    );

    const button = screen.getByRole('button', { name: 'Nút KDS' });
    const wrapper = button.closest('.pointer-events-none');
    fireEvent.pointerMove(wrapper as HTMLElement);
    const tips = await screen.findAllByText(
      'Tính năng KDS bếp không có trong gói Miễn Phí',
      {},
      { timeout: 3000 },
    );
    expect(tips.length).toBeGreaterThan(0);
  });

  it('mode disable: disabledTooltip ghi đè tooltip mặc định', async () => {
    renderGate(
      <PlanGate
        resource="tables"
        currentCount={5}
        fallbackMode="disable"
        disabledTooltip="Nâng gói để thêm bàn"
      >
        <button type="button">Nút bàn</button>
      </PlanGate>,
    );

    const button = screen.getByRole('button', { name: 'Nút bàn' });
    const wrapper = button.closest('.pointer-events-none');
    fireEvent.pointerMove(wrapper as HTMLElement);
    const tips = await screen.findAllByText('Nâng gói để thêm bàn', {}, { timeout: 3000 });
    expect(tips.length).toBeGreaterThan(0);
  });

  it('mode upsell: click → dispatch openUpsell (type plan-limit)', async () => {
    const user = userEvent.setup();
    renderGate(
      <PlanGate resource="tables" currentCount={5} fallbackMode="upsell" restaurantId="r1">
        <button type="button">Nút bàn</button>
      </PlanGate>,
    );

    // Wrapper có role="button" (accessibility) nên có 2 button cùng tên → click theo text.
    await user.click(screen.getByText('Nút bàn'));

    const state = store.getState().upsell;
    expect(state.open).toBe(true);
    expect(state.type).toBe('plan-limit');
    expect(state.restaurantId).toBe('r1');
    expect(state.meta?.resource).toBe('tables');
    expect(state.meta?.limit).toBe(5);
    expect(state.meta?.used).toBe(5);
  });

  it('mode upsell: bị chặn → onClick của children KHÔNG chạy, chỉ mở upsell', async () => {
    const user = userEvent.setup();
    const childClick = vi.fn();
    renderGate(
      <PlanGate resource="tables" currentCount={5} fallbackMode="upsell">
        <button type="button" onClick={childClick}>
          Nút bàn
        </button>
      </PlanGate>,
    );

    await user.click(screen.getByText('Nút bàn'));

    expect(childClick).not.toHaveBeenCalled();
    expect(store.getState().upsell.open).toBe(true);
  });

  it('prop blocked (điều kiện OR nhiều feature): ép chặn → click mở upsell + tooltip tuỳ chỉnh', async () => {
    const user = userEvent.setup();
    renderGate(
      <PlanGate
        blocked
        fallbackMode="upsell"
        disabledTooltip="Tính năng QR chưa có trong gói hiện tại. Nâng gói để sử dụng."
      >
        <button type="button">Nút QR</button>
      </PlanGate>,
    );

    await user.click(screen.getByText('Nút QR'));

    const state = store.getState().upsell;
    expect(state.open).toBe(true);
    expect(state.message).toContain('Nâng gói để sử dụng');
  });
});
