export interface OverviewStat {
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  type: 'currency' | 'number' | 'percentage';
}

export interface RevenueBranch {
  branchName: string;
  revenue: number;
  orderCount: number;
  averageBill: number;
}

export interface TopDish {
  name: string;
  category: string;
  orderCount: number;
  revenue: number;
  image?: string;
}

// ---------------------------------------------------------
// MOCK DATA THỰC TẾ
// ---------------------------------------------------------

export const mockOverviewStats: OverviewStat[] = [
  {
    title: 'Tổng Doanh Thu Chuỗi',
    value: '1,420,500,000đ',
    change: '+12.5%',
    isPositive: true,
    type: 'currency',
  },
  {
    title: 'Tổng Đơn Hàng Thành Công',
    value: 8432,
    change: '+8.2%',
    isPositive: true,
    type: 'number',
  },
  {
    title: 'Giá Trị Đơn Trung Bình',
    value: '168,000đ',
    change: '-2.1%',
    isPositive: false,
    type: 'currency',
  },
  {
    title: 'Tỷ Lệ Hủy Đơn / Hoàn Trả',
    value: '1.4%',
    change: '-0.5%',
    isPositive: true,
    type: 'percentage',
  }, // Giảm hủy là positive
];

export const mockBranchRevenue: RevenueBranch[] = [
  {
    branchName: 'Cơ sở Quận 1 - Nguyễn Huệ',
    revenue: 580000000,
    orderCount: 3200,
    averageBill: 181250,
  },
  {
    branchName: 'Cơ sở Quận 3 - Cao Thắng',
    revenue: 420000000,
    orderCount: 2650,
    averageBill: 158490,
  },
  {
    branchName: 'Cơ sở Tân Bình - Cộng Hòa',
    revenue: 310000000,
    orderCount: 1980,
    averageBill: 156560,
  },
  {
    branchName: 'Cơ sở Quận 7 - Phú Mỹ Hưng',
    revenue: 110500000,
    orderCount: 602,
    averageBill: 183550,
  },
];

export const mockTopDishes: TopDish[] = [
  { name: 'Lẩu Nấm Sườn Sụn Gia Truyền', category: 'Lẩu', orderCount: 1420, revenue: 497000000 },
  {
    name: 'Bò Mỹ Thượng Hạng Nhúng Ớt',
    category: 'Món Nhúng',
    orderCount: 1150,
    revenue: 287500000,
  },
  { name: 'Combo Hải Sản Hoàng Gia', category: 'Combo', orderCount: 840, revenue: 462000000 },
  { name: 'Nước Cốt Sâm Fansipan', category: 'Đồ Uống', orderCount: 2100, revenue: 63000000 },
  { name: 'Đậu Hũ Phô Mai Chiên Giòn', category: 'Ăn Kèm', orderCount: 1240, revenue: 55800000 },
];

export const mockChannelStats = [
  { name: 'Quét QR Tại Bàn (Dine-in)', count: 4890, percentage: '58%' },
  { name: 'Nhân Viên Lên Đơn (Staff)', count: 2120, percentage: '25%' },
  { name: 'Khách Mang Về (To-go)', count: 982, percentage: '12%' },
  { name: 'Giao Hàng DApp (Delivery)', count: 440, percentage: '5%' },
];

import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Utensils,
  Calendar,
  Download,
  Store,
  BarChart3,
  PieChart,
} from 'lucide-react';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('month');
  const [selectedBranch, setSelectedBranch] = useState('all');

  return (
    <div className="h-full overflow-y-auto bg-slate-50/50">
      <div className="min-h-screen p-4 md:p-8 space-y-6">
        {/* TOP HEADER & BỘ LỌC THỜI GIAN CHUẨN ĐỒNG BỘ */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/60 pb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-950">
              Báo Cáo Kinh Doanh
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Phân tích doanh thu, hiệu suất chi nhánh và hành vi gọi món toàn hệ thống chuỗi.
            </p>
          </div>

          {/* THANH ĐIỀU KHIỂN BỘ LỌC ĐA NĂNG */}
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

        {/* CỤM 1: OVERVIEW CARD (THÔNG SỐ TỔNG QUAN CHIẾN LƯỢC) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {mockOverviewStats.map((stat, idx) => {
            const Icon = [DollarSign, ShoppingBag, Users, Utensils][idx];
            return (
              <div
                key={stat.title}
                className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
                    {stat.title}
                  </span>
                  <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl">
                    <Icon className="h-4 w-4 text-slate-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                    {stat.value}
                  </span>
                  <span
                    className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-lg ${
                      stat.isPositive
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : 'bg-rose-50 text-rose-600 border border-rose-100'
                    }`}
                  >
                    {stat.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {stat.change}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* CỤM 2: BIỂU ĐỒ HOẶC BẢNG HIỆU SUẤT CHI NHÁNH & KÊNH BÁN HÀNG */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* KHU VỰC: CHI TIẾT DOANH THU TỪNG CHI NHÁNH */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Store className="text-slate-500" size={18} />
                <h3 className="font-bold text-sm text-slate-900">
                  Bảng Xếp Hạng Doanh Thu Chi Nhánh
                </h3>
              </div>
              <span className="text-xs font-medium text-slate-400">Đơn vị: VNĐ</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider h-10">
                    <th className="pb-2">Tên cơ sở</th>
                    <th className="pb-2 text-right">Tổng doanh thu</th>
                    <th className="pb-2 text-center">Số lượng đơn</th>
                    <th className="pb-2 text-right">AOV (Đơn vị)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                  {mockBranchRevenue.map((branch) => (
                    <tr
                      key={branch.branchName}
                      className="hover:bg-slate-50/50 h-12 transition-colors"
                    >
                      <td className="font-semibold text-slate-900 max-w-[200px] truncate">
                        {branch.branchName}
                      </td>
                      <td className="text-right text-cerulean-blue-600 font-bold">
                        {branch.revenue.toLocaleString()}đ
                      </td>
                      <td className="text-center text-slate-600">
                        {branch.orderCount.toLocaleString()}
                      </td>
                      <td className="text-right text-slate-600">
                        {branch.averageBill.toLocaleString()}đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* KHU VỰC: THỐNG KÊ KÊNH ĐẶT MÓN (CHANNEL RATIO) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="text-slate-500" size={18} />
              <h3 className="font-bold text-sm text-slate-900">Tỷ Trọng Kênh Đặt Món</h3>
            </div>

            <div className="space-y-4 my-auto">
              {mockChannelStats.map((channel) => (
                <div key={channel.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-600">{channel.name}</span>
                    <span className="text-slate-900 font-bold">
                      {channel.percentage} ({channel.count} đơn)
                    </span>
                  </div>
                  {/* Thanh tiến trình giả lập biểu đồ tỉ trọng */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-cerulean-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: channel.percentage }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CỤM 3: TOP MÓN ĂN BÁN CHẠY NHẤT TOÀN CHUỖI */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <BarChart3 className="text-slate-500" size={18} />
              <h3 className="font-bold text-sm text-slate-900">Top 5 Món Ăn Doanh Thu Cao Nhất</h3>
            </div>
            <span className="text-xs px-2.5 py-1 bg-slate-100 border border-slate-200/30 text-slate-600 rounded-xl font-semibold">
              Theo Sản Lượng Bán
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider h-10">
                  <th>Tên món ăn / Sản phẩm</th>
                  <th>Danh mục</th>
                  <th className="text-center">Sản lượng đã bán</th>
                  <th className="text-right">Tổng doanh thu mang về</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                {mockTopDishes.map((dish) => (
                  <tr key={dish.name} className="hover:bg-slate-50/50 h-14 transition-colors">
                    <td>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-[13px]">{dish.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/50">
                        {dish.category}
                      </span>
                    </td>
                    <td className="text-center font-semibold text-slate-900">
                      {dish.orderCount.toLocaleString()}{' '}
                      <span className="text-slate-400 text-[10px] font-normal">phần</span>
                    </td>
                    <td className="text-right text-emerald-600 font-bold text-[13px]">
                      {dish.revenue.toLocaleString()}đ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
