import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download, Plus, Edit2, Trash2, CreditCard, Settings, Store, Building2 } from 'lucide-react';

import { useRestaurant } from '@/hooks/use-restaurant';
import { useSubscription } from '@/hooks/use-subscription';
import type { IRestaurant } from '@/types/restaurant.type';

import { Button } from '@/components/ui/button';
import { DataTable, type ColumnDef } from '@/components/TableData';
import { StatusTag } from '@/components/StatusTag';
import { SubscriptionBadge } from '@/components/SubscriptionBadge';
import SideDrawer from '@/components/SideDrawer';
import { AlertDialogCustom } from '@/components/AlertDialog';
import { FilterToolbar } from '../OrderPage/management-order';
import FormCreateRestaurant from './components/FormCreateRestaurant';
import { PayForNewRestaurantModal } from './components/PayForNewRestaurantModal';
import { format } from 'date-fns';

export default function RestaurantsPage() {
  const navigate = useNavigate();
  const { fetchRestaurants, restaurants, isLoading, deleteRestaurant } = useRestaurant();
  const { subscriptions, isLoading: subscriptionsLoading } = useSubscription();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<IRestaurant | null>(null);

  // Các State quản lý bộ lọc & tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');

  // State quản lý phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 1. Lấy dữ liệu từ API khi component mount
  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  // Chỉ hiển thị "nhà hàng của tôi" (chủ sở hữu) + gộp trạng thái thuê bao
  const ownerRestaurants = useMemo(() => {
    const subMap = new Map(subscriptions.map((s) => [String(s._id), s]));
    return (restaurants || [])
      .filter((r) => subMap.has(String(r._id)))
      .map((r) => {
        const sub = subMap.get(String(r._id));
        return {
          ...r,
          subscription: sub?.subscription || r.subscription,
          trialEndsAt: sub?.trialEndsAt || r.trialEndsAt,
          paidUntil: sub?.paidUntil || r.paidUntil,
          _daysLeft: sub?.daysLeft,
        } as IRestaurant & { _daysLeft?: number };
      });
  }, [restaurants, subscriptions]);

  // 2. Tìm kiếm cục bộ (Client-side Search) qua derived state — liên kết mượt mà với phân trang
  const filteredRestaurants = useMemo(() => {
    if (!ownerRestaurants) return [];
    let result = [...ownerRestaurants];

    // Lọc theo tên nhà hàng, địa chỉ hoặc số điện thoại
    if (searchTerm.trim() !== '') {
      const keyword = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.name?.toLowerCase().includes(keyword) ||
          item.address?.toLowerCase().includes(keyword) ||
          item.phone?.toLowerCase().includes(keyword),
      );
    }
    return result;
  }, [ownerRestaurants, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRestaurants.length / pageSize));

  // Trang hiện tại an toàn: nếu bộ lọc làm giảm số trang thì chặn lại trang cuối
  const safeCurrentPage = Math.min(currentPage, totalPages);

  // 3. Tính toán dữ liệu phân trang chuẩn xác từ mảng đã qua bộ lọc
  const paginatedData = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredRestaurants.slice(startIndex, startIndex + pageSize);
  }, [filteredRestaurants, safeCurrentPage]);

  // Cấu hình các cột hiển thị trong bảng dữ liệu nhà hàng
  const columns: ColumnDef<IRestaurant>[] = [
    {
      header: 'Restaurant Name',
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-semibold text-xs text-slate-900">{item.name}</span>
          <span className="text-xs text-slate-500 mt-0.5 max-w-[280px] truncate">
            {item.address}
          </span>
        </div>
      ),
    },
    {
      header: 'Subscription',
      render: (item) => {
        const sub = item as IRestaurant & { _daysLeft?: number };
        let hint: string | undefined;
        if (sub.subscription === 'trial' && typeof sub._daysLeft === 'number') {
          hint = `còn ${sub._daysLeft} ngày`;
        } else if (sub.subscription === 'active' && sub.paidUntil) {
          hint = `tới ${format(new Date(sub.paidUntil), 'dd/MM/yyyy')}`;
        }
        return <SubscriptionBadge subscription={sub.subscription} hint={hint} />;
      },
    },
    {
      header: 'Manager',
      render: (item) => {
        const manager = item.managerId;
        // Kiểm tra an toàn trước khi bóc tách thông tin Object liên kết
        if (manager && typeof manager === 'object' && 'name' in manager) {
          return (
            <span className="font-medium text-xs text-slate-700">{manager.name as string}</span>
          );
        }
        return <span className="text-slate-400 italic text-xs">Chưa cập nhật</span>;
      },
    },
    {
      header: 'Phone',
      render: (item) => (
        <span className="text-xs font-medium text-slate-600">{item.phone || '---'}</span>
      ),
    },
    {
      header: 'Staff Count',
      className: 'text-center text-xs font-medium text-slate-600',
      render: (item) => (
        <span className="text-xs font-medium text-slate-600">{item.staffCount ?? 0}</span>
      ),
    },
    {
      header: 'Status',
      render: (item) => <StatusTag status={item.status || 'Active'} />,
    },
    {
      header: 'Action',
      className: 'text-right',
      render: (item) => (
        <div className="flex justify-end gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-cerulean-blue-600 hover:bg-cerulean-blue-50 rounded-lg"
            title="Cài đặt chi nhánh"
            onClick={() => navigate(`/admin/settings?restaurant=${item._id}`)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          {item.subscription === 'locked' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-rose-600 hover:bg-rose-50 rounded-lg"
              title="Thanh toán mở lại"
              onClick={() => navigate('/admin/billing')}
            >
              <CreditCard className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-amber-600 hover:bg-slate-100 rounded-lg"
            onClick={() => {
              setEditingRestaurant(item);
              setIsDrawerOpen(true);
            }}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <AlertDialogCustom
            title="Xác nhận xóa"
            description={`Bạn có chắc muốn xóa nhà hàng "${item.name}" không? Hành động này không thể hoàn tác.`}
            actionText="Xóa"
            onConfirm={() => {
              deleteRestaurant(item._id);
            }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600 hover:bg-slate-100 rounded-lg"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogCustom>
        </div>
      ),
    },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8">
        {/* TOP HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cerulean-blue-600 text-white shadow-lg shadow-cerulean-blue-200">
              <Building2 className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-950">
                  Quản Lý Nhà Hàng
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-cerulean-blue-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-cerulean-blue-700">
                  <Store className="h-3 w-3" /> Chuỗi chi nhánh
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Danh sách chuỗi chi nhánh hệ thống nhà hàng toàn quốc
              </p>
            </div>
          </div>
        </div>

        {/* COMPONENT FILTER TOOLBAR ĐA NĂNG TÁI SỬ DỤNG */}
        <FilterToolbar
          rightActions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="text-slate-700 border-slate-200 bg-white hover:bg-slate-50 h-9 rounded-xl text-sm font-medium"
              >
                <Download className="mr-2 h-4 w-4 text-slate-500" /> Xuất file
              </Button>
              <Button
                className="bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white h-9 rounded-xl text-sm shadow-sm font-medium"
                onClick={() => {
                  // Chờ danh sách thuê bao tải xong để quyết định đúng nhánh (wizard / modal trả phí)
                  if (subscriptionsLoading) return;
                  // Chưa có nhà hàng nào → wizard tạo cơ sở đầu tiên (miễn phí trial 30 ngày)
                  if (subscriptions.length === 0) {
                    navigate('/onboarding');
                  } else {
                    // Đã có nhà hàng → modal trả phí mở cơ sở mới
                    setIsPayModalOpen(true);
                  }
                }}
              >
                Thêm nhà hàng <Plus className="ml-2 h-4 w-4" />
              </Button>
            </div>
          }
        >
          {/* Ô TÌM KIẾM CƠ BẢN */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm tên nhà hàng, số điện thoại, địa chỉ chi nhánh..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Quay về trang 1 khi gõ từ khóa mới
              }}
              className="w-full pl-10 pr-4 py-2 h-9 rounded-xl border border-slate-200 focus:outline-none focus:border-cerulean-blue-500 text-sm bg-slate-50/50"
            />
          </div>
        </FilterToolbar>

        {/* BẢNG HIỂN THỊ CHÍNH */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cerulean-blue-50 text-cerulean-blue-600">
              <Store className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Chi nhánh hệ thống</h2>
              <p className="text-xs text-slate-400">
                {filteredRestaurants.length} cơ sở · gói thuê và trạng thái vận hành
              </p>
            </div>
          </div>
          <DataTable
            columns={columns}
            data={paginatedData}
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            totalItems={filteredRestaurants.length}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            isLoading={isLoading}
            getRowKey={(item) => item._id}
          />
        </div>

        {/* SIDE DRAWER FORM */}
        <SideDrawer
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setEditingRestaurant(null);
          }}
          title={editingRestaurant ? 'Chỉnh sửa nhà hàng' : 'Thêm nhà hàng mới'}
          description="Điền thông tin bên dưới để cập nhật hệ thống chi nhánh."
          className="w-[90vw] !max-w-[600px]"
        >
          <FormCreateRestaurant
            initialData={editingRestaurant}
            onSuccess={() => {
              setIsDrawerOpen(false);
              setEditingRestaurant(null);
              fetchRestaurants();
            }}
          />
        </SideDrawer>

        {/* MODAL TRẢ PHÍ MỞ NHÀ HÀNG 2+ */}
        <PayForNewRestaurantModal
          open={isPayModalOpen}
          onOpenChange={setIsPayModalOpen}
          onSuccess={() => fetchRestaurants()}
        />
      </div>
    </div>
  );
}
