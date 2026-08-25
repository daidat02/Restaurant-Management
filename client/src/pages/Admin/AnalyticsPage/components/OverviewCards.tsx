import { formatVND } from '@/utils/helpers';
import { Clock, DollarSign, Layers, Users } from 'lucide-react';

/** Sparkline SVG nhẹ (giống super-admin dashboard). */
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

interface KpiCardProps {
  title: string; // Tiêu đề của từng card
  stat: number; // Số liệu hiển thị
  growth: number; // Tỷ lệ phần trăm tăng trưởng
  mainIcon: React.ReactNode;
  iconColor: string; // Màu chữ/icon (ví dụ: text-indigo-600)
  bgIconColor: string; // Màu nền bọc icon (ví dụ: bg-indigo-50)
  isCurrency?: boolean; // Đánh dấu nếu số liệu là tiền tệ (để formatVND)
  /** Chuỗi dữ liệu nhỏ vẽ sparkline (giống super-admin). */
  spark?: number[] | null;
}

function KpiCard({
  title,
  stat,
  growth,
  mainIcon,
  iconColor,
  bgIconColor,
  isCurrency = false,
  spark = null,
}: KpiCardProps) {
  // Tự động chuyển màu chữ thông báo tăng trưởng dựa trên chỉ số âm hay dương
  const isPositive = (growth || 0) >= 0;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </span>
          <span className="mt-2 block truncate text-2xl font-bold tracking-tight text-slate-900">
            {isCurrency ? formatVND(stat || 0) : `${stat || 0}`}
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-[11px]">
            <span
              className={`inline-flex items-center rounded-full px-1.5 py-0.5 font-semibold ${
                isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              {isPositive ? '▲' : '▼'} {Math.abs(growth || 0).toFixed(1)}%
            </span>
            <span className="text-slate-400">so với kỳ trước</span>
          </span>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bgIconColor} ${iconColor}`}
        >
          {mainIcon}
        </div>
      </div>
      {spark && spark.length > 0 && <div className="mt-3">{<Sparkline data={spark} stroke="#1a71f6" />}</div>}
    </div>
  );
}

interface IOverviewCardsProps {
  overviewStats: any;
  /** Dữ liệu doanh thu theo giờ — vẽ sparkline cho card doanh thu. */
  sparkData?: number[];
}

export function OverviewCards({ overviewStats, sparkData = [] }: IOverviewCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* Khối 1: Doanh thu tổng (Màu Violet) */}
      <KpiCard
        title="Doanh Thu Tổng Kỳ Này"
        stat={overviewStats?.totalRevenue}
        growth={overviewStats?.growth?.revenue}
        isCurrency={true}
        mainIcon={<DollarSign size={22} />}
        iconColor="text-violet-600"
        bgIconColor="bg-violet-50"
        spark={sparkData}
      />

      {/* Khối 2: Tổng số đơn hàng (Màu Emerald/Xanh lá) */}
      <KpiCard
        title="Tổng Số Đơn Hàng"
        stat={overviewStats?.totalOrders}
        growth={overviewStats?.growth?.orders}
        mainIcon={<Layers size={22} />}
        iconColor="text-emerald-600"
        bgIconColor="bg-emerald-50"
      />

      {/* Khối 3: Giá trị đơn trung bình (Màu Amber/Vàng cam) */}
      <KpiCard
        title="Trung Bình / Hóa Đơn"
        stat={overviewStats?.averagePerOrder}
        growth={overviewStats?.growth?.averagePerOrder}
        isCurrency={true}
        mainIcon={<Clock size={22} />}
        iconColor="text-amber-600"
        bgIconColor="bg-amber-50"
      />

      {/* Khối 4: Tổng lượt đặt bàn (Màu Sky/Xanh dương) */}
      <KpiCard
        title="Tổng Lượt Đặt Bàn"
        stat={overviewStats?.totalReservations}
        growth={overviewStats?.growth?.totalReservations}
        mainIcon={<Users size={22} />}
        iconColor="text-sky-600"
        bgIconColor="bg-sky-50"
      />
    </div>
  );
}
