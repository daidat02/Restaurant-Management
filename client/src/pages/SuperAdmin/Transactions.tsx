import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { toast } from 'sonner';

import { getAdminTransactions } from '@/api/superadmin.api';
import type { ITransaction } from '@/types/superadmin.type';
import { formatVND } from '@/utils/helpers';
import { CustomSelect } from '@/components/SelectCustom';
import { DatePickerWithRange } from '@/components/DatePickerRange';

import { DataTable, type ColumnDef } from '@/components/TableData';
import { FilterToolbar } from '../Admin/OrderPage/management-order';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'paid', label: 'Đã thanh toán' },
  { value: 'pending', label: 'Đang chờ' },
  { value: 'cancelled', label: 'Đã huỷ' },
];

export default function SuperAdminTransactions() {
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  // Khoảng ngày lọc (yyyy-MM-dd) — undefined = chưa lọc
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    getAdminTransactions()
      .then((res) => setTransactions(res ?? []))
      .catch((err: any) => {
        toast.error(err.message || 'Lỗi khi tải lịch sử giao dịch', { position: 'top-right' });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = [...transactions];
    if (statusFilter !== 'all') {
      result = result.filter((item) => item.status === statusFilter);
    }
    if (dateRange?.from) {
      const from = new Date(dateRange.from);
      from.setHours(0, 0, 0, 0);
      result = result.filter((item) => new Date(item.createdAt) >= from);
    }
    if (dateRange?.to) {
      const to = new Date(dateRange.to);
      to.setHours(23, 59, 59, 999);
      result = result.filter((item) => new Date(item.createdAt) <= to);
    }
    if (searchTerm.trim() !== '') {
      const keyword = searchTerm.toLowerCase();
      result = result.filter((item) => {
        const ownerName =
          typeof item.ownerId === 'object' && 'name' in item.ownerId
            ? (item.ownerId as { name: string }).name
            : '';
        const restaurantName =
          typeof item.restaurant === 'object' && 'name' in item.restaurant
            ? (item.restaurant as { name: string }).name
            : '';
        return (
          ownerName.toLowerCase().includes(keyword) ||
          restaurantName.toLowerCase().includes(keyword)
        );
      });
    }
    return result;
  }, [transactions, searchTerm, statusFilter, dateRange]);

  const hasActiveFilters =
    statusFilter !== 'all' || !!dateRange || searchTerm.trim() !== '';

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateRange(undefined);
    setCurrentPage(1);
  };

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  const columns: ColumnDef<ITransaction>[] = [
    {
      header: 'Thời gian',
      render: (item) => (
        <span className="text-xs font-medium text-slate-600">
          {new Date(item.createdAt).toLocaleString('vi-VN')}
        </span>
      ),
    },
    {
      header: 'Chủ nhà hàng',
      render: (item) => {
        if (typeof item.ownerId === 'object' && 'name' in item.ownerId) {
          const owner = item.ownerId as { name: string; email?: string };
          return (
            <div className="flex flex-col">
              <span className="font-semibold text-xs text-slate-900">{owner.name}</span>
              {owner.email && <span className="text-xs text-slate-500">{owner.email}</span>}
            </div>
          );
        }
        return <span className="text-xs text-slate-400 italic">---</span>;
      },
    },
    {
      header: 'Nhà hàng',
      render: (item) => (
        <span className="text-xs font-medium text-slate-700">
          {typeof item.restaurant === 'object' && 'name' in item.restaurant
            ? (item.restaurant as { name: string }).name
            : '---'}
        </span>
      ),
    },
    {
      header: 'Chu kỳ',
      className: 'text-center',
      render: (item) => (
        <span className="text-xs font-medium text-slate-600">{item.cycleMonths} tháng</span>
      ),
    },
    {
      header: 'Số tiền',
      className: 'text-right',
      render: (item) => (
        <span className="text-xs font-bold text-emerald-600">{formatVND(item.amount)}</span>
      ),
    },
    {
      header: 'Trạng thái',
      className: 'text-center',
      render: (item) => {
        const statusMap: Record<string, { label: string; className: string }> = {
          paid: {
            label: 'Đã thanh toán',
            className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
          },
          pending: {
            label: 'Đang chờ',
            className: 'bg-amber-50 text-amber-700 ring-amber-200',
          },
          cancelled: {
            label: 'Đã huỷ',
            className: 'bg-red-50 text-red-700 ring-red-200',
          },
        };
        const status = statusMap[item.status] ?? {
          label: item.status,
          className: 'bg-slate-100 text-slate-600 ring-slate-200',
        };
        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${status.className}`}
          >
            {status.label}
          </span>
        );
      },
    },
    {
      header: 'Trả đến',
      render: (item) => (
        <span className="text-xs text-slate-600">
          {item.paidUntil ? new Date(item.paidUntil).toLocaleDateString('vi-VN') : '---'}
        </span>
      ),
    },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-950">
              Lịch Sử Giao Dịch
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Toàn bộ giao dịch thanh toán subscription của các chủ trên nền tảng
            </p>
          </div>
        </div>

        <FilterToolbar
          rightActions={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <X size={15} />
                Xoá bộ lọc
              </button>
            ) : undefined
          }
        >
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên chủ, tên nhà hàng..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 h-9 rounded-xl border border-slate-200 focus:outline-none focus:border-cerulean-blue-500 text-sm bg-slate-50/50"
            />
          </div>

          <CustomSelect
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(val: string) => {
              setStatusFilter(val);
              setCurrentPage(1);
            }}
            className="w-full sm:w-44"
            triggerClass="h-9"
          />

          <DatePickerWithRange
            mode="range"
            value={dateRange}
            onChange={(val: { from?: string; to?: string } | undefined) => {
              setDateRange(val?.from && val?.to ? { from: val.from, to: val.to } : undefined);
              setCurrentPage(1);
            }}
          />
        </FilterToolbar>

        <DataTable
          columns={columns}
          data={paginatedData}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          isLoading={isLoading}
          getRowKey={(item) => item._id}
          emptyMessage="Chưa có giao dịch nào"
        />
      </div>
    </div>
  );
}
