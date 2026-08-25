import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Radio, TrendingUp } from 'lucide-react';

import { formatVND } from '@/utils/helpers';
import type { IChannelTrendDay, IOrderChannelV2 } from '@/types/analytic.type';

interface ChannelSectionProps {
  channels: IOrderChannelV2[];
  trend: IChannelTrendDay[];
  isLoading?: boolean;
}

/** Màu cố định theo key kênh — đồng bộ giữa donut và stacked area. */
const CHANNEL_COLORS: Record<string, string> = {
  'qr-dine-in': '#6366f1',
  'staff-dine-in': '#10b981',
  delivery: '#f59e0b',
  'to-go': '#a855f7',
};

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  fontSize: 12,
  boxShadow: '0 8px 30px rgba(30,64,175,0.08)',
} as const;

/**
 * Doanh thu theo kênh (Advanced): donut tỷ trọng doanh thu + stacked area
 * xu hướng theo ngày. Thay cho thanh % số đơn cũ trên trang báo cáo.
 */
export function ChannelSection({ channels, trend, isLoading = false }: ChannelSectionProps) {
  const trendData = useMemo(
    () =>
      trend.map((day) => ({
        date: day.date.slice(5), // MM-DD cho gọn trục
        ...Object.fromEntries(day.channels.map((c) => [c.channel, c.revenue])),
      })),
    [trend],
  );

  const channelKeys = Object.keys(CHANNEL_COLORS);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      {/* DONUT: tỷ trọng doanh thu theo kênh */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Radio size={16} />
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-900">Tiền đến từ kênh nào</h3>
            <p className="text-xs text-slate-400">Tỷ trọng doanh thu theo kênh đặt đơn</p>
          </div>
        </div>

        <div className="min-h-[260px] flex-1">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Đang tải...
            </div>
          ) : channels.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Chưa có dữ liệu trong kỳ này
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={channels}
                  dataKey="revenue"
                  nameKey="channel"
                  innerRadius="55%"
                  outerRadius="82%"
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {channels.map((c, i) => (
                    <Cell key={i} fill={CHANNEL_COLORS[i % channelKeys.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: any, _name: any, item: any) => [
                    formatVND(Number(value)),
                    item?.payload?.channel ?? '',
                  ]}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: any, entry: any) => (
                    <span className="text-xs text-slate-600">
                      {entry?.payload?.payload?.channel ?? value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* STACKED AREA: xu hướng doanh thu theo ngày × kênh */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm xl:col-span-2 flex flex-col">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <TrendingUp size={16} />
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-900">Xu hướng doanh thu theo kênh</h3>
            <p className="text-xs text-slate-400">
              Diễn biến từng ngày trong kỳ — nhận diện kênh đang tăng/giảm nhiệt
            </p>
          </div>
        </div>

        <div className="mt-auto h-72 w-full">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Đang tải...
            </div>
          ) : trendData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Chưa có dữ liệu trong kỳ này
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  {channelKeys.map((key) => (
                    <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHANNEL_COLORS[key]} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={CHANNEL_COLORS[key]} stopOpacity={0.03} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  interval="preserveStartEnd"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(v: number) =>
                    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}tr` : `${Math.round(v / 1000)}k`
                  }
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatVND(Number(v))} />
                <Legend iconType="circle" iconSize={8} />
                {channelKeys.map((key, i) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stackId="1"
                    stroke={CHANNEL_COLORS[key]}
                    strokeWidth={2}
                    fill={`url(#fill-${key})`}
                    isAnimationActive={i === channelKeys.length - 1}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
