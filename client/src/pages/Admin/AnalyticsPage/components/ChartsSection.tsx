import React from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Store, TrendingUp } from 'lucide-react';
import { formatVND } from '@/utils/helpers';
import { DataTable, type ColumnDef } from '@/components/TableData';

/** Rút gọn số lượng hiển thị trên trục Y (giống super-admin dashboard). */
function formatCompact(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}tr`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(v);
}

interface IChartsSectionProps {
  userRole?: string; // 🌟 Thêm prop để nhận biết tài khoản đang đăng nhập là ai
  revenueBranch?: any[]; // 🌟 Thêm mảng dữ liệu doanh thu chi nhánh dành cho Admin
  isLoadingBranch?: boolean; // 🌟 Trạng thái tải dữ liệu bảng chi nhánh
  revenueHourly: {
    hour: string;
    amount: number;
    orderCount: number;
  }[];
}

export function ChartsSection({
  userRole,
  revenueBranch = [],
  isLoadingBranch = false,
  revenueHourly,
}: IChartsSectionProps) {
  // Doanh thu tổng theo giờ — dùng cho badge (đồng bộ super-admin dashboard)
  const hourlyTotal = revenueHourly.reduce((sum, r) => sum + (r.amount ?? 0), 0);

  // Định nghĩa cấu trúc cột cho Bảng xếp hạng chi nhánh (Khi là Admin)
  const branchColumns: ColumnDef<any>[] = [
    {
      header: 'Tên cơ sở chi nhánh',
      render: (item) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cerulean-blue-50 text-cerulean-blue-600">
            <Store size={16} />
          </span>
          <span className="font-semibold text-xs text-slate-900">{item.branchName}</span>
        </div>
      ),
    },
    {
      header: 'Tổng doanh thu',
      className: 'text-right',
      render: (item) => (
        <span className="text-xs font-bold text-cerulean-blue-600">
          {formatVND(item.revenue ?? 0)}
        </span>
      ),
    },
    {
      header: 'Số đơn',
      className: 'text-center',
      render: (item) => (
        <span className="text-xs font-medium text-slate-600">
          {(item.orderCount ?? 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'AOV (Đơn TB)',
      className: 'text-right',
      render: (item) => (
        <span className="text-xs font-medium text-slate-500">
          {formatVND(item.averageBill ?? 0)}
        </span>
      ),
    },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between min-h-[380px]">
      {userRole === 'admin' ? (
        // =========================================================
        // GIAO DIỆN DÀNH CHO ADMIN: BẢNG XẾP HẠNG DOANH THU CHI NHÁNH
        // =========================================================
        <div className="flex flex-col h-full w-full gap-3">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cerulean-blue-50 text-cerulean-blue-600">
              <Store className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-0.5">
                Hiệu suất chuỗi chi nhánh
              </h3>
              <p className="text-xs text-slate-400">
                Xếp hạng doanh thu và sản lượng đơn hàng thực tế giữa các cơ sở nhà hàng
              </p>
            </div>
          </div>
          {/* Nhúng DataTable gọn gàng vào trong khung layout */}
          <div className="flex-1 min-h-0">
            <DataTable
              data={revenueBranch}
              columns={branchColumns}
              isLoading={isLoadingBranch}
              minWidth="550px"
              emptyMessage="Không có dữ liệu kinh doanh của chi nhánh nào trong kỳ này!"
            />
          </div>
        </div>
      ) : (
        // =========================================================
        // GIAO DIỆN DÀNH CHO MANAGER/STAFF: BIỂU ĐỒ DOANH THU THEO GIỜ
        // =========================================================
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <TrendingUp className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-0.5">
                  Dòng doanh thu theo khung giờ
                </h3>
                <p className="text-xs text-slate-400">
                  Phân tích để tối ưu nhân sự cho các ca làm việc tại quán
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">
              ▲ {hourlyTotal > 0 ? 'Doanh thu' : 'Cập nhật'} theo giờ
            </span>
          </div>

          <div className="h-64 w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueHourly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3090ff" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#3090ff" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="hour"
                  tickLine={false}
                  tickMargin={12}
                  axisLine={false}
                  interval="preserveStartEnd"
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
                  dataKey="amount"
                  stroke="#1a71f6"
                  strokeWidth={2.5}
                  fill="url(#revenueFill)"
                  dot={{ r: 3.5, fill: '#1a71f6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
