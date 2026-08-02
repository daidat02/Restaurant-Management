import { useState, useEffect } from 'react';
import { useAnalytic } from '@/hooks/use-analytic';

import { DatePickerWithRange } from '@/components/DatePickerRange';
import { format, startOfMonth } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { useActiveRestaurantId } from '@/hooks/use-active-restaurant';
import { OverviewCards, TopDishesTable } from './components/OverView';
import { ChartsSection } from './components/ChartsSection';
import { SubscriptionAlertsTable } from '../components/SubscriptionAlertsTable';
import { extractId } from '@/utils/helpers';

interface IHeaderProps {
  value: { from: string; to: string };
  onSelectDate: (val: { from: string; to: string }) => void;
}

function GlobalHeader({ value, onSelectDate }: IHeaderProps) {
  const today = new Date();
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 border-b border-slate-200 pb-5">
      <div className="flex items-start gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-950">
            Báo Cáo & Phân Tích
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Hôm nay:{' '}
            {today.toLocaleDateString('vi-VN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}{' '}
            | Hệ thống cập nhật realtime
          </p>
        </div>
      </div>
      <DatePickerWithRange mode="range" value={value} onChange={onSelectDate} />
    </div>
  );
}

export default function Home() {
  // Bóc tách thêm 'branchRevenueList' từ hook phân tích (nếu bạn đã cấu hình lưu dữ liệu aggregate chi nhánh)
  const {
    overviewStats,
    revenueHourly,
    orderChannels,
    revenueBranch,
    fetchDashboardData,
  } = useAnalytic();
  const { user } = useAuth();
  const activeRestaurantId = useActiveRestaurantId();

  const [date, setDate] = useState<{ from: string; to: string }>({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });

  // Admin: danh sách id nhà hàng trong chuỗi (dùng làm dep ổn định).
  const adminRestaurantIds = Array.isArray(user?.restaurantIds)
    ? user!.restaurantIds.map((id) => extractId(id)).filter((id) => id.length > 0)
    : [];
  const adminRestaurantIdsKey = adminRestaurantIds.join(',');

  useEffect(() => {
    if (!user?.role) return;

    const payload: any = {
      startDate: date.from,
      endDate: date.to,
    };

    // Admin (chủ chuỗi): gộp toàn bộ restaurantIds → KPI toàn chuỗi (ticket 02/06).
    // Manager/staff: vẫn theo 1 nhà hàng đang chọn (activeRestaurantId).
    if (user?.role === 'admin' && adminRestaurantIdsKey.length > 0) {
      payload.restaurantIds = adminRestaurantIdsKey.split(',').filter(Boolean);
    } else {
      payload.restaurantId = activeRestaurantId;
    }

    // KHÔNG gọi revenue-channels ở đây: endpoint này chỉ dành cho super-admin
    // (doanh thu gộp toàn hệ thống, không lọc tenant — admin gọi sẽ 403 + rò dữ liệu).
    fetchDashboardData(payload);
  }, [date.from, date.to, user?.role, activeRestaurantId, adminRestaurantIdsKey, fetchDashboardData]);

  const handleSelectDate = (val: { from: string; to: string }) => {
    setDate(val);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8">
        <GlobalHeader value={date} onSelectDate={handleSelectDate} />

        {/* Bảng cảnh báo thuê bao từng chi nhánh — chỉ hiển thị với admin (chủ chuỗi) */}
        {user?.role === 'admin' && <SubscriptionAlertsTable />}

        <div className="space-y-8 animate-fade-in">
          {/* Cụm 1: Thẻ thông số tổng quan */}
          <OverviewCards overviewStats={overviewStats} />

          <ChartsSection
            userRole={user?.role} // Truyền role để component con tự đổi giao diện
            revenueBranch={revenueBranch} // Dữ liệu bảng chi nhánh cho Admin (Nếu là manager mảng này sẽ tự rỗng)
            revenueHourly={revenueHourly}
            orderChannels={orderChannels}
          />
          {/* Cụm 3: Bảng xếp hạng món ăn */}
          <TopDishesTable />
        </div>
      </div>
    </div>
  );
}
