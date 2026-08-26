import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Download,
  ChevronRight,
  Loader2,
  ClipboardList,
  Banknote,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import type { LucideIcon } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { useActiveRestaurantId } from '@/hooks/use-active-restaurant';
import type { IOrder } from '@/types/order.type';
import {
  getManagementOrders,
  type OrderManagementQuery,
  type OrderManagementStats,
} from '@/api/order.api';
import { API_BASE_URL, API_ENDPOINTS } from '@/constants';
import { store } from '@/redux/store/store';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { DataTable, type ColumnDef } from '@/components/TableData';
import { StatusTag } from '@/components/StatusTag';
import { CustomSelect } from '@/components/SelectCustom';
import { DatePickerWithRange } from '@/components/DatePickerRange';

const translateOrderType = (type: string) => {
  switch (type) {
    case 'dine-in':
      return 'Tại bàn';
    case 'delivery':
      return 'Giao hàng';
    case 'to-go':
      return 'Mang đi';
    default:
      return type;
  }
};

const ORDER_TYPE_OPTIONS = [
  { value: '', label: 'Tất cả loại đơn' },
  { value: 'dine-in', label: 'Tại bàn' },
  { value: 'delivery', label: 'Giao hàng' },
  { value: 'to-go', label: 'Mang đi' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'preparing', label: 'Đang chế biến' },
  { value: 'serving', label: 'Đang phục vụ' },
  { value: 'served', label: 'Đã phục vụ' },
  { value: 'delivered', label: 'Đã giao' },
  { value: 'paid', label: 'Đã thanh toán' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã huỷ' },
];

type SortBy = NonNullable<OrderManagementQuery['sortBy']>;
const EMPTY_STATS: OrderManagementStats = {
  totalOrders: 0,
  revenue: 0,
  completedCount: 0,
  cancelledCount: 0,
};

export default function OrderManagement() {
  const { user } = useAuth();
  const currentRole = user?.role || 'staff';
  const activeRestaurantId = useActiveRestaurantId();
  const navigate = useNavigate();

  // Bộ lọc SERVER-SIDE
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | undefined>(undefined);
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Phân trang + dữ liệu
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [ordersData, setOrdersData] = useState<IOrder[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState<OrderManagementStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Debounce search 400ms để không gọi API mỗi phím gõ
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch server-side — mọi filter/sort/phân trang đều là query param
  useEffect(() => {
    if (!activeRestaurantId) return;
    let cancelled = false;
    getManagementOrders({
      page: currentPage,
      limit: pageSize,
      sortBy,
      sortDir,
      ...(searchTerm.trim() !== '' ? { search: searchTerm.trim() } : {}),
      ...(orderTypeFilter ? { orderType: orderTypeFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(dateRange?.from ? { fromDate: dateRange.from } : {}),
      ...(dateRange?.to ? { toDate: dateRange.to } : {}),
    })
      .then(({ data, total, stats }) => {
        if (cancelled) return;
        setOrdersData(data ?? []);
        setTotalItems(total ?? 0);
        setStats(stats ?? EMPTY_STATS);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Lỗi khi tải đơn hàng', {
            position: 'top-right',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    activeRestaurantId,
    currentPage,
    searchTerm,
    orderTypeFilter,
    statusFilter,
    dateRange,
    sortBy,
    sortDir,
  ]);

  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  /** Bấm header: null → asc → desc → null */
  const handleSortChange = (column: SortBy) => (direction: 'asc' | 'desc' | null) => {
    if (!direction) {
      setSortBy('createdAt');
      setSortDir('desc');
      return;
    }
    setSortBy(column);
    setSortDir(direction);
    setCurrentPage(1);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Raw axios để đọc header Content-Disposition chứa tên file do server sinh
      const res = await axios.get(`${API_ENDPOINTS.ORDERS.MANAGEMENT_EXPORT}`, {
        params: {
          ...(searchTerm.trim() !== '' ? { search: searchTerm.trim() } : {}),
          ...(orderTypeFilter ? { orderType: orderTypeFilter } : {}),
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(dateRange?.from ? { fromDate: dateRange.from } : {}),
          ...(dateRange?.to ? { toDate: dateRange.to } : {}),
        },
        responseType: 'blob',
        headers: { Authorization: `Bearer ${store.getState().auth.token}` },
        withCredentials: true,
      });

      const disposition: string = res.headers?.['content-disposition'] ?? '';
      const fileName =
        /filename="?([^";]+)"?/.exec(disposition)?.[1] ??
        `don-hang-${new Date().toISOString().slice(0, 10)}.xlsx`;

      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Đã xuất file Excel thành công!', { position: 'top-right' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi xuất file Excel', {
        position: 'top-right',
      });
    } finally {
      setIsExporting(false);
    }
  };

  /** Card thống kê: icon ngữ nghĩa + progress bar cho các chỉ số % (số luôn hiển thị bằng chữ — AAA). */
  const statCards = useMemo(() => {
    const completedPct =
      stats.totalOrders > 0 ? Math.round((stats.completedCount / stats.totalOrders) * 100) : 0;
    const cancelledPct =
      stats.totalOrders > 0 ? Math.round((stats.cancelledCount / stats.totalOrders) * 100) : 0;
    return [
      {
        label: 'Tổng đơn',
        value: stats.totalOrders.toLocaleString('vi-VN'),
        sub: 'Trong phạm vi bộ lọc hiện tại',
        icon: ClipboardList,
        tint: 'bg-cerulean-blue-50 text-cerulean-blue-600',
        bar: null as number | null,
        barColor: '',
      },
      {
        label: 'Doanh thu',
        value: `${stats.revenue.toLocaleString('vi-VN')} đ`,
        sub: 'Không tính đơn đã huỷ',
        icon: Banknote,
        tint: 'bg-emerald-50 text-emerald-600',
        bar: null as number | null,
        barColor: '',
      },
      {
        label: 'Hoàn tất',
        value: `${stats.completedCount.toLocaleString('vi-VN')} · ${completedPct}%`,
        sub: 'Đơn hoàn thành hoặc đã thanh toán',
        icon: CheckCircle2,
        tint: 'bg-emerald-50 text-emerald-700',
        bar: completedPct,
        barColor: 'bg-emerald-500',
      },
      {
        label: 'Đã huỷ',
        value: `${stats.cancelledCount.toLocaleString('vi-VN')} · ${cancelledPct}%`,
        sub: 'Tỷ lệ huỷ trên tổng đơn',
        icon: XCircle,
        tint: 'bg-rose-50 text-rose-600',
        bar: cancelledPct,
        barColor: 'bg-rose-500',
      },
    ];
  }, [stats]);

  const columns: ColumnDef<IOrder>[] = [
    {
      header: 'Mã Đơn Hàng',
      render: (order) => (
        <span
          onClick={() => {
            navigate(`/${currentRole}/orders/edit/${order._id}`, {
              state: { orderData: order },
            });
          }}
          className="text-xs text-cerulean-blue-600 font-mono font-medium hover:underline cursor-pointer"
        >
          #{order.orderId || order._id?.substring(0, 6).toUpperCase()}
        </span>
      ),
      sortable: true,
      currentSortDirection: sortBy === 'orderId' ? sortDir : null,
      onSortChange: handleSortChange('orderId'),
    },
    {
      header: 'Loại đơn',
      render: (order) => (
        <div className="text-xs flex flex-col">
          <span className="font-medium text-slate-800">
            {translateOrderType(order.orderType as string)}
          </span>
          <span className="text-xs text-slate-500 mt-0.5">
            {order.orderType === 'dine-in' && order.table
              ? `Bàn: ${(order.table as { tableNumber?: number })?.tableNumber || 'N/A'}`
              : order.deliveryInfo?.name || 'Khách lẻ'}
          </span>
        </div>
      ),
    },
    {
      header: 'TỔNG TIỀN',
      render: (order) => (
        <span className="font-semibold text-slate-900">
          {order.totalAmount?.toLocaleString('vi-VN')} đ
        </span>
      ),
      sortable: true,
      currentSortDirection: sortBy === 'totalAmount' ? sortDir : null,
      onSortChange: handleSortChange('totalAmount'),
    },
    {
      header: 'Trạng thái đơn',
      render: (order) => <StatusTag status={order.status || ''} />,
    },
    {
      header: 'Thanh toán',
      render: (order) => <StatusTag status={order.paymentStatus || ''} />,
    },
    {
      header: 'Thời gian tạo',
      render: (order) => (
        <span className="text-sm text-slate-600">
          {new Date(order.createdAt || '').toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      header: 'Hành động',
      className: 'text-right',
      render: (order) => (
        <div className="flex justify-end gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:bg-slate-100 rounded-lg"
            onClick={() => {
              navigate(`/${currentRole}/orders/edit/${order._id}`, {
                state: { orderData: order },
              });
            }}
          >
            <ChevronRight size={18} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8">
        {/* TOP HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-950">
              Quản Lý Đơn Hàng
            </h1>
            <p className="text-sm text-slate-500 mt-1">Hệ thống theo dõi và xử lý hóa đơn</p>
          </div>
        </div>

        {/* THỐNG KÊ — tính server-side trên cùng bộ filter; skeleton khi tải lần đầu */}
        <div className="grid grid-cols-2 gap-3 mb-6 lg:grid-cols-4">
          {isLoading && totalItems === 0
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm animate-pulse"
                  aria-hidden="true"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-16 rounded-full bg-slate-100" />
                    <div className="h-9 w-9 rounded-xl bg-slate-100" />
                  </div>
                  <div className="mt-3 h-6 w-24 rounded-lg bg-slate-100" />
                  <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100" />
                </div>
              ))
            : statCards.map((card) => {
                const Icon = card.icon as LucideIcon;
                return (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {card.label}
                      </p>
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                          card.tint,
                        )}
                      >
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                    </div>
                    <p className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-gray-900">
                      {card.value}
                    </p>
                    {card.bar != null && (
                      <>
                        <div
                          role="progressbar"
                          aria-valuenow={card.bar}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${card.label}: ${card.bar}%`}
                          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                        >
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-300',
                              card.barColor,
                            )}
                            style={{ width: `${Math.min(100, Math.max(0, card.bar))}%` }}
                          />
                        </div>
                        <p className="mt-1.5 truncate text-[11px] font-medium text-slate-400">
                          {card.sub}
                        </p>
                      </>
                    )}
                  </div>
                );
              })}
        </div>

        {/* COMPONENT FILTER TOOLBAR ĐA NĂNG */}
        <FilterToolbar
          rightActions={
            <Button
              variant="outline"
              disabled={isExporting}
              onClick={handleExport}
              className="text-slate-700 border-slate-200 bg-white hover:bg-slate-50 h-9 rounded-xl text-sm"
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-500" />
              ) : (
                <Download className="mr-2 h-4 w-4 text-slate-500" />
              )}
              {isExporting ? 'Đang xuất...' : 'Xuất file'}
            </Button>
          }
        >
          {/* Ô TÌM KIẾM — ngoài cùng bên trái */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm mã đơn hàng..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 h-9 rounded-xl border border-slate-200 focus:outline-none focus:border-cerulean-blue-500 text-sm bg-slate-50/50"
            />
          </div>

          <CustomSelect
            options={ORDER_TYPE_OPTIONS}
            value={orderTypeFilter}
            onChange={(val: string) => {
              setOrderTypeFilter(val);
              setCurrentPage(1);
            }}
            className="w-full sm:w-44"
            triggerClass="h-9"
          />

          <CustomSelect
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(val: string) => {
              setStatusFilter(val);
              setCurrentPage(1);
            }}
            className="w-full sm:w-48"
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

        {/* BẢNG HIỂN THỊ CHÍNH */}
        <DataTable
          columns={columns}
          data={ordersData}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          isLoading={isLoading}
          getRowKey={(order) => (order._id ?? order.orderId ?? '') as string | number}
        />
      </div>
    </div>
  );
}

interface FilterToolbarProps {
  children: React.ReactNode;
  rightActions?: React.ReactNode;
}

export function FilterToolbar({ children, rightActions }: FilterToolbarProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 mb-6 shadow-sm flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      {/* Cụm bộ lọc chính bên trái */}
      <div className="flex flex-1 flex-col sm:flex-row flex-wrap gap-3">{children}</div>

      {/* Cụm hành động phụ bên phải */}
      {rightActions && (
        <div className="flex items-center gap-2 self-start lg:self-auto">{rightActions}</div>
      )}
    </div>
  );
}
