import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { toast } from 'sonner';

import { getAuditLogs } from '@/api/superadmin.api';
import { getAdminAuditLogs, getAdminPaymentLogs } from '@/api/auditLogs.api';
import type { IAuditLog, ITransaction } from '@/types/superadmin.type';
import type { IRestaurant } from '@/types/restaurant.type';
import { useAuth } from '@/hooks/use-auth';
import { formatVND } from '@/utils/helpers';
import { CustomSelect } from '@/components/SelectCustom';
import { DatePickerWithRange } from '@/components/DatePickerRange';

import { DataTable, type ColumnDef } from '@/components/TableData';
import { FilterToolbar } from '@/pages/Admin/OrderPage/management-order';

/** Ánh xạ action → nhãn tiếng Việt — NGUỒN DUY NHẤT dùng chung mọi trang nhật ký. */
const ACTION_LABELS: Record<string, string> = {
  'user.register': 'Đăng ký',
  'user.create': 'Tạo tài khoản',
  'user.update': 'Cập nhật user',
  'user.update.role': 'Đổi vai trò',
  'user.delete': 'Xoá user',
  'user.block': 'Khoá chủ',
  'user.unblock': 'Mở khoá chủ',
  'user.switch-tenant': 'Chuyển chi nhánh',
  'restaurant.create': 'Tạo nhà hàng',
  'restaurant.update': 'Cập nhật nhà hàng',
  'restaurant.delete': 'Xoá nhà hàng',
  'restaurant.lock': 'Khoá nhà hàng',
  'restaurant.unlock': 'Mở khoá nhà hàng',
  'subscription.trial.started': 'Bắt đầu dùng thử',
  'subscription.locked': 'Khoá hết hạn',
  'subscription.unlocked': 'Mở khoá hết hạn',
  'subscription.expiring': 'Sắp hết hạn',
  'subscription.downgrade': 'Hạ gói',
  'subscription.renewed': 'Gia hạn gói',
  'subscription.upgraded': 'Nâng cấp gói',
  'transaction.create': 'Thanh toán',
  'payment.captured': 'Thu tiền',
  'payment.refund': 'Hoàn tiền',
  'pricing.create': 'Tạo gói giá',
  'pricing.update': 'Cập nhật giá',
  'setting.gateway.update': 'Cập nhật cổng thanh toán',
  'setting.payos.update': 'Cập nhật PayOS',
  'setting.kds-code.generate': 'Tạo mã nhà bếp',
  'order.create': 'Tạo đơn',
  'order.update': 'Cập nhật đơn',
  'order.update.status': 'Đổi trạng thái đơn',
  'order.item.update': 'Sửa món trong đơn',
  'order.item.remove': 'Xoá món khỏi đơn',
  'order.move.table': 'Chuyển bàn',
  'order.paid': 'Thanh toán đơn',
  'order.void': 'Huỷ đơn',
  'menuItem.update': 'Sửa món menu',
  'table.update': 'Cập nhật bàn',
  'reservation.update': 'Cập nhật đặt bàn',
};

function actionLabel(action: string) {
  return ACTION_LABELS[action] || action;
}

/** Whitelist action super-admin được xem (mirror server SUPER_ADMIN_ALLOWED_ACTIONS). */
const PLATFORM_ALLOWED_ACTIONS = [
  'user.register',
  'user.block',
  'user.unblock',
  'restaurant.create',
  'restaurant.delete',
  'restaurant.lock',
  'restaurant.unlock',
  'subscription.trial.started',
  'subscription.locked',
  'subscription.unlocked',
  'subscription.expiring',
  'subscription.downgrade',
  'subscription.renewed',
  'subscription.upgraded',
  'transaction.create',
  'pricing.create',
  'pricing.update',
  'setting.gateway.update',
] as const;

function buildActionOptions(mode: 'platform' | 'chain') {
  const actions =
    mode === 'platform'
      ? PLATFORM_ALLOWED_ACTIONS
      : (Object.keys(ACTION_LABELS) as (keyof typeof ACTION_LABELS)[]);
  return [
    { value: 'all', label: 'Tất cả hành động' },
    ...actions.map((action) => ({ value: action, label: actionLabel(action) })),
  ];
}

type LogTab = 'hanh_dong' | 'thanh_toan';

interface AuditLogPanelProps {
  /** platform = super-admin (whitelist action); chain = admin/manager trong phạm vi chuỗi. */
  mode: 'platform' | 'chain';
  /** chain + admin: danh sách chi nhánh của chủ (đã lọc theo thuê bao) cho dropdown lọc. */
  branches?: IRestaurant[];
}

/**
 * Panel nhật ký DÙNG CHUNG cho SuperAdmin/Audit và Admin/LogsPage:
 * - Filter SERVER-SIDE: search (debounce), hành động, khoảng ngày, chi nhánh (chain+admin).
 * - Tab Thanh Toán chỉ hiện với chain + admin (endpoint /audit-logs/payments).
 */
export default function AuditLogPanel({ mode, branches = [] }: AuditLogPanelProps) {
  const { user } = useAuth();
  const isAdmin = mode === 'chain' && user?.role === 'admin';
  const showPaymentTab = isAdmin;

  const [activeTab, setActiveTab] = useState<LogTab>('hanh_dong');
  const [logs, setLogs] = useState<IAuditLog[]>([]);
  const [payments, setPayments] = useState<ITransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Search: input phản hồi tức thì, fetch theo bản debounce
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | undefined>(undefined);
  const [branchId, setBranchId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const actionOptions = useMemo(() => buildActionOptions(mode), [mode]);

  // Debounce search 400ms để không gọi API mỗi phím gõ
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    // Tab hành động: cùng endpoint /audit-logs cho cả platform lẫn chain
    if (!showPaymentTab || activeTab === 'hanh_dong') {
      const fetcher =
        mode === 'platform'
          ? getAuditLogs({
              page: currentPage,
              limit: pageSize,
              ...(actionFilter !== 'all' ? { action: actionFilter } : {}),
              ...(dateRange?.from ? { startDate: dateRange.from } : {}),
              ...(dateRange?.to ? { endDate: dateRange.to } : {}),
              ...(searchTerm.trim() !== '' ? { search: searchTerm.trim() } : {}),
            })
          : getAdminAuditLogs({
              page: currentPage,
              limit: pageSize,
              ...(branchId ? { restaurantId: branchId } : {}),
              ...(actionFilter !== 'all' ? { action: actionFilter } : {}),
              ...(dateRange?.from ? { startDate: dateRange.from } : {}),
              ...(dateRange?.to ? { endDate: dateRange.to } : {}),
              ...(searchTerm.trim() !== '' ? { search: searchTerm.trim() } : {}),
            });
      void fetcher
        .then(({ data, total }) => {
          if (!cancelled) {
            setLogs(data ?? []);
            setTotal(total ?? 0);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            const message = err instanceof Error ? err.message : 'Lỗi khi tải audit log';
            toast.error(message, { position: 'top-right' });
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }

    // Tab thanh toán (chain + admin)
    void getAdminPaymentLogs({
      page: currentPage,
      limit: pageSize,
      ...(branchId ? { restaurantId: branchId } : {}),
      ...(dateRange?.from ? { startDate: dateRange.from } : {}),
      ...(dateRange?.to ? { endDate: dateRange.to } : {}),
    })
      .then(({ data, total }) => {
        if (!cancelled) {
          setPayments(data ?? []);
          setTotal(total ?? 0);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Lỗi khi tải lịch sử thanh toán';
          toast.error(message, { position: 'top-right' });
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    mode,
    activeTab,
    showPaymentTab,
    currentPage,
    branchId,
    actionFilter,
    dateRange,
    searchTerm,
  ]);

  const branchNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    branches.forEach((r) => {
      map[String(r._id)] = r.name;
    });
    return map;
  }, [branches]);

  // Tab thanh toán: search là lọc phụ trong trang hiện tại (server đã lọc ngày/chi nhánh)
  const keyword = searchTerm.trim().toLowerCase();
  const filteredPayments = useMemo(
    () =>
      payments.filter((item) => {
        if (!keyword) return true;
        const branchName =
          typeof item.restaurant === 'object' && item.restaurant ? item.restaurant.name : '';
        return [branchName, String(item.amount)].some((s) => s.toLowerCase().includes(keyword));
      }),
    [payments, keyword],
  );

  const totalPages = Math.ceil(total / pageSize) || 1;
  const hasActiveFilters =
    actionFilter !== 'all' || !!dateRange || branchId !== '' || searchTerm.trim() !== '';

  const clearFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setActionFilter('all');
    setDateRange(undefined);
    setBranchId('');
    setCurrentPage(1);
  };

  const isPaymentsView = showPaymentTab && activeTab === 'thanh_toan';

  const auditColumns: ColumnDef<IAuditLog>[] = [
    {
      header: 'Thời gian',
      render: (item) => (
        <span className="text-xs font-medium text-slate-600">
          {new Date(item.createdAt).toLocaleString('vi-VN')}
        </span>
      ),
    },
    ...(mode === 'chain'
      ? [
          {
            header: 'Chi nhánh',
            render: (item: IAuditLog) => {
              const id = typeof item.restaurant === 'string' ? item.restaurant : item.restaurant?._id;
              const name =
                typeof item.restaurant === 'object' && item.restaurant
                  ? item.restaurant.name
                  : '';
              return (
                <span className="text-xs font-medium text-slate-700">
                  {(id && branchNameMap[id]) || name || '---'}
                </span>
              );
            },
          } satisfies ColumnDef<IAuditLog>,
        ]
      : []),
    {
      header: 'Hành động',
      render: (item) => (
        <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-cerulean-blue-50 text-cerulean-blue-700 border border-cerulean-blue-100">
          {actionLabel(item.action)}
        </span>
      ),
    },
    {
      header: 'Người thực hiện',
      render: (item) => (
        <span className="text-xs font-medium text-slate-700">
          {item.actorName || item.actorInfo?.name || '---'}
        </span>
      ),
    },
    {
      header: 'Nội dung',
      render: (item) => (
        <span className="text-xs text-slate-600 max-w-[360px] truncate block">
          {item.target?.name ? `${item.target.name} — ${item.summary}` : item.summary}
        </span>
      ),
    },
  ];

  const paymentColumns: ColumnDef<ITransaction>[] = [
    {
      header: 'Thời gian',
      render: (item) => (
        <span className="text-xs font-medium text-slate-600">
          {new Date(item.createdAt).toLocaleString('vi-VN')}
        </span>
      ),
    },
    {
      header: 'Chi nhánh',
      render: (item) => (
        <span className="text-xs font-medium text-slate-700">
          {typeof item.restaurant === 'object' && item.restaurant ? item.restaurant.name : '---'}
        </span>
      ),
    },
    {
      header: 'Số tiền',
      render: (item) => (
        <span className="text-xs font-bold text-emerald-600">{formatVND(item.amount)}</span>
      ),
    },
    {
      header: 'Chu kỳ',
      render: (item) => (
        <span className="text-xs font-medium text-slate-600">
          {item.cycleMonths === 1 ? '1 tháng' : `${item.cycleMonths} tháng`}
        </span>
      ),
    },
    {
      header: 'Loại',
      render: (item) => (
        <span className="text-xs font-medium text-slate-600">
          {item.type === 'trial-expire' ? 'Hết hạn' : 'Phí chuỗi'}
        </span>
      ),
    },
    {
      header: 'Tới ngày',
      render: (item) => (
        <span className="text-xs font-medium text-slate-600">
          {new Date(item.paidUntil).toLocaleDateString('vi-VN')}
        </span>
      ),
    },
  ];

  return (
    <div>
      {/* TABS — chỉ chain + admin có tab Thanh Toán */}
      {showPaymentTab && (
        <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1 mb-6 w-fit">
          {(
            [
              { key: 'hanh_dong', label: 'Hành Động' },
              { key: 'thanh_toan', label: 'Thanh Toán' },
            ] as { key: LogTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-cerulean-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

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
        {/* Search ngoài cùng bên trái */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder={
              isPaymentsView
                ? 'Tìm theo chi nhánh, số tiền...'
                : 'Tìm kiếm nội dung, hành động, người thực hiện...'
            }
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 h-9 rounded-xl border border-slate-200 focus:outline-none focus:border-cerulean-blue-500 text-sm bg-slate-50/50"
          />
        </div>

        {/* Lọc chi nhánh — chỉ chain + admin (manager bị server intersect về đúng chi nhánh) */}
        {isAdmin && (
          <CustomSelect
            options={[
              { value: '', label: 'Tất cả chi nhánh' },
              ...branches.map((r) => ({ value: String(r._id), label: r.name })),
            ]}
            value={branchId}
            onChange={(val: string) => {
              setBranchId(val);
              setCurrentPage(1);
            }}
            className="w-full sm:w-48"
            triggerClass="h-9"
          />
        )}

        {!isPaymentsView && (
          <CustomSelect
            options={actionOptions}
            value={actionFilter}
            onChange={(val: string) => {
              setActionFilter(val);
              setCurrentPage(1);
            }}
            className="w-full sm:w-52"
            triggerClass="h-9"
          />
        )}

        <DatePickerWithRange
          mode="range"
          value={dateRange}
          onChange={(val: { from?: string; to?: string } | undefined) => {
            setDateRange(val?.from && val?.to ? { from: val.from, to: val.to } : undefined);
            setCurrentPage(1);
          }}
        />
      </FilterToolbar>

      {isPaymentsView ? (
        <DataTable
          columns={paymentColumns}
          data={filteredPayments}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          isLoading={isLoading}
          getRowKey={(item) => item._id}
          emptyMessage="Chưa có lịch sử thanh toán nào"
        />
      ) : (
        <DataTable
          columns={auditColumns}
          data={logs}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          isLoading={isLoading}
          getRowKey={(item) => item._id}
          emptyMessage="Chưa có nhật ký hành động nào"
        />
      )}
    </div>
  );
}
