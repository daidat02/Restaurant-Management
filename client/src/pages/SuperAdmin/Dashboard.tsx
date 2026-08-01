import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Users, Store, Timer, Wallet, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { getAdminDashboard } from '@/api/superadmin.api';
import type { IAdminDashboard } from '@/types/superadmin.type';
import { formatVND, getTimeAgo } from '@/utils/helpers';
import { DataTable, type ColumnDef } from '@/components/TableData';
import { SubscriptionBadge } from './components/SubscriptionBadge';

type StatCardProps = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  sub?: string;
};

function StatCard({ label, value, icon, sub }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cerulean-blue-50 text-cerulean-blue-600">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 truncate text-xl font-bold text-slate-900">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/** Lấy ngày hết hạn thực tế (trial hoặc paidUntil). */
function expiryDate(item: { trialEndsAt?: string; paidUntil?: string; subscription?: string }) {
  return item.subscription === 'trial' ? item.trialEndsAt : item.paidUntil;
}

export default function SuperAdminDashboard() {
  const [data, setData] = useState<IAdminDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAdminDashboard()
      .then((res) => setData(res ?? null))
      .catch((err: any) => {
        toast.error(err.message || 'Đã xảy ra lỗi khi tải dữ liệu tổng quan', {
          position: 'top-right',
        });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const chartData = useMemo(
    () => (data?.revenueByMonth ?? []).map((m) => ({ ...m, total: Number(m.total) || 0 })),
    [data],
  );

  const ownerColumns: ColumnDef<any>[] = [
    {
      header: 'Người thuê',
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-semibold text-xs text-slate-900">{item.name}</span>
          <span className="text-xs text-slate-500 mt-0.5">{item.email}</span>
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
        <span className="text-xs font-medium text-slate-600">{item.restaurantCount ?? 0}</span>
      ),
    },
    {
      header: 'Tổng đã trả',
      className: 'text-right',
      render: (item) => (
        <span className="text-xs font-bold text-emerald-600">
          {formatVND(item.totalPaid ?? 0)}
        </span>
      ),
    },
    {
      header: 'Đăng ký',
      render: (item) => (
        <span className="text-xs text-slate-500">{getTimeAgo(item.createdAt) || '---'}</span>
      ),
    },
  ];

  const expiringColumns: ColumnDef<any>[] = [
    {
      header: 'Nhà hàng',
      render: (item) => <span className="font-semibold text-xs text-slate-900">{item.name}</span>,
    },
    {
      header: 'Trạng thái',
      render: (item) => <SubscriptionBadge state={item.subscription} />,
    },
    {
      header: 'Chủ sở hữu',
      render: (item) => {
        const owner = item.ownerId;
        if (owner && typeof owner === 'object' && 'name' in owner) {
          return <span className="text-xs font-medium text-slate-600">{owner.name as string}</span>;
        }
        return <span className="text-xs text-slate-400 italic">---</span>;
      },
    },
    {
      header: 'Hết hạn',
      render: (item) => {
        const exp = expiryDate(item);
        return (
          <span className="text-xs font-medium text-amber-600">
            {exp ? new Date(exp).toLocaleDateString('vi-VN') : '---'}
          </span>
        );
      },
    },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-950">
              Tổng Quan Hệ Thống
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Tình hình kinh doanh nền tảng theo gói thuê: chủ, nhà hàng và doanh thu subscription
            </p>
          </div>
        </div>

        {isLoading && !data ? (
          <div className="flex h-64 items-center justify-center text-sm text-slate-500">
            Đang tải dữ liệu...
          </div>
        ) : (
          <div className="space-y-6">
            {/* 4 KPI nền tảng */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Chủ đang dùng thử"
                value={data?.kpis?.trialOwners ?? 0}
                icon={<Timer className="h-5 w-5 text-sky-600" />}
                sub="Chủ chưa trả phí"
              />
              <StatCard
                label="Chủ đã thanh toán"
                value={data?.kpis?.activeOwners ?? 0}
                icon={<Users className="h-5 w-5 text-emerald-600" />}
                sub="Chủ có gói active"
              />
              <StatCard
                label="Nhà hàng hoạt động"
                value={data?.kpis?.activeRestaurants ?? 0}
                icon={<Store className="h-5 w-5" />}
                sub="Chi nhánh đang vận hành"
              />
              <StatCard
                label="Doanh thu tháng này"
                value={formatVND(data?.kpis?.monthRevenue ?? 0)}
                icon={<Wallet className="h-5 w-5 text-violet-600" />}
                sub="Từ gói thuê"
              />
            </div>

            {/* Biểu đồ doanh thu 6 tháng */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-cerulean-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Doanh thu 6 tháng gần nhất</h3>
                  <p className="text-xs text-slate-400">Theo giao dịch subscription đã thanh toán</p>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      className="text-xs font-medium text-slate-500"
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                      formatter={(value: any) => [formatVND(Number(value) || 0), 'Doanh thu']}
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Người thuê gần đây */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                <h3 className="font-bold text-slate-900 text-base mb-1">Người thuê gần đây</h3>
                <p className="text-xs text-slate-400 mb-4">Top chủ mới đăng ký nền tảng</p>
                <DataTable
                  data={data?.recentOwners ?? []}
                  columns={ownerColumns}
                  minWidth="600px"
                  emptyMessage="Chưa có chủ nào đăng ký"
                />
              </div>

              {/* Nhà hàng sắp hết hạn */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                <h3 className="font-bold text-slate-900 text-base mb-1">Nhà hàng sắp hết hạn</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Hết hạn trial / thanh toán trong 7 ngày tới
                </p>
                <DataTable
                  data={data?.expiringRestaurants ?? []}
                  columns={expiringColumns}
                  minWidth="600px"
                  emptyMessage="Không có nhà hàng nào sắp hết hạn"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
