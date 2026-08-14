import { useEffect, useMemo, useState } from 'react';
import { Search, Download, Plus, ChevronRight, Users, UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Import hook và type của User
import { useUser } from '@/hooks/use-user';
import { type IUser } from '@/types/user.type';

import { Button } from '@/components/ui/button';
import { DataTable, type ColumnDef } from '@/components/TableData';
import { StatusTag } from '@/components/StatusTag';
import { useAuth } from '@/hooks/use-auth';
import { useActiveRestaurantId } from '@/hooks/use-active-restaurant';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRestaurant } from '@/hooks/use-restaurant';
import { FilterToolbar } from '../OrderPage/management-order';
import { getTimeAgo } from '@/utils/helpers';

/** Avatar chữ cái đầu của tên (giống SuperAdmin Dashboard). */
function NameAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cerulean-blue-50 text-sm font-bold text-cerulean-blue-600">
      {initial}
    </span>
  );
}

/** Badge tên nhà hàng từ map. */
function RestaurantBadge({
  restaurantIds,
  restaurantNameMap,
}: {
  restaurantIds?: (string | { _id: string; name: string })[];
  restaurantNameMap: Record<string, string>;
}) {
  if (!restaurantIds || restaurantIds.length === 0) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  // Lấy nhà hàng đầu tiên (primary)
  const first = restaurantIds[0];
  const rid = typeof first === 'string' ? first : first._id;
  // Ưu tiên tên đã populate từ server; fallback map (fetch nhà hàng riêng)
  const name = (typeof first === 'object' && first.name) || restaurantNameMap[rid];
  if (!name) return <span className="text-xs text-slate-400">—</span>;
  return (
    <span className="inline-flex min-w-6 items-center justify-center rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
      {name}
    </span>
  );
}

export default function UsersPage() {
  const navigate = useNavigate();
  const { users, isLoading, fetchUsersWithFilter } = useUser();
  const { user } = useAuth();
  const activeRestaurantId = useActiveRestaurantId();
  const { restaurants, fetchRestaurants } = useRestaurant();

  // State quản lý bộ lọc & tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('all');

  // State quản lý phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Map restaurantId -> tên nhà hàng (cho admin hiển thị badge)
  const restaurantNameMap = useMemo(
    () => Object.fromEntries(restaurants.map((r) => [r._id, r.name])),
    [restaurants],
  );

  // Hàm helper dùng chung để bóc tách/chuẩn bị tham số Filter hiện tại trước khi gọi API
  const getCurrentFilterParams = () => {
    let rolesToFetch: string[] = [];
    let restaurantId: string | undefined = undefined;

    if (!user?.role) return { rolesToFetch, restaurantId };

    if (user.role === 'manager') {
      rolesToFetch = ['staff', 'manager'];
      restaurantId = activeRestaurantId;
    } else if (user.role === 'admin') {
      rolesToFetch = ['manager', 'admin'];
      restaurantId = selectedRestaurantId !== 'all' ? selectedRestaurantId : undefined;
    }

    return { rolesToFetch, restaurantId };
  };

  // 1. Tự động fetch dữ liệu khi đổi Nhà hàng (admin)
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchRestaurants();
    }
    const { rolesToFetch, restaurantId } = getCurrentFilterParams();

    if (rolesToFetch.length > 0) {
      fetchUsersWithFilter(rolesToFetch, restaurantId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRestaurantId, user, fetchUsersWithFilter]);

  // 2. Lọc + phân trang dựa trên dữ liệu đã fetch (derived state)
  const filteredUsers = useMemo(() => {
    const currentRawData = users;
    if (!currentRawData) return [];

    let result = [...currentRawData];

    if (searchTerm.trim() !== '') {
      const keyword = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.name?.toLowerCase().includes(keyword) ||
          item.email?.toLowerCase().includes(keyword) ||
          item.phone?.toLowerCase().includes(keyword),
      );
    }

    return result;
  }, [users, searchTerm]);

  // 3. Tính toán dữ liệu phân trang
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;

  // Navigate to form page
  const handleCreateNew = () => {
    navigate(user?.role === 'admin' ? '/admin/customers/new' : '/manager/staff/new');
  };

  const handleEdit = (id: string) => {
    navigate(user?.role === 'admin' ? `/admin/customers/edit/${id}` : `/manager/staff/edit/${id}`);
  };

  // Cấu hình các cột hiển thị trong bảng dữ liệu người dùng (style "Người thuê gần đây")
  const columns: ColumnDef<IUser>[] = [
    {
      header: 'Người dùng',
      className: 'min-w-[260px]',
      render: (item) => (
        <div className="flex items-center gap-3">
          <NameAvatar name={item.name} />
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-xs text-slate-900 truncate max-w-[200px]">
              {item.name}
            </span>
            <span className="mt-0.5 block max-w-[240px] truncate text-xs text-slate-500">
              {item.email}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'SĐT',
      className: 'hidden md:table-cell',
      render: (item) => (
        <span className="text-xs font-medium text-slate-600">{item.phone || '---'}</span>
      ),
    },
    {
      header: 'Vai trò',
      className: 'w-[120px]',
      render: (item) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold tracking-wider ${
            item.role === 'admin'
              ? 'bg-purple-50 text-purple-600 border border-purple-100'
              : item.role === 'manager'
                ? 'bg-amber-50 text-amber-600 border border-amber-100'
                : item.role === 'staff'
                  ? 'bg-cerulean-blue-50 text-cerulean-blue-600 border border-cerulean-blue-100'
                  : 'bg-slate-50 text-slate-600 border border-slate-100'
          }`}
        >
          {item.role === 'admin'
            ? 'Chủ chuỗi'
            : item.role === 'manager'
              ? 'Quản lý'
              : item.role === 'staff'
                ? 'Nhân viên'
                : item.role === 'super-admin'
                  ? 'Quản trị'
                  : 'Khách hàng'}
        </span>
      ),
    },
    {
      header: 'Trạng thái',
      className: 'w-[110px]',
      render: (item) => <StatusTag status={item?.isActive ? 'Active' : 'Inactive'} />,
    },
    {
      header: 'Nhà hàng',
      className: 'hidden lg:table-cell',
      render: (item) => (
        <RestaurantBadge restaurantIds={item.restaurantIds} restaurantNameMap={restaurantNameMap} />
      ),
    },
    {
      header: 'Ngày tạo',
      className: 'w-[130px] hidden sm:table-cell',
      render: (item) => (
        <span className="text-xs text-slate-500">
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '---'}
        </span>
      ),
    },
    {
      header: 'Đăng nhập gần',
      className: 'w-[140px] hidden md:table-cell',
      render: (item) => (
        <span className="text-xs text-slate-500">
          {item.lastLoginAt ? getTimeAgo(item.lastLoginAt) : 'Chưa bao giờ'}
        </span>
      ),
    },
    {
      header: 'Mở',
      className: 'w-[70px] text-right',
      render: (item) => (
        <button
          type="button"
          onClick={() => handleEdit(item._id)}
          aria-label={`Mở tài khoản ${item.name}`}
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-cerulean-blue-50 hover:text-cerulean-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cerulean-blue-500/40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
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
              <Users className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-950">
                  Quản Lý Người Dùng
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-cerulean-blue-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-cerulean-blue-700">
                  <UserCog className="h-3 w-3" />{' '}
                  {user?.role === 'admin' ? 'Manager chi nhánh' : 'Nhân viên'}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {user?.role === 'admin'
                  ? 'Quản lý các tài khoản quản lý chi nhánh trong chuỗi.'
                  : 'Quản lý phân quyền tài khoản nhân viên trong chi nhánh.'}
              </p>
            </div>
          </div>
        </div>

        {/* COMPONENT FILTER TOOLBAR ĐA NĂNG TÁI SỬ DỤNG */}
        <FilterToolbar
          rightActions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className="text-slate-700 border-slate-200 bg-white hover:bg-slate-50 h-9 rounded-xl text-sm"
              >
                <Download className="mr-2 h-4 w-4 text-slate-500" /> Xuất file
              </Button>

              <Button
                className="bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white h-9 rounded-xl text-sm shadow-sm font-medium"
                onClick={handleCreateNew}
              >
                Thêm nhân viên <Plus className="ml-2 h-4 w-4" />
              </Button>
            </div>
          }
        >
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Ô TÌM KIẾM */}
            <div className="relative flex-1 min-w-[240px]">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Tìm kiếm tên, email, sđt nhân viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 h-9 rounded-xl border border-slate-200 focus:outline-none focus:border-cerulean-blue-500 text-sm bg-slate-50/50"
              />
            </div>

            {/* Ô CHỌN NHÀ HÀNG CHO ADMIN */}
            {user?.role === 'admin' && (
              <div className="min-w-[180px]">
                <Select value={selectedRestaurantId} onValueChange={setSelectedRestaurantId}>
                  <SelectTrigger className="h-9 rounded-xl border-slate-200 bg-white text-xs text-slate-700 focus:ring-1 focus:ring-cerulean-blue-500">
                    <SelectValue placeholder="Chọn nhà hàng" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg border-slate-100">
                    <SelectItem key="all" value="all" className="text-xs rounded-lg">
                      Tất cả nhà hàng
                    </SelectItem>
                    {restaurants.map((res) => (
                      <SelectItem key={res._id} value={res._id} className="text-xs rounded-lg">
                        {res.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </FilterToolbar>

        {/* BẢNG HIỂN THỊ CHÍNH */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cerulean-blue-50 text-cerulean-blue-600">
              <Users className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Danh sách tài khoản</h2>
              <p className="text-xs text-slate-400">
                {filteredUsers.length} tài khoản · phân quyền theo chi nhánh
              </p>
            </div>
          </div>
          <DataTable
            columns={columns}
            data={paginatedData}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredUsers.length}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onRowClick={(item) => handleEdit(item._id)}
            isLoading={isLoading}
            getRowKey={(item) => item._id}
            striped
          />
        </div>
      </div>
    </div>
  );
}
