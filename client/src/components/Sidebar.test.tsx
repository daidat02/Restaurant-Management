import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { SidebarProvider } from '@/components/ui/sidebar';
import SidebarApp from '@/components/Sidebar';
import { PlanProvider } from '@/contexts/PlanContext';
import { FREE, mkRestaurant, PRICING, PRO } from '@/test/fixtures';

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

function renderSidebar() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <SidebarProvider>
        <PlanProvider>
          <SidebarApp />
        </PlanProvider>
      </SidebarProvider>
    </MemoryRouter>,
  );
}

function mockAdminChain(planKeys: string[]) {
  mocks.useAuth.mockReturnValue({
    user: { _id: 'u1', name: 'Chủ chuỗi', role: 'admin', restaurantIds: planKeys.map((_, i) => `r${i}`) },
    logout: vi.fn(),
  });
  mocks.useActiveRestaurantId.mockReturnValue('');
  mocks.useRestaurant.mockReturnValue({
    restaurants: planKeys.map((key, i) => mkRestaurant(`r${i}`, key)),
    fetchRestaurants: vi.fn(),
  });
  mocks.useSubscription.mockReturnValue({ pricing: { ...PRICING, plans: [FREE, PRO] } });
}

beforeEach(() => {
  mocks.useAuth.mockReturnValue({ user: null });
  mocks.useActiveRestaurantId.mockReturnValue('');
  mocks.useRestaurant.mockReturnValue({
    restaurants: [],
    fetchRestaurants: vi.fn().mockResolvedValue(undefined),
  });
  mocks.useSubscription.mockReturnValue({ pricing: null });
});

describe('Sidebar — lọc menu theo gói (tầng menu gating)', () => {
  it('gói Miễn Phí (chuỗi free): ẩn mục cần feature (Báo Cáo Kinh Doanh, Tin Nhắn)', () => {
    mockAdminChain(['free']);
    renderSidebar();

    expect(screen.getByText('Tổng Quan Hệ Thống')).toBeInTheDocument();
    expect(screen.getByText('Quản Lý Nhà Hàng')).toBeInTheDocument();
    expect(screen.getByText('Thanh Toán & Gói')).toBeInTheDocument();
    expect(screen.queryByText('Báo Cáo Kinh Doanh')).not.toBeInTheDocument();
    expect(screen.queryByText('Tin Nhắn')).not.toBeInTheDocument();
  });

  it('gói Pro (chuỗi pro): hiển thị đủ mục cần feature', () => {
    mockAdminChain(['pro']);
    renderSidebar();

    expect(screen.getByText('Báo Cáo Kinh Doanh')).toBeInTheDocument();
    expect(screen.getByText('Tin Nhắn')).toBeInTheDocument();
  });

  it('chuỗi lẫn lộn [free, pro]: gói yếu nhất (free) → ẩn feature menu (không bypass admin)', () => {
    mockAdminChain(['free', 'pro']);
    renderSidebar();

    expect(screen.queryByText('Báo Cáo Kinh Doanh')).not.toBeInTheDocument();
    expect(screen.queryByText('Tin Nhắn')).not.toBeInTheDocument();
  });
});
