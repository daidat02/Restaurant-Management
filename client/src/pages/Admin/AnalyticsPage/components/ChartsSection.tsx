import React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import { Store } from 'lucide-react'; // Thêm icon Store cho bảng Admin
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { formatVND } from '@/utils/helpers';
import { DataTable, type ColumnDef } from '@/components/TableData'; // Import DataTable dùng chung của hệ thống

interface IChartsSectionProps {
  userRole?: string; // 🌟 Thêm prop để nhận biết tài khoản đang đăng nhập là ai
  revenueBranch?: any[]; // 🌟 Thêm mảng dữ liệu doanh thu chi nhánh dành cho Admin
  isLoadingBranch?: boolean; // 🌟 Trạng thái tải dữ liệu bảng chi nhánh
  revenueHourly: {
    hour: string;
    amount: number;
    orderCount: number;
  }[];
  orderChannels: {
    channel: string;
    count: number;
    percentage: number;
  }[];
}

export function ChartsSection({
  userRole,
  revenueBranch = [],
  isLoadingBranch = false,
  revenueHourly,
  orderChannels,
}: IChartsSectionProps) {
  // 1. Cấu hình màu sắc hiển thị đồng bộ cho Doanh thu và Số đơn hàng (Khi vẽ Chart)
  const chartConfig = {
    amount: {
      label: 'Doanh thu',
      color: 'rgb(99, 102, 241)',
    },
    orderCount: {
      label: 'Số đơn hàng',
      color: 'rgb(16, 185, 129)',
    },
  } satisfies ChartConfig;

  // 2. Định nghĩa cấu trúc cột cho Bảng xếp hạng chi nhánh (Khi là Admin)
  const branchColumns: ColumnDef<any>[] = [
    {
      header: 'Tên cơ sở chi nhánh',
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-slate-50 border border-slate-100 rounded-lg">
            <Store size={12} className="text-slate-500" />
          </div>
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 🌟 KHU VỰC 1: BIẾN ĐỔI THÔNG MINH GIỮA BIỂU ĐỒ (MANAGER) VÀ BẢNG XẾP HẠNG (ADMIN) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm lg:col-span-2 flex flex-col justify-between min-h-[380px]">
        {userRole === 'admin' ? (
          // =========================================================
          // GIAO DIỆN DÀNH CHO ADMIN: BẢNG XẾP HẠNG DOANH THU CHI NHÁNH
          // =========================================================
          <div className="flex flex-col h-full w-full gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base mb-1">Hiệu suất chuỗi chi nhánh</h3>
              <p className="text-xs text-slate-400 mb-2">
                Xếp hạng doanh thu và sản lượng đơn hàng thực tế giữa các cơ sở nhà hàng
              </p>
            </div>
            {/* Nhúng DataTable gọn gàng vào trong khung layout */}
            <div className="flex-1 min-h-0">
              <DataTable
                data={revenueBranch}
                columns={branchColumns}
                isLoading={isLoadingBranch}
                minWidth="550px" // Thu nhỏ minWidth vừa khít với layout cột 2/3
                emptyMessage="Không có dữ liệu kinh doanh của chi nhánh nào trong kỳ này!"
              />
            </div>
          </div>
        ) : (
          // =========================================================
          // GIAO DIỆN DÀNH CHO MANAGER/STAFF: BIỂU ĐỒ DOANH THU THEO GIỜ
          // =========================================================
          <>
            <div>
              <h3 className="font-bold text-slate-900 text-base mb-1">
                Dòng doanh thu theo khung giờ
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Phân tích để tối ưu nhân sự cho các ca làm việc tại quán
              </p>
            </div>

            <div className="h-64 w-full mt-auto">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <BarChart accessibilityLayer data={revenueHourly}>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="hour"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    className="text-xs font-medium text-slate-500"
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => {
                          if (name === 'amount') return formatVND(Number(value));
                          if (name === 'orderCount') return `${value} đơn`;
                          return value;
                        }}
                      />
                    }
                  />
                  <Bar dataKey="amount" fill="var(--color-amount)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="orderCount" fill="var(--color-orderCount)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          </>
        )}
      </div>

      {/* KHU VỰC 2: TỶ LỆ NGUỒN ĐẶT MÓN (DÙNG CHUNG CHO CẢ ADMIN LẪN MANAGER) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-slate-900 text-base mb-1">Kênh đặt đơn chủ lực</h3>
          <p className="text-xs text-slate-400 mb-6">Thống kê thói quen gọi món của thực khách</p>

          <div className="space-y-4">
            {orderChannels.map((channel, idx) => {
              const colors = ['bg-indigo-600', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500'];
              const colorClass = colors[idx % colors.length];

              return (
                <div key={idx}>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                    <span>{channel.channel}</span>
                    <span className="text-slate-900">
                      {channel.percentage}% ({channel.count} đơn)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colorClass}`}
                      style={{ width: `${channel.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-[11px] text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-4">
          💡 **Gợi ý:** Dữ liệu kênh đặt hàng cập nhật liên tục dựa trên thói quen thanh toán và
          quét mã QR tại bàn của khách hàng thực tế.
        </div>
      </div>
    </div>
  );
}
