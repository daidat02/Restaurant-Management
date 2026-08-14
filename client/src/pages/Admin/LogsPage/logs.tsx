import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';

import { getAdminAuditLogs, getAdminPaymentLogs } from '@/api/auditLogs.api';
import type { IAuditLog, ITransaction } from '@/types/superadmin.type';
import { useAuth } from '@/hooks/use-auth';
import { useRestaurant } from '@/hooks/use-restaurant';
import { useSubscription } from '@/hooks/use-subscription';
import { formatVND } from '@/utils/helpers';

import { DataTable, type ColumnDef } from '@/components/TableData';
import { FilterToolbar } from '../OrderPage/management-order';

/** Ánh xạ action → nhãn tiếng Việt để dễ đọc. */
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
  'transaction.create': 'Thanh toán',
  'payment.captured': 'Thu tiền',
  'payment.refund': 'Hoàn tiền',
  'pricing.update': 'Cập nhật giá',
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
  'setting.payos.update': 'Cập nhật PayOS',
  'setting.kds-code.generate': 'Tạo mã nhà bếp',
};

function actionLabel(action: string) {
  return ACTION_LABELS[action] || action;
}

type LogTab = 'hanh_dong' | 'thanh_toan';
type TimeRange = 'all' | 'today' | '7d' | '30d';

/** Kiểm tra createdAt có nằm trong khoảng thời gian chọn không (client-side). */
function inTimeRange(dateStr: string, range: TimeRange): boolean {
  if (range === 'all') return true;
  const time = new Date(dateStr).getTime();
  const now = Date.now();
  if (range === 'today') {
    const startOfDay = new Date().setHours(0, 0, 0, 0);
    return time >= startOfDay;
  }
  const day = 24 * 60 * 60 * 1000;
  if (range === '7d') return time >= now - 7 * day;
  if (range === '30d') return time >= now - 30 * day;
  return true;
}

/** Trích id chi nhánh từ bản ghi audit (restaurant có thể là string hoặc object populate). */
function restaurantIdOf(r: IAuditLog['restaurant']): string {
  if (!r) return '';
  return typeof r === 'string' ? r : (r._id as string) || '';
}

export default function LogsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { restaurants, fetchRestaurants } = useRestaurant();
  const { subscriptions } = useSubscription();

  const [activeTab, setActiveTab] = useState<LogTab>('hanh_dong');
  const [logs, setLogs] = useState<IAuditLog[]>([]);
  const [payments, setPayments] = useState<ITransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Bộ lọc: chi nhánh + thời gian + từ khoá
  const [branchId, setBranchId] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Lấy danh sách chi nhánh của chuỗi (chủ) + map id → tên để hiển thị + lọc.
  // Admin: chỉ các chi nhánh đang thuê bao. Manager: chi nhánh của mình (chỉ có 1).
  const ownerRestaurants = useMemo(() => {
    if (!isAdmin) return restaurants || [];
    const subMap = new Map(subscriptions.map((s) => [String(s._id), s]));
    return (restaurants || []).filter((r) => subMap.has(String(r._id)));
  }, [restaurants, subscriptions, isAdmin]);

  const branchNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    ownerRestaurants.forEach((r) => {
      map[String(r._id)] = r.name;
    });
    return map;
  }, [ownerRestaurants]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  // Fetch dữ liệu theo tab đang mở + phân trang (setState trong callback async, không sync trong effect)
  useEffect(() => {
    let cancelled = false;
    const params = { page: currentPage, limit: pageSize };
    const load = async () => {
      try {
        if (activeTab === 'hanh_dong') {
          const { data } = await getAdminAuditLogs(params);
          if (!cancelled) setLogs(data ?? []);
        } else if (isAdmin) {
          const { data } = await getAdminPaymentLogs(params);
          if (!cancelled) setPayments(data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Lỗi khi tải dữ liệu';
          toast.error(message, { position: 'top-right' });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [activeTab, currentPage, isAdmin]);

  const filteredLogs = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return logs.filter((item) => {
      if (branchId && restaurantIdOf(item.restaurant) !== branchId) return false;
      if (!inTimeRange(item.createdAt, timeRange)) return false;
      if (keyword) {
        const branchName = branchNameMap[restaurantIdOf(item.restaurant)] || '';
        const match = [
          item.summary,
          item.target?.name,
          actionLabel(item.action),
          item.actorName || item.actorInfo?.name,
          branchName,
        ]
          .filter(Boolean)
          .some((s) => s!.toLowerCase().includes(keyword));
        if (!match) return false;
      }
      return true;
    });
  }, [logs, branchId, timeRange, searchTerm, branchNameMap]);

  const filteredPayments = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return payments.filter((item) => {
      const rid = typeof item.restaurant === 'string' ? item.restaurant : item.restaurant?._id;
      if (branchId && rid !== branchId) return false;
      if (!inTimeRange(item.createdAt, timeRange)) return false;
      if (keyword) {
        const branchName =
          typeof item.restaurant === 'object' && item.restaurant ? item.restaurant.name : '';
        const match = [branchName, String(item.amount)].some((s) =>
          s.toLowerCase().includes(keyword),
        );
        if (!match) return false;
      }
      return true;
    });
  }, [payments, branchId, timeRange, searchTerm]);

  const totalPages = Math.max(1, Math.ceil((activeTab === 'hanh_dong' ? filteredLogs.length : filteredPayments.length) / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const auditColumns: ColumnDef<IAuditLog>[] = [
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
      render: (item) => {
        const id = restaurantIdOf(item.restaurant);
        const name =
          typeof item.restaurant === 'object' && item.restaurant ? item.restaurant.name : '';
        return <span className="text-xs font-medium text-slate-700">{branchNameMap[id] || name || '---'}</span>;
      },
    },
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
    <div className="h-full overflow-y-auto">
      <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-950">
              Nhật Ký Hệ Thống
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isAdmin
                ? 'Audit hành động + lịch sử thanh toán của toàn chuỗi chi nhánh'
                : 'Audit hành động trong chi nhánh của bạn'}
            </p>
          </div>
        </div>

        {/* TABS */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1 mb-6 w-fit">
          <button
            type="button"
            onClick={() => {
              setActiveTab('hanh_dong');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'hanh_dong'
                ? 'bg-cerulean-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            Hành Động
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('thanh_toan');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'thanh_toan'
                  ? 'bg-cerulean-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Thanh Toán
            </button>
          )}
        </div>

        <FilterToolbar>
          {isAdmin && (
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm text-slate-700 focus:outline-none focus:border-cerulean-blue-500"
            >
              <option value="">Tất cả chi nhánh</option>
              {ownerRestaurants.map((r) => (
                <option key={String(r._id)} value={String(r._id)}>
                  {r.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="h-9 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm text-slate-700 focus:outline-none focus:border-cerulean-blue-500"
          >
            <option value="all">Mọi thời gian</option>
            <option value="today">Hôm nay</option>
            <option value="7d">7 ngày gần nhất</option>
            <option value="30d">30 ngày gần nhất</option>
          </select>

          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm nội dung, hành động, người thực hiện..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 h-9 rounded-xl border border-slate-200 focus:outline-none focus:border-cerulean-blue-500 text-sm bg-slate-50/50"
            />
          </div>
        </FilterToolbar>

        {activeTab === 'hanh_dong' || !isAdmin ? (
          <DataTable
            columns={auditColumns}
            data={filteredLogs}
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            totalItems={filteredLogs.length}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            isLoading={isLoading}
            getRowKey={(item) => item._id}
            emptyMessage="Chưa có nhật ký hành động nào"
          />
        ) : (
          <DataTable
            columns={paymentColumns}
            data={filteredPayments}
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            totalItems={filteredPayments.length}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            isLoading={isLoading}
            getRowKey={(item) => item._id}
            emptyMessage="Chưa có lịch sử thanh toán nào"
          />
        )}
      </div>
    </div>
  );
}
