import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Users,
  Store,
  Wallet,
  TrendingUp,
  RefreshCw,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Crown,
  Clock,
  LineChart,
  UserPlus,
  XCircle,
  PieChart,
  ScrollText,
  ArrowRight,
  Settings2,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RePieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getAdminDashboard, getPricingConfig } from '@/api/superadmin.api';
import type {
  IAdminDashboard,
  IExpiringRestaurant,
  IOwnerSummary,
} from '@/types/superadmin.type';
import { formatVND, getTimeAgo } from '@/utils/helpers';
import { DataTable, type ColumnDef } from '@/components/TableData';
import { SubscriptionBadge } from './components/SubscriptionBadge';

type StatCardProps = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  sub?: string;
  delta?: number;
  deltaLabel?: string;
  /** Chuỗi dữ liệu nhỏ để vẽ sparkline (null = không vẽ). */
  spark?: number[] | null;
};

/** Sparkline SVG nhẹ, không phụ thuộc thư viện chart. */
function Sparkline({ data, stroke }: { data: number[]; stroke: string }) {
  const w = 120;
  const h = 36;
  if (!data.length || data.every((v) => v === 0)) return <div className="h-9" />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - 3 - ((v - min) / range) * (h - 6)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  sub,
  delta,
  deltaLabel,
  spark,
}: StatCardProps) {
  const isUp = (delta ?? 0) >= 0;
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {delta !== undefined ? (
            <p className="mt-1 flex items-center gap-1.5 text-[11px]">
              <span
                className={`inline-flex items-center rounded-full px-1.5 py-0.5 font-semibold ${
                  isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}
              >
                {isUp ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
              </span>
              {deltaLabel && <span className="text-slate-400">{deltaLabel}</span>}
            </p>
          ) : (
            sub && <p className="mt-1 text-[11px] text-slate-400">{sub}</p>
          )}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}
        >
          {icon}
        </div>
      </div>
      {spark && <div className="mt-3">{<Sparkline data={spark} stroke="#1a71f6" />}</div>}
    </div>
  );
}

type InsightCardProps = {
  label: string;
  value: string | number;
  barPercent?: number;
  barColor?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  sub?: string;
};

function InsightCard({ label, value, barPercent, barColor, icon, iconBg, iconColor, sub }: InsightCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>
            {icon}
          </span>
          <p className="text-xs font-medium text-slate-500">{label}</p>
        </div>
        <p className="text-sm font-bold text-slate-900">{value}</p>
      </div>
      {barPercent !== undefined && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-500`}
            style={{ width: `${Math.min(100, Math.max(0, barPercent))}%` }}
          />
        </div>
      )}
      {sub && <p className="mt-2 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

/** Lấy ngày hết hạn thực tế (trial hoặc paidUntil). */
function expiryDate(item: IExpiringRestaurant) {
  return item.subscription === 'trial' ? item.trialEndsAt : item.paidUntil;
}

/** Số ngày còn lại trước khi hết hạn (>= 0). */
function daysLeft(item: IExpiringRestaurant): number {
  const exp = expiryDate(item);
  if (!exp) return 0;
  return Math.max(0, Math.ceil((new Date(exp).getTime() - Date.now()) / 86_400_000));
}

/** Rút gọn số tiền dạng "12,5tr" / "450k" cho trục biểu đồ. */
function formatCompact(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}tr`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(v);
}

/** Trích xuất message lỗi an toàn từ unknown. */
function getErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'Đã xảy ra lỗi khi tải dữ liệu tổng quan';
}

/** Avatar chữ cái đầu của tên. */
function NameAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cerulean-blue-50 text-sm font-bold text-cerulean-blue-600">
      {initial}
    </span>
  );
}

export default function SuperAdminDashboard() {
  const [data, setData] = useState<IAdminDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [monthlyPrice, setMonthlyPrice] = useState<number | null>(null);

  const loadDashboard = useCallback(() => {
    getAdminDashboard()
      .then((res) => setData(res ?? null))
      .catch((err: unknown) => {
        toast.error(getErrorMessage(err), { position: 'top-right' });
      })
      .finally(() => setIsLoading(false));
    getPricingConfig()
      .then((res) => {
        const price = Number(res?.cycles?.['1']);
        if (price > 0) setMonthlyPrice(price);
      })
      .catch(() => {
        /* Không có pricing thì ẩn phần tổng giá trị gia hạn tiềm năng */
      });
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const chartData = useMemo(
    () => (data?.revenueByMonth ?? []).map((m) => ({ ...m, total: Number(m.total) || 0 })),
    [data],
  );

  // Các chỉ số phái sinh (tính từ dữ liệu sẵn có)
  const insights = useMemo(() => {
    const kpis = data?.kpis;
    const trial = kpis?.trialOwners ?? 0;
    const active = kpis?.activeOwners ?? 0;
    const locked = kpis?.lockedOwners ?? 0;
    const restaurants = kpis?.activeRestaurants ?? 0;
    const totalOwners = trial + active + locked;
    const totalRevenue6m = chartData.reduce((sum, m) => sum + m.total, 0);
    const last = chartData[chartData.length - 1]?.total ?? 0;
    const prev = chartData[chartData.length - 2]?.total ?? 0;
    const growthPct = prev > 0 ? ((last - prev) / prev) * 100 : 0;
    const expiringCount = data?.expiringRestaurants?.length ?? 0;
    const expiringTrial = data?.expiringRestaurants?.filter((r) => r.subscription === 'trial').length ?? 0;
    const expiringPaid = expiringCount - expiringTrial;
    const churnPct = restaurants > 0 ? (expiringCount / restaurants) * 100 : 0;
    const conversionPct = totalOwners > 0 ? (active / totalOwners) * 100 : 0;

    const topOwners = [...(data?.recentOwners ?? [])].sort(
      (a, b) => (b.totalPaid ?? 0) - (a.totalPaid ?? 0),
    );
    const topContributor = topOwners[0];

    return {
      totalOwners,
      totalRevenue6m,
      growthPct,
      expiringCount,
      expiringTrial,
      expiringPaid,
      churnPct,
      conversionPct,
      avgDailyRevenue: (kpis?.monthRevenue ?? 0) / 30,
      topContributor,
      newestOwner: data?.recentOwners?.[0],
    };
  }, [data, chartData]);

  const ownerColumns = useMemo<ColumnDef<IOwnerSummary>[]>(
    () => [
      {
        header: 'Người thuê',
        render: (item) => (
          <div className="flex items-center gap-3">
            <NameAvatar name={item.name} />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-900">{item.name}</span>
              <span className="mt-0.5 block max-w-[240px] truncate text-xs text-slate-500">
                {item.email}
              </span>
            </div>
          </div>
        ),
      },
      {
        header: 'Trạng thái',
        render: (item) => <SubscriptionBadge state={item.state} />,
      },
      {
        header: 'Nhà hàng',
        className: 'text-center',
        render: (item) => (
          <span className="inline-flex min-w-6 items-center justify-center rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {item.restaurantCount ?? 0}
          </span>
        ),
      },
      {
        header: 'Đăng ký',
        render: (item) => (
          <span className="text-xs text-slate-500">{getTimeAgo(item.createdAt ?? '') || '---'}</span>
        ),
      },
      {
        header: 'Tổng đã trả',
        className: 'text-right',
        render: (item) => (
          <span className="text-xs font-bold text-emerald-600">
            {item.totalPaid ? formatVND(item.totalPaid) : '—'}
          </span>
        ),
      },
    ],
    [],
  );

  const expiringColumns = useMemo<ColumnDef<IExpiringRestaurant>[]>(
    () => [
      {
        header: 'Nhà hàng',
        render: (item) => (
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Store className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold text-slate-900">{item.name}</span>
          </div>
        ),
      },
      {
        header: 'Trạng thái',
        render: (item) => <SubscriptionBadge state={item.subscription} />,
      },
      {
        header: 'Hết hạn',
        render: (item) => {
          const exp = expiryDate(item);
          const left = daysLeft(item);
          return (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-600">
                {exp ? new Date(exp).toLocaleDateString('vi-VN') : '---'}
              </span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  left <= 2 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                }`}
              >
                Còn {left} ngày
              </span>
            </div>
          );
        },
      },
      {
        header: 'Chủ sở hữu',
        render: (item) => {
          const owner = item.ownerId;
          if (owner && typeof owner === 'object' && 'name' in owner) {
            return <span className="text-xs font-medium text-slate-600">{owner.name as string}</span>;
          }
          return <span className="text-xs italic text-slate-400">---</span>;
        },
      },
      {
        header: 'Thao tác',
        className: 'text-right',
        render: (item) => (
          <Link
            to={`/super-admin/tenants${item.ownerId?._id ? `?id=${item.ownerId._id}` : ''}`}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-cerulean-blue-200 hover:text-cerulean-blue-600"
          >
            Xem chủ <ArrowRight className="h-3 w-3" />
          </Link>
        ),
      },
    ],
    [],
  );

  const pieData = useMemo(
    () => [
      { name: 'Dùng thử', value: data?.kpis?.trialOwners ?? 0, color: '#0ea5e9' },
      { name: 'Đã thanh toán', value: data?.kpis?.activeOwners ?? 0, color: '#10b981' },
      { name: 'Bị khoá', value: data?.kpis?.lockedOwners ?? 0, color: '#94a3b8' },
    ],
    [data],
  );

  const eventMeta: Record<string, { className: string; icon: React.ReactNode }> = {
    success: { className: 'bg-emerald-100 text-emerald-600', icon: <UserPlus className="h-4 w-4" /> },
    warning: { className: 'bg-amber-100 text-amber-600', icon: <AlertTriangle className="h-4 w-4" /> },
    danger: { className: 'bg-rose-100 text-rose-600', icon: <XCircle className="h-4 w-4" /> },
    info: { className: 'bg-sky-100 text-sky-600', icon: <Activity className="h-4 w-4" /> },
  };

  const maxTopPaid = Math.max(...(data?.topRestaurants ?? []).map((r) => r.totalPaid), 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="min-h-screen bg-slate-50 p-4 text-slate-800 md:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cerulean-blue-600 text-white shadow-lg shadow-cerulean-blue-200">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                  Tổng Quan Hệ Thống
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-cerulean-blue-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-cerulean-blue-700">
                  <Activity className="h-3 w-3" /> Super Admin
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Tình hình kinh doanh nền tảng theo gói thuê: chủ, nhà hàng và doanh thu subscription
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadDashboard}
            disabled={isLoading}
            className="inline-flex h-10 w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-cerulean-blue-200 hover:text-cerulean-blue-600 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>

        {isLoading && !data ? (
          /* Skeleton loading */
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-2xl border border-slate-200/80 bg-white/60"
                />
              ))}
            </div>
            <div className="h-80 animate-pulse rounded-2xl border border-slate-200/80 bg-white/60" />
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="h-72 animate-pulse rounded-2xl border border-slate-200/80 bg-white/60" />
              <div className="h-72 animate-pulse rounded-2xl border border-slate-200/80 bg-white/60" />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Alert banner: nhà hàng sắp hết hạn */}
            {insights.expiringCount > 0 && (
              <div className="flex flex-col gap-3 rounded-2xl border border-amber-200/70 bg-gradient-to-r from-amber-50 to-orange-50 p-4 sm:flex-row sm:items-center">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-amber-900">
                    {insights.expiringCount} nhà hàng sắp hết hạn trong 7 ngày tới
                  </p>
                  <p className="text-xs text-amber-700">
                    Hãy gia hạn hoặc liên hệ chủ để tránh gián đoạn vận hành.
                  </p>
                </div>
                <a
                  href="#expiring-table"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-amber-600"
                >
                  Xem danh sách <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            {/* 4 KPI nền tảng */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Doanh thu tháng này"
                value={formatVND(data?.kpis?.monthRevenue ?? 0)}
                icon={<Wallet className="h-5 w-5" />}
                iconBg="bg-violet-50"
                iconColor="text-violet-600"
                delta={insights.growthPct}
                deltaLabel="so với tháng trước"
                spark={chartData.map((m) => m.total)}
              />
              <StatCard
                label="MRR ước tính"
                value={formatVND(data?.kpis?.mrr ?? 0)}
                icon={<LineChart className="h-5 w-5" />}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
                sub="Doanh thu subscription 30 ngày qua"
              />
              <StatCard
                label="Tổng chủ thuê"
                value={insights.totalOwners}
                icon={<Users className="h-5 w-5" />}
                iconBg="bg-sky-50"
                iconColor="text-sky-600"
                sub={`+${data?.kpis?.newOwners30d ?? 0} đăng ký mới 30 ngày`}
              />
              <StatCard
                label="Nhà hàng hoạt động"
                value={data?.kpis?.activeRestaurants ?? 0}
                icon={<Store className="h-5 w-5" />}
                iconBg="bg-cerulean-blue-50"
                iconColor="text-cerulean-blue-600"
                sub={`+${data?.kpis?.newRestaurants30d ?? 0} nhà hàng mới 30 ngày`}
              />
            </div>

            {/* Biểu đồ doanh thu + Phân bố chủ */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Doanh thu 6 tháng */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cerulean-blue-50 text-cerulean-blue-600">
                      <TrendingUp className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Doanh thu 6 tháng gần nhất
                      </h2>
                      <p className="text-xs text-slate-400">
                        Theo giao dịch subscription đã thanh toán
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                      insights.growthPct >= 0
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {insights.growthPct >= 0 ? '▲' : '▼'} {Math.abs(insights.growthPct).toFixed(1)}%
                    so với tháng trước
                  </span>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3090ff" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="#3090ff" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        tickMargin={12}
                        axisLine={false}
                        className="text-xs font-medium text-slate-500"
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={48}
                        tickFormatter={(v: number) => formatCompact(Number(v) || 0)}
                        className="text-xs font-medium text-slate-400"
                      />
                      <Tooltip
                        cursor={{ stroke: '#3090ff', strokeDasharray: '4 4' }}
                        formatter={(value) => [formatVND(Number(value) || 0), 'Doanh thu']}
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid #e2e8f0',
                          fontSize: 12,
                          boxShadow: '0 8px 30px rgba(30,64,175,0.08)',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="#1a71f6"
                        strokeWidth={2.5}
                        fill="url(#revenueFill)"
                        dot={{ r: 3.5, fill: '#1a71f6', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex items-center gap-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-cerulean-blue-500" /> Doanh thu (₫)
                  </span>
                  <span className="ml-auto font-bold text-slate-900">
                    Tổng 6 tháng: {formatVND(insights.totalRevenue6m)}
                  </span>
                </div>
              </div>

              {/* Phân bố chủ đăng ký */}
              <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <PieChart className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Phân bố chủ đăng ký</h2>
                    <p className="text-xs text-slate-400">Theo trạng thái gói thuê</p>
                  </div>
                </div>

                <div className="relative mx-auto h-52 w-full max-w-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={62}
                        outerRadius={84}
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${value} chủ`, name]}
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid #e2e8f0',
                          fontSize: 12,
                        }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-2xl font-bold text-slate-900">{insights.totalOwners}</p>
                    <p className="text-[11px] font-medium text-slate-400">Tổng chủ</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5">
                  {pieData.map((entry) => (
                    <div
                      key={entry.name}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
                    >
                      <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        {entry.name}
                      </span>
                      <span className="text-sm font-bold text-slate-900">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 4 chỉ số phái sinh */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <InsightCard
                label="Chuyển đổi thử → trả phí"
                value={`${insights.conversionPct.toFixed(0)}%`}
                barPercent={insights.conversionPct}
                barColor="bg-emerald-500"
                icon={<TrendingUp className="h-4 w-4" />}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
                sub="Tỷ lệ chủ active trên tổng chủ"
              />
              <InsightCard
                label="Rủi ro sắp hết hạn"
                value={`${insights.expiringCount} nhà hàng`}
                barPercent={insights.churnPct}
                barColor="bg-amber-500"
                icon={<AlertTriangle className="h-4 w-4" />}
                iconBg="bg-amber-50"
                iconColor="text-amber-600"
                sub={`${insights.churnPct.toFixed(0)}% nhà hàng hết hạn trong 7 ngày`}
              />
              <InsightCard
                label="Doanh thu TB / chủ (ARPU)"
                value={formatVND(data?.kpis?.arpu ?? 0)}
                icon={<Users className="h-4 w-4" />}
                iconBg="bg-cerulean-blue-50"
                iconColor="text-cerulean-blue-600"
                sub="Doanh thu tháng chia số chủ active"
              />
              <InsightCard
                label="Nhà hàng mới (30 ngày)"
                value={data?.kpis?.newRestaurants30d ?? 0}
                icon={<Store className="h-4 w-4" />}
                iconBg="bg-violet-50"
                iconColor="text-violet-600"
                sub="Chi nhánh mới trên nền tảng"
              />
            </div>

            {/* Tín hiệu vận hành nhanh */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <Crown className="h-4 w-4 text-amber-500" />
                  Chủ mới nhất
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <NameAvatar name={insights.newestOwner?.name ?? '—'} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {insights.newestOwner?.name ?? 'Chưa có'}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {insights.newestOwner ? getTimeAgo(insights.newestOwner.createdAt ?? '') : 'Chưa có dữ liệu'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <Wallet className="h-4 w-4 text-emerald-500" />
                  Đóng góp cao nhất
                </div>
                <div className="mt-3">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {insights.topContributor?.name ?? 'Chưa có'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {insights.topContributor
                      ? `${formatVND(insights.topContributor.totalPaid ?? 0)} · ${insights.topContributor.restaurantCount ?? 0} nhà hàng`
                      : 'Chưa có dữ liệu'}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <Activity className="h-4 w-4 text-cerulean-blue-500" />
                  Vận hành tháng
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-slate-900">
                    {data?.kpis?.monthTransactions ?? 0}
                  </p>
                  <p className="text-xs text-slate-500">giao dịch · ~{formatVND(Math.round(insights.avgDailyRevenue))}/ngày</p>
                </div>
              </div>
            </div>

            {/* Người thuê gần đây + Nhà hàng sắp hết hạn */}
            <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cerulean-blue-50 text-cerulean-blue-600">
                    <Users className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Người thuê gần đây</h2>
                    <p className="text-xs text-slate-400">Top chủ mới đăng ký nền tảng</p>
                  </div>
                  <Link
                    to="/super-admin/tenants"
                    className="ml-auto text-xs font-semibold text-cerulean-blue-600 hover:underline"
                  >
                    Tất cả →
                  </Link>
                </div>
                <DataTable
                  data={data?.recentOwners ?? []}
                  columns={ownerColumns}
                  minWidth="540px"
                  emptyMessage="Chưa có chủ nào đăng ký"
                />
              </div>

              <div
                id="expiring-table"
                className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Clock className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Nhà hàng sắp hết hạn</h2>
                    <p className="text-xs text-slate-400">
                      Hết hạn trial / thanh toán trong 7 ngày tới
                    </p>
                  </div>
                </div>
                <DataTable
                  data={data?.expiringRestaurants ?? []}
                  columns={expiringColumns}
                  minWidth="580px"
                  emptyMessage="Không có nhà hàng nào sắp hết hạn"
                />
                {insights.expiringCount > 0 && (
                  <div className="mt-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-3 text-xs text-amber-800">
                    <p className="font-bold">
                      {insights.expiringCount} nhà hàng sắp hết hạn
                    </p>
                    <p className="mt-0.5 text-amber-700">
                      {insights.expiringTrial} trial + {insights.expiringPaid} trả phí
                      {monthlyPrice
                        ? ` — tổng giá trị gia hạn tiềm năng: ${formatVND(insights.expiringCount * monthlyPrice)}`
                        : ''}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Top nhà hàng + Chỉ số vận hành + Sự kiện nổi bật */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Top nhà hàng doanh thu */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <Crown className="h-4 w-4" />
                    </span>
                    <h2 className="text-base font-bold text-slate-900">Top nhà hàng doanh thu</h2>
                  </div>
                </div>
                {data?.topRestaurants?.length ? (
                  <div className="space-y-3">
                    {data.topRestaurants.map((r, i) => (
                      <div key={r._id}>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate font-semibold text-slate-700">
                            <span className="mr-1.5 inline-block w-4 text-center font-bold text-slate-300">
                              {i + 1}
                            </span>
                            {r.name}
                          </span>
                          <span className="shrink-0 font-bold text-slate-900">{formatVND(r.totalPaid)}</span>
                        </div>
                        <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${
                              i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-cerulean-blue-500' : i === 2 ? 'bg-violet-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${maxTopPaid > 0 ? (r.totalPaid / maxTopPaid) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-48 flex-col items-center justify-center text-xs text-slate-400">
                    <Settings2 className="h-8 w-8 text-slate-300" />
                    <p className="mt-2">Chưa có giao dịch thanh toán</p>
                  </div>
                )}
              </div>

              {/* Chỉ số vận hành */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Activity className="h-4 w-4" />
                  </span>
                  <h2 className="text-base font-bold text-slate-900">Chỉ số vận hành</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Giao dịch tháng
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {data?.kpis?.monthTransactions ?? 0}
                    </p>
                    <p className="text-[11px] text-slate-400">Gói đã thanh toán</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Chủ mới (30 ngày)
                    </p>
                    <p className="mt-1 text-lg font-bold text-emerald-600">
                      +{data?.kpis?.newOwners30d ?? 0}
                    </p>
                    <p className="text-[11px] text-slate-400">Đăng ký nền tảng</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Nhà hàng mới
                    </p>
                    <p className="mt-1 text-lg font-bold text-cerulean-blue-600">
                      +{data?.kpis?.newRestaurants30d ?? 0}
                    </p>
                    <p className="text-[11px] text-slate-400">30 ngày qua</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Doanh thu / ngày
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {formatVND(Math.round(insights.avgDailyRevenue))}
                    </p>
                    <p className="text-[11px] text-slate-400">Trung bình tháng</p>
                  </div>
                </div>
              </div>

              {/* Sự kiện nổi bật */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                      <ScrollText className="h-4 w-4" />
                    </span>
                    <h2 className="text-base font-bold text-slate-900">Sự kiện nổi bật</h2>
                  </div>
                  <Link
                    to="/super-admin/audit"
                    className="text-xs font-semibold text-cerulean-blue-600 hover:underline"
                  >
                    Audit Logs →
                  </Link>
                </div>
                {data?.recentEvents?.length ? (
                  <div className="space-y-4">
                    {data.recentEvents.map((ev) => (
                      <div key={ev._id} className="flex gap-3">
                        <span
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${eventMeta[ev.type]?.className ?? 'bg-slate-100 text-slate-500'}`}
                        >
                          {eventMeta[ev.type]?.icon ?? <Activity className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800">{ev.summary}</p>
                          <p className="text-[11px] text-slate-400">{getTimeAgo(ev.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-48 flex-col items-center justify-center text-xs text-slate-400">
                    <ScrollText className="h-8 w-8 text-slate-300" />
                    <p className="mt-2">Chưa có sự kiện</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
