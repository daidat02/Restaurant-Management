import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';

import { getAuditLogs } from '@/api/superadmin.api';
import type { IAuditLog } from '@/types/superadmin.type';

import { DataTable, type ColumnDef } from '@/components/TableData';
import { FilterToolbar } from '../Admin/OrderPage/management-order';

/** Ánh xạ action → nhãn tiếng Việt để dễ đọc. */
const ACTION_LABELS: Record<string, string> = {
  'user.register': 'Đăng ký',
  'user.block': 'Khoá chủ',
  'user.unblock': 'Mở khoá chủ',
  'restaurant.create': 'Tạo nhà hàng',
  'subscription.trial.started': 'Bắt đầu dùng thử',
  'subscription.locked': 'Khoá hết hạn',
  'subscription.unlocked': 'Mở khoá hết hạn',
  'subscription.expiring': 'Sắp hết hạn',
  'transaction.create': 'Thanh toán',
  'pricing.update': 'Cập nhật giá',
};

function actionLabel(action: string) {
  return ACTION_LABELS[action] || action;
}

export default function SuperAdminAudit() {
  const [logs, setLogs] = useState<IAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    setIsLoading(true);
    getAuditLogs({ page: currentPage, limit: pageSize })
      .then(({ data, total }) => {
        setLogs(data ?? []);
        setTotal(total ?? 0);
      })
      .catch((err: any) => {
        toast.error(err.message || 'Lỗi khi tải audit log', { position: 'top-right' });
      })
      .finally(() => setIsLoading(false));
  }, [currentPage]);

  const filtered = useMemo(() => {
    if (searchTerm.trim() === '') return logs;
    const keyword = searchTerm.toLowerCase();
    return logs.filter(
      (item) =>
        item.summary?.toLowerCase().includes(keyword) ||
        actionLabel(item.action).toLowerCase().includes(keyword) ||
        item.actorInfo?.name?.toLowerCase().includes(keyword),
    );
  }, [logs, searchTerm]);

  const totalPages = Math.ceil(total / pageSize) || 1;

  const columns: ColumnDef<IAuditLog>[] = [
    {
      header: 'Thời gian',
      render: (item) => (
        <span className="text-xs font-medium text-slate-600">
          {new Date(item.createdAt).toLocaleString('vi-VN')}
        </span>
      ),
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
      render: (item) => {
        const name = item.actorInfo?.name;
        return (
          <span className="text-xs font-medium text-slate-700">{name || '---'}</span>
        );
      },
    },
    {
      header: 'Nội dung',
      render: (item) => (
        <span className="text-xs text-slate-600 max-w-[360px] truncate block">
          {item.summary}
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
              Nhật ký hoạt động trên nền tảng: đăng ký, thanh toán, khoá/mở chủ
            </p>
          </div>
        </div>

        <FilterToolbar>
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm nội dung nhật ký, hành động, người thực hiện..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 h-9 rounded-xl border border-slate-200 focus:outline-none focus:border-cerulean-blue-500 text-sm bg-slate-50/50"
            />
          </div>
        </FilterToolbar>

        <DataTable
          columns={columns}
          data={filtered}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          isLoading={isLoading}
          getRowKey={(item) => item._id}
          emptyMessage="Chưa có nhật ký nào"
        />
      </div>
    </div>
  );
}
