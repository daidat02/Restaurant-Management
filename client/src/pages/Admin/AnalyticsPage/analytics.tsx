import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { BarChart3, Sparkles } from 'lucide-react';
import { useAnalytic } from '@/hooks/use-analytic';
import { useAuth } from '@/hooks/use-auth';
import { useActiveRestaurantId } from '@/hooks/use-active-restaurant';
import { extractId } from '@/utils/helpers';
import type {
  IAnalyticQueryParams,
  IChannelTrendDay,
  IHourMatrixCell,
} from '@/types/analytic.type';
import { getChannelTrend, getHourMatrix } from '@/api/analytic.api';

import { OverviewCards } from './components/OverviewCards';
import { ChartsSection } from './components/ChartsSection';
import { HourHeatmap } from './components/HourHeatmap';
import { ChannelSection } from './components/ChannelSection';
import { ReviewsPlaceholder } from './components/ReviewsPlaceholder';
import { ExportButton } from './components/ExportButton';
import { DatePickerWithRange } from '@/components/DatePickerRange';

/**
 * Trang BÁO CÁO NÂNG CAO (admin /admin/reports) — chỉ gói có advanced_report.
 * Một trang cuộn dọc theo section: Header(export) → KPI → Chi nhánh →
 * Heatmap giờ → Kênh & xu hướng → Đánh giá KH (dev-only mock).
 * Section nặng (heatmap/trend) lazy fetch khi gần vào viewport.
 */

const PRESETS = [
  { key: 'today', label: 'Hôm nay' },
  { key: 'week', label: '7 ngày qua' },
  { key: 'month', label: 'Tháng này' },
  { key: 'year', label: 'Năm nay' },
] as const;

type PresetKey = (typeof PRESETS)[number]['key'] | 'custom';

function computeDateRange(range: PresetKey): { from: string; to: string } {
  const now = new Date();
  const to = format(now, 'yyyy-MM-dd');
  switch (range) {
    case 'today':
      return { from: to, to };
    case 'week': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return { from: format(d, 'yyyy-MM-dd'), to };
    }
    case 'year':
      return { from: `${now.getFullYear()}-01-01`, to };
    case 'month':
    default:
      return { from: format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd'), to };
  }
}

/** Hook đơn giản phát hiện element vào viewport — dùng lazy-fetch section nặng. */
function useInView<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null);
  const [inView, setInView] = useState(false);

  // Callback ref — tương thích mọi phiên bản React
  const ref = useCallback((el: T | null) => setNode(el), []);

  useEffect(() => {
    if (!node || inView) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, inView]);

  return { ref, inView };
}

export default function AnalyticsPage() {
  // Bộ chọn kỳ: preset hoặc khoảng tùy chỉnh (DatePickerWithRange)
  const [preset, setPreset] = useState<PresetKey>('month');
  const [customRange, setCustomRange] = useState<{ from: string; to: string }>(() =>
    computeDateRange('month'),
  );

  const dateRange = useMemo(
    () => (preset === 'custom' ? customRange : computeDateRange(preset)),
    [preset, customRange],
  );
  const { from, to } = dateRange;

  const {
    overviewStats,
    revenueBranch,
    orderChannels,
    fetchDashboardData,
    fetchRevenueBranches,
    fetchOrderChannels,
  } = useAnalytic();
  const { user } = useAuth();
  const activeRestaurantId = useActiveRestaurantId();

  // Dữ liệu section lazy
  const [hourCells, setHourCells] = useState<IHourMatrixCell[]>([]);
  const [trend, setTrend] = useState<IChannelTrendDay[]>([]);
  const [isLoadingHeatmap, setIsLoadingHeatmap] = useState(false);
  const [isLoadingTrend, setIsLoadingTrend] = useState(false);

  const adminRestaurantIds = Array.isArray(user?.restaurantIds)
    ? user!.restaurantIds.map((id) => extractId(id)).filter((id) => id.length > 0)
    : [];
  const adminRestaurantIdsKey = adminRestaurantIds.join(',');

  const buildPayload = (): IAnalyticQueryParams => {
    const payload: IAnalyticQueryParams = {
      startDate: from,
      endDate: to,
      restaurantId: activeRestaurantId,
    };
    if (user?.role === 'admin' && adminRestaurantIdsKey.length > 0) {
      payload.restaurantIds = adminRestaurantIdsKey.split(',').filter(Boolean);
    }
    return payload;
  };

  const payloadRef = useRef<IAnalyticQueryParams>(buildPayload());
  payloadRef.current = buildPayload();

  // Nhóm dữ liệu chính: overview + chi nhánh + kênh (donut)
  useEffect(() => {
    if (!user?.role) return;
    const payload = buildPayload();
    fetchDashboardData(payload);
    if (user?.role === 'admin') {
      fetchRevenueBranches(payload);
    }
    fetchOrderChannels(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, user?.role, activeRestaurantId, adminRestaurantIdsKey]);

  // Lazy-fetch heatmap khi vào viewport (và refetch khi đổi kỳ nếu đã visible)
  const heatmap = useInView<HTMLDivElement>();
  useEffect(() => {
    if (!heatmap.inView) return;
    let cancelled = false;
    setIsLoadingHeatmap(true);
    getHourMatrix(payloadRef.current)
      .then((data) => !cancelled && setHourCells(data))
      .finally(() => !cancelled && setIsLoadingHeatmap(false));
    return () => {
      cancelled = true;
    };
  }, [heatmap.inView, from, to]);

  // Lazy-fetch trend khi vào viewport
  const trendRef = useInView<HTMLDivElement>();
  useEffect(() => {
    if (!trendRef.inView) return;
    let cancelled = false;
    setIsLoadingTrend(true);
    getChannelTrend(payloadRef.current)
      .then((data) => !cancelled && setTrend(data))
      .finally(() => !cancelled && setIsLoadingTrend(false));
    return () => {
      cancelled = true;
    };
  }, [trendRef.inView, from, to]);

  const handleSelectDate = (val: { from: string; to: string }) => {
    setCustomRange(val);
    setPreset('custom');
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50/50">
      <div className="min-h-screen p-4 md:p-8 space-y-6">
        {/* HEADER: tiêu đề + bộ chọn kỳ + nút xuất Excel */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/60 pb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-950">
              Báo Cáo Nâng Cao
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Phân tích sâu giờ cao điểm, kênh đặt đơn và hiệu suất chuỗi — kèm xuất Excel.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={preset === 'custom' ? '' : preset}
              onChange={(e) => setPreset(e.target.value as PresetKey)}
              className="h-9 px-3 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-cerulean-blue-500 text-slate-700 shadow-sm"
            >
              {PRESETS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
              {preset === 'custom' && <option value="">Tùy chỉnh</option>}
            </select>

            <DatePickerWithRange mode="range" value={dateRange} onChange={handleSelectDate} />

            <ExportButton params={{ startDate: from, endDate: to }} />
          </div>
        </div>

        {/* CỤM 1: OVERVIEW CARD */}
        <section>
          <SectionTitle icon={<Sparkles size={14} />} text="Tổng quan kỳ này" />
          <OverviewCards overviewStats={overviewStats} />
        </section>

        {/* CỤM 2: HIỆU SUẤT CHI NHÁNH + SO SÁNH DOANH THU */}
        <section>
          <SectionTitle text="Hiệu suất chuỗi" />
          <ChartsSection
            userRole="admin"
            revenueBranch={revenueBranch}
            revenueHourly={[]}
          />
        </section>

        {/* CỤM 3: HEATMAP GIỜ CAO ĐIỂM (lazy fetch) */}
        <section ref={heatmap.ref}>
          <HourHeatmap cells={hourCells} isLoading={isLoadingHeatmap} />
        </section>

        {/* CỤM 4: KÊNH ĐẶT ĐƠN — DONUT + XU HƯỚNG (lazy fetch) */}
        <section ref={trendRef.ref}>
          <ChannelSection channels={orderChannels} trend={trend} isLoading={isLoadingTrend} />
        </section>

        {/* CỤM 5: ĐÁNH GIÁ KHÁCH HÀNG — mock, CHỈ hiện ở dev */}
        <ReviewsPlaceholder />
      </div>
    </div>
  );
}

function SectionTitle({ icon, text }: { icon?: React.ReactNode; text: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {icon && (
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cerulean-blue-50 text-cerulean-blue-600">
          {icon}
        </span>
      )}
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{text}</h2>
    </div>
  );
}
