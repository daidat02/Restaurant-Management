import { useEffect, useMemo, useState } from 'react';
import { Search, Eye, Lock, Unlock, Store, Building2, Wallet } from 'lucide-react';
import { toast } from 'sonner';

import { getAdminTenants, getAdminTenantDetail, blockAdminUser } from '@/api/superadmin.api';
import type { IOwnerSummary, ITenantDetail } from '@/types/superadmin.type';
import { formatVND } from '@/utils/helpers';

import { Button } from '@/components/ui/button';
import { DataTable, type ColumnDef } from '@/components/TableData';
import { AlertDialogCustom } from '@/components/AlertDialog';
import { DialogCustom } from '@/components/DialogCustom';
import { FilterToolbar } from '../Admin/OrderPage/management-order';
import { SubscriptionBadge } from './components/SubscriptionBadge';

export default function SuperAdminTenants() {
  const [owners, setOwners] = useState<IOwnerSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<ITenantDetail | null>(null);

  const fetchOwners = () => {
    setIsLoading(true);
    getAdminTenants()
      .then((res) => setOwners(res ?? []))
      .catch((err: any) => {
        toast.error(err.message || 'Lỗi khi tải danh sách chủ', { position: 'top-right' });
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchOwners();
  }, []);

  const openDetail = (owner: IOwnerSummary) => {
    setDetailOpen(true);
    setIsDetailLoading(true);
    getAdminTenantDetail(owner._id)
      .then((res) => setDetail(res ?? null))
      .catch((err: any) => {
        toast.error(err.message || 'Lỗi khi tải chi tiết chủ', { position: 'top-right' });
      })
      .finally(() => setIsDetailLoading(false));
  };

  const handleBlock = async (owner: IOwnerSummary, blocked: boolean) => {
    try {
      await blockAdminUser(owner._id, blocked);
      toast.success(blocked ? 'Đã khoá chủ và toàn bộ tài khoản liên quan!' : 'Đã mở khoá chủ!', {
        position: 'top-right',
      });
      fetchOwners();
      if (detail && detail.owner._id === owner._id) {
        setDetail({ ...detail, owner: { ...detail.owner, isActive: !blocked } });
      }
    } catch (err: any) {
      toast.error(err.message || 'Thao tác thất bại', { position: 'top-right' });
    }
  };

  const filtered = useMemo(() => {
    let result = [...owners];
    if (searchTerm.trim() !== '') {
      const keyword = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.name?.toLowerCase().includes(keyword) ||
          item.email?.toLowerCase().includes(keyword),
      );
    }
    return result;
  }, [owners, searchTerm]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  const columns: ColumnDef<IOwnerSummary>[] = [
    {
      header: 'Chủ nhà hàng',
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-semibold text-xs text-slate-900">{item.name}</span>
          <span className="text-xs text-slate-500 mt-0.5">{item.email}</span>
        </div>
      ),
    },
    {
      header: 'Trạng thái gói',
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
        <span className="text-xs font-bold text-emerald-600">{formatVND(item.totalPaid ?? 0)}</span>
      ),
    },
    {
      header: 'Tài khoản',
      render: (item) => <SubscriptionBadge state={item.isActive ? 'active' : 'locked'} />,
    },
    {
      header: 'Thao tác',
      className: 'text-right',
      render: (item) => {
        const blocked = !item.isActive;
        return (
          <div className="flex justify-end gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-slate-100 text-cerulean-blue-600"
              onClick={() => openDetail(item)}
              title="Xem chi tiết"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <AlertDialogCustom
              title={blocked ? 'Xác nhận mở khoá chủ' : 'Xác nhận khoá chủ'}
              description={
                blocked
                  ? `Mở khoá "${item.name}" — toàn bộ tài khoản của chủ hoạt động trở lại.`
                  : `Khoá "${item.name}" — toàn bộ nhà hàng và ${item.restaurantCount ?? 0} tài khoản của chủ sẽ không đăng nhập/vận hành được.`
              }
              actionText={blocked ? 'Mở khoá' : 'Khoá'}
              onConfirm={() => handleBlock(item, !blocked)}
            >
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 rounded-lg hover:bg-slate-100 ${
                  blocked ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {blocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              </Button>
            </AlertDialogCustom>
          </div>
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
              Tài Khoản Người Thuê
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Danh sách chủ nhà hàng trên nền tảng — xem chi tiết gói, nhà hàng và giao dịch
            </p>
          </div>
        </div>

        <FilterToolbar>
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm tên, email chủ nhà hàng..."
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
          data={paginatedData}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          isLoading={isLoading}
          getRowKey={(item) => item._id}
        />

        {/* Chi tiết chủ */}
        <DialogCustom
          open={detailOpen}
          onOpenChange={(open) => {
            setDetailOpen(open);
            if (!open) setDetail(null);
          }}
          headerTitle={detail ? `Chi tiết chủ — ${detail.owner.name}` : 'Chi tiết chủ'}
          desc={detail?.owner.email || ''}
          contentClass="max-w-3xl"
          content={
            isDetailLoading ? (
              <div className="flex h-40 items-center justify-center text-sm text-slate-500">
                Đang tải chi tiết...
              </div>
            ) : detail ? (
              <div className="space-y-5">
                {/* Nhà hàng của chủ */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-cerulean-blue-600" />
                    <h4 className="font-semibold text-sm text-slate-900">
                      Nhà hàng ({detail.restaurants.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {detail.restaurants.length === 0 && (
                      <p className="text-xs text-slate-400 italic">Chủ chưa có nhà hàng nào</p>
                    )}
                    {detail.restaurants.map((r) => (
                      <div
                        key={r._id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-slate-50/50"
                      >
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-slate-400" />
                          <span className="text-xs font-semibold text-slate-800">{r.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <SubscriptionBadge state={r.subscription} />
                          <span className="text-[11px] text-slate-500">
                            {r.subscription === 'trial'
                              ? `Trial đến ${r.trialEndsAt ? new Date(r.trialEndsAt).toLocaleDateString('vi-VN') : '---'}`
                              : `Trả đến ${r.paidUntil ? new Date(r.paidUntil).toLocaleDateString('vi-VN') : '---'}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Giao dịch */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="h-4 w-4 text-emerald-600" />
                    <h4 className="font-semibold text-sm text-slate-900">
                      Giao dịch ({detail.transactions.length})
                    </h4>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Thời gian</th>
                          <th className="px-3 py-2 font-semibold">Nhà hàng</th>
                          <th className="px-3 py-2 font-semibold text-right">Số tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detail.transactions.length === 0 && (
                          <tr>
                            <td
                              colSpan={3}
                              className="px-3 py-4 text-center text-slate-400 italic"
                            >
                              Chưa có giao dịch thanh toán
                            </td>
                          </tr>
                        )}
                        {detail.transactions.map((t) => (
                          <tr key={t._id}>
                            <td className="px-3 py-2 text-slate-600">
                              {new Date(t.createdAt).toLocaleString('vi-VN')}
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {typeof t.restaurant === 'object' && 'name' in t.restaurant
                                ? (t.restaurant as { name: string }).name
                                : '---'}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-emerald-600">
                              {formatVND(t.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null
          }
        />
      </div>
    </div>
  );
}
