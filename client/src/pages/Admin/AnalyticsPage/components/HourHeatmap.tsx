import { useMemo, useState } from 'react';
import { CalendarClock, Loader2 } from 'lucide-react';
import { formatVND } from '@/utils/helpers';
import type { IHourMatrixCell } from '@/types/analytic.type';
import { cn } from '@/lib/utils';

type Metric = 'revenue' | 'orders';

interface HourHeatmapProps {
  cells: IHourMatrixCell[];
  isLoading?: boolean;
}

// Thứ tự hàng hiển thị: Thứ 2 → Chủ nhật (MongoDB $dayOfWeek: 1=CN, 2=T2 … 7=T7)
const DOW_ORDER = [2, 3, 4, 5, 6, 7, 1];
const DOW_LABELS: Record<number, string> = {
  1: 'CN',
  2: 'T2',
  3: 'T3',
  4: 'T4',
  5: 'T5',
  6: 'T6',
  7: 'T7',
};

/**
 * Heatmap ngày-trong-tuần × giờ (Advanced).
 * Server trả đủ ô thô 0–23h — component tự cắt cột rỗng ở hai đầu theo dữ liệu
 * → quán mở khuya/sáng sớm vẫn hiển thị đúng khung hoạt động.
 */
export function HourHeatmap({ cells, isLoading = false }: HourHeatmapProps) {
  const [metric, setMetric] = useState<Metric>('revenue');

  const { hourRange, matrix, maxValue } = useMemo(() => {
    const lookup = new Map(cells.map((c) => [`${c.dow}-${c.hour}`, c]));
    const hoursWithData = cells.map((c) => c.hour);

    // Cắt rỗng hai đầu: giữ tối thiểu khung mặc định nếu chưa có dữ liệu nào
    let minH = hoursWithData.length ? Math.min(...hoursWithData) : 8;
    let maxH = hoursWithData.length ? Math.max(...hoursWithData) : 22;
    minH = Math.max(0, minH - 1);
    maxH = Math.min(23, maxH + 1);
    if (maxH - minH < 6) maxH = Math.min(23, minH + 6); // đảm bảo bảng không quá hẹp

    const grid = new Map<string, IHourMatrixCell>();
    let max = 0;
    for (const dow of DOW_ORDER) {
      for (let h = minH; h <= maxH; h += 1) {
        const cell = lookup.get(`${dow}-${h}`);
        if (!cell) continue;
        grid.set(`${dow}-${h}`, cell);
        max = Math.max(max, metric === 'revenue' ? cell.revenue : cell.orderCount);
      }
    }
    return { hourRange: { min: minH, max: maxH }, matrix: grid, maxValue: max || 1 };
  }, [cells, metric]);

  const cellValue = (cell: IHourMatrixCell | undefined) =>
    !cell ? 0 : metric === 'revenue' ? cell.revenue : cell.orderCount;

  /** Thang màu cerulean-blue: giá trị càng cao nền càng đậm. */
  const cellStyle = (value: number) => {
    if (value <= 0) return undefined;
    const t = value / maxValue;
    // alpha 0.08 → 0.85
    const alpha = 0.08 + Math.pow(t, 0.7) * 0.77;
    return { backgroundColor: `rgba(26, 113, 246, ${alpha.toFixed(3)})` };
  };

  const hours = Array.from(
    { length: hourRange.max - hourRange.min + 1 },
    (_, i) => hourRange.min + i,
  );

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cerulean-blue-50 text-cerulean-blue-600">
            <CalendarClock size={16} />
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-900">Giờ cao điểm trong tuần</h3>
            <p className="text-xs text-slate-400">
              Ma trận thứ × giờ — căn lịch ca nhân viên theo giờ đông khách nhất
            </p>
          </div>
        </div>

        {/* Toggle thước đo */}
        <div className="inline-flex items-center rounded-full bg-slate-100 p-1">
          {(
            [
              { key: 'revenue', label: 'Doanh thu' },
              { key: 'orders', label: 'Số đơn' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setMetric(opt.key)}
              className={cn(
                'rounded-full px-4 py-1.5 text-xs font-semibold transition-all',
                metric === opt.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-sm text-slate-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-cerulean-blue-600" /> Đang tải ma
          trận giờ...
        </div>
      ) : cells.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-slate-400">
          Chưa có đơn hàng nào trong kỳ này
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Hàng header giờ */}
            <div
              className="mb-1 grid gap-1"
              style={{ gridTemplateColumns: `48px repeat(${hours.length}, minmax(0, 1fr))` }}
            >
              <div />
              {hours.map((h) => (
                <div key={h} className="text-center text-[10px] font-semibold text-slate-400">
                  {h}
                </div>
              ))}
            </div>

            {/* Các hàng thứ */}
            {DOW_ORDER.map((dow) => (
              <div
                key={dow}
                className="grid gap-1 pb-1"
                style={{ gridTemplateColumns: `48px repeat(${hours.length}, minmax(0, 1fr))` }}
              >
                <div className="flex items-center text-[11px] font-bold text-slate-500">
                  {DOW_LABELS[dow]}
                </div>
                {hours.map((h) => {
                  const cell = matrix.get(`${dow}-${h}`);
                  const value = cellValue(cell);
                  return (
                    <div
                      key={h}
                      title={
                        cell
                          ? `${DOW_LABELS[dow]} ${h}:00 — ${
                              metric === 'revenue' ? formatVND(cell.revenue) : `${cell.orderCount} đơn`
                            }`
                          : undefined
                      }
                      style={cellStyle(value)}
                      className={cn(
                        'flex h-8 cursor-default items-center justify-center rounded-md text-[10px] font-semibold transition-transform hover:scale-105',
                        value > 0 && value / maxValue >= 0.55
                          ? 'text-white'
                          : 'text-slate-600',
                        !cell && 'bg-slate-50/70',
                      )}
                    >
                      {value > 0
                        ? metric === 'revenue'
                          ? value >= 1000
                            ? `${Math.round(value / 1000)}k`
                            : value
                          : value
                        : ''}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Chú giải thang màu */}
            <div className="mt-3 flex items-center justify-end gap-2 text-[10px] font-medium text-slate-400">
              Thấp
              {[0.12, 0.32, 0.52, 0.72, 0.92].map((a) => (
                <span
                  key={a}
                  className="h-3 w-6 rounded-sm"
                  style={{ backgroundColor: `rgba(26, 113, 246, ${a})` }}
                />
              ))}
              Cao
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
