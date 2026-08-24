import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Download, BarChart3 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { useAnalytic } from '@/hooks/use-analytic';
import { useAuth } from '@/hooks/use-auth';
import { useActiveRestaurantId } from '@/hooks/use-active-restaurant';
import { formatVND, extractId } from '@/utils/helpers';
import type { IAnalyticQueryParams } from '@/types/analytic.type';
import { ChartsSection } from './components/ChartsSection';
import { OverviewCards } from './components/OverviewCards';

/**
 * Trang Báo Cáo Kinh Doanh (admin /admin/reports).
 * Dữ liệu thật từ API mảng restaurantIds (ticket 02) — không còn mock data.
 */

function computeDateRange(range: string): { from: string; to: string } {
  const now = new Date();
  const to = format(now, 'yyyy-MM-dd');
  let from: string;

  switch (range) {
    case 'today':
      from = to;
      break;
    case 'week': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      from = format(d, 'yyyy-MM-dd');
      break;
    }
    case 'year': {
      from = `${now.getFullYear()}-01-01`;
      break;
    }
    case 'month':
    default: {
      from = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
      break;
    }
  }

  return { from, to };
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('month');
  const { overviewStats, revenueHourly, orderChannels, revenueBranch, fetchDashboardData, fetchRevenueBranches } =
    useAnalytic();
  const { user } = useAuth();
  const activeRestaurantId = useActiveRestaurantId();

  // Admin (chủ chuỗi): danh sách nhà hàng trong chuỗi — không phụ thuộc nhà hàng đang chọn.
  const adminRestaurantIds = Array.isArray(user?.restaurantIds)
    ? user!.restaurantIds.map((id) => extractId(id)).filter((id) => id.length > 0)
    : [];
  const adminRestaurantIdsKey = adminRestaurantIds.join(',');

  const { from, to } = useMemo(() => computeDateRange(timeRange), [timeRange]);

  useEffect(() => {
    if (!user?.role) return;

    const payload: IAnalyticQueryParams = {
      startDate: from,
      endDate: to,
      restaurantId: activeRestaurantId,
    };

    if (user?.role === 'admin' && adminRestaurantIdsKey.length > 0) {
      payload.restaurantIds = adminRestaurantIdsKey.split(',').filter(Boolean);
    }

    fetchDashboardData(payload);
    if (user?.role === 'admin') {
      fetchRevenueBranches(payload);
    }
  }, [
    from,
    to,
    user?.role,
    activeRestaurantId,
    adminRestaurantIdsKey,
    fetchDashboardData,
    fetchRevenueBranches,
  ]);

  // Biểu đồ so sánh doanh thu giữa các chi nhánh (cùng trục thời gian đã lọc).
  const branchChartConfig = {
    revenue: {
      label: 'Doanh thu',
      color: 'rgb(99, 102, 241)',
    },
  } satisfies ChartConfig;

  const branchChartData = revenueBranch.map((b) => ({
    name: b.branchName,
    revenue: b.revenue,
  }));

  return (
    <div className="h-full overflow-y-auto bg-slate-50/50">
      <div className="min-h-screen p-4 md:p-8 space-y-6">
        {/* TOP HEADER & BỘ LỌC THỜI GIAN */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/60 pb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-950">
              Báo Cáo Kinh Doanh
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Phân tích doanh thu, hiệu suất chi nhánh và hành vi gọi món toàn hệ thống chuỗi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="h-9 px-3 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-cerulean-blue-500 text-slate-700 shadow-sm"
            >
              <option value="today">Hôm nay</option>
              <option value="week">7 ngày qua</option>
              <option value="month">Tháng này</option>
              <option value="year">Năm nay</option>
            </select>

            <ButtonExport />
          </div>
        </div>

        {/* CỤM 1: OVERVIEW CARD (DỮ LIỆU THẬT TOÀN CHUỖI) */}
        <OverviewCards overviewStats={overviewStats} />

        {/* CỤM 2: BẢNG XẾP HẠNG CHI NHÁNH (ADMIN) + KÊNH ĐẶT MÓN */}
        <ChartsSection
          userRole="admin"
          revenueBranch={revenueBranch}
          revenueHourly={revenueHourly}
          orderChannels={orderChannels}
        />

        {/* CỤM 3: BIỂU ĐỒ SO SÁNH DOANH THU CÁC CHI NHÁNH */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <BarChart3 className="text-slate-500" size={18} />
              <h3 className="font-bold text-sm text-slate-900">
                So Sánh Doanh Thu Giữa Các Chi Nhánh
              </h3>
            </div>
            <span className="text-xs font-medium text-slate-400">Đơn vị: VNĐ</span>
          </div>

          <div className="h-72 w-full">
            {branchChartData.length > 0 ? (
              <ChartContainer config={branchChartConfig} className="h-full w-full">
                <BarChart accessibilityLayer data={branchChartData}>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    interval={0}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => {
                          if (name === 'revenue') return formatVND(Number(value));
                          return value;
                        }}
                      />
                    }
                  />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">
                Không có dữ liệu kinh doanh của chi nhánh nào trong kỳ này!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Component nút xuất file tiện ích bọc gọn gàng
function ButtonExport() {
  return (
    <button className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-colors">
      <Download size={14} className="text-slate-500" />
      Xuất Excel
    </button>
  );
}
