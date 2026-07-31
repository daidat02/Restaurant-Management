import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Store,
  Users,
  Wallet,
  ClipboardList,
  CalendarDays,
  Percent,
  Banknote,
  Lock,
} from 'lucide-react';
import { getSystemOverview } from '@/api/analytic.api';
import type { ISystemOverview } from '@/types/analytic.type';
import { formatVND } from '@/utils/helpers';

type StatCardProps = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  className?: string;
};

function StatCard({ label, value, icon, className = '' }: StatCardProps) {
  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ${className}`}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cerulean-blue-50 text-cerulean-blue-600">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 truncate text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const [data, setData] = useState<ISystemOverview | null>(null);

  useEffect(() => {
    getSystemOverview()
      .then((res) => setData(res ?? null))
      .catch((err: any) => {
        toast.error(err.message || 'Đã xảy ra lỗi khi tải dữ liệu tổng quan', {
          position: 'top-right',
        });
      });
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-950">
              Tổng Quan Hệ Thống
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Toàn bộ hoạt động kinh doanh của nền tảng NhamNhi trên mọi chi nhánh
            </p>
          </div>
        </div>

        {!data ? (
          <div className="flex h-64 items-center justify-center text-sm text-slate-500">
            Đang tải dữ liệu...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Tổng nhà hàng"
              value={data?.totalRestaurants ?? 0}
              icon={<Store className="h-5 w-5" />}
            />
            <StatCard
              label="Đang hoạt động"
              value={data?.activeRestaurants ?? 0}
              icon={<Store className="h-5 w-5 text-emerald-600" />}
            />
            <StatCard
              label="Đang bị khóa"
              value={data?.inactiveRestaurants ?? 0}
              icon={<Lock className="h-5 w-5 text-rose-500" />}
            />
            <StatCard
              label="Tài khoản thuê"
              value={data?.totalTenantUsers ?? 0}
              icon={<Users className="h-5 w-5" />}
            />
            <StatCard
              label="Khách hàng"
              value={data?.totalCustomers ?? 0}
              icon={<Users className="h-5 w-5 text-violet-600" />}
            />
            <StatCard
              label="Doanh thu toàn hệ thống"
              value={formatVND(data?.totalRevenue ?? 0)}
              icon={<Wallet className="h-5 w-5 text-emerald-600" />}
            />
            <StatCard
              label="Tổng đơn hàng"
              value={data?.totalOrders ?? 0}
              icon={<ClipboardList className="h-5 w-5" />}
            />
            <StatCard
              label="Lượt đặt bàn"
              value={data?.totalReservations ?? 0}
              icon={<CalendarDays className="h-5 w-5" />}
            />
            <StatCard
              label="Tỷ lệ hủy đơn"
              value={`${data?.cancellationRate ?? 0}%`}
              icon={<Percent className="h-5 w-5 text-amber-600" />}
            />
            <StatCard
              label="Giá trị TB / đơn"
              value={formatVND(data?.averagePerOrder ?? 0)}
              icon={<Banknote className="h-5 w-5" />}
            />
          </div>
        )}
      </div>
    </div>
  );
}
