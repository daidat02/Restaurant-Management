import { useEffect, useMemo, useState } from 'react';
import { Search, Download, Plus, Edit2, Trash2, Eye, Users, UserRoundCheck } from 'lucide-react';

// Import hook và type của User
import { useUser } from '@/hooks/use-user';
import { type IUser } from '@/types/user.type';

import { Button } from '@/components/ui/button';
import { DataTable, type ColumnDef } from '@/components/TableData';
import { StatusTag } from '@/components/StatusTag';
import SideDrawer from '@/components/SideDrawer';
import { AlertDialogCustom } from '@/components/AlertDialog';
import { useAuth } from '@/hooks/use-auth';
import { extractId } from '@/utils/helpers';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRestaurant } from '@/hooks/use-restaurant';
import { FilterToolbar } from '../OrderPage/management-order';
import FormUser from './components/FormCreateUser';

export default function UsersPage() {
  // 🌟 ĐÃ LOẠI BỎ: fetchCustomer và fetchStaff khỏi Hook hook useUser
  const { users, isLoading, fetchUsersWithFilter, removeUser } = useUser();
  const { user } = useAuth();
  const { restaurants, fetchRestaurants } = useRestaurant();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<IUser | null>(null);

  // State quản lý bộ lọc & tìm kiếm
  const [activeTab, setActiveTab] = useState<'staff' | 'customer'>('staff');
  const [searchTerm, setSearchTerm] = useState('');

  // State quản lý bộ lọc nhà hàng cho Admin
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('all');

  // Hàm helper dùng chung để bóc tách/chuẩn bị tham số Filter hiện tại trước khi gọi API
  const getCurrentFilterParams = () => {
    let rolesToFetch: string[] = [];
    let restaurantId: string | undefined = undefined;

    if (!user?.role) return { rolesToFetch, restaurantId };

    const managerRestaurantId = extractId(user.restaurant);

    if (user.role === 'manager') {
      if (activeTab === 'staff') {
        rolesToFetch = ['staff', 'manager'];
        restaurantId = managerRestaurantId;
      } else if (activeTab === 'customer') {
        rolesToFetch = ['customer'];
      }
    } else if (user.role === 'admin') {
      if (activeTab === 'staff') {
        rolesToFetch = ['manager', 'admin'];
        restaurantId = selectedRestaurantId !== 'all' ? selectedRestaurantId : undefined;
      } else if (activeTab === 'customer') {
        rolesToFetch = ['customer'];
      }
    }

    return { rolesToFetch, restaurantId };
  };

  // 1. Tự động fetch dữ liệu khi đổi Tab hoặc đổi Nhà hàng
  useEffect(() => {
    if (user?.role == 'admin') {
      fetchRestaurants();
    }
    const { rolesToFetch, restaurantId } = getCurrentFilterParams();

    console.log(rolesToFetch);
    if (rolesToFetch.length > 0) {
      fetchUsersWithFilter(rolesToFetch, restaurantId);
    }

    setSearchTerm(''); // Reset từ khóa tìm kiếm khi đổi tab
  }, [activeTab, selectedRestaurantId, user, fetchUsersWithFilter]);

  // 2. Xử lý Tìm kiếm cục bộ (Client-side Search)
  useEffect(() => {
    const currentRawData = users;
    if (!currentRawData) return;

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

    setFilteredUsers(result);
    setCurrentPage(1);
  }, [users, activeTab, searchTerm]);

  // State quản lý phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [filteredUsers, setFilteredUsers] = useState<IUser[]>([]);

  // 3. Tính toán dữ liệu phân trang
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;

  // Cấu hình các cột hiển thị trong bảng dữ liệu người dùng
  const columns: ColumnDef<IUser>[] = [
    {
      header: 'User Info',
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-semibold text-xs text-slate-900">{item.name}</span>
          <span className="text-xs text-slate-500 mt-0.5">{item.email}</span>
        </div>
      ),
    },
    {
      header: 'Phone',
      render: (item) => (
        <span className="text-xs font-medium text-slate-600">{item.phone || '---'}</span>
      ),
    },
    {
      header: 'Role',
      render: (item) => (
        <span
          className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold tracking-wider ${
            item.role === 'admin'
              ? 'bg-purple-50 text-purple-600 border border-purple-100'
              : item.role === 'staff'
                ? 'bg-cerulean-blue-50 text-cerulean-blue-600 border border-cerulean-blue-100'
                : 'bg-slate-50 text-slate-600 border border-slate-100'
          }`}
        >
          {item.role ? item.role.toUpperCase() : 'CUSTOMER'}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (item) => <StatusTag status={item?.isActive ? 'Active' : 'Inactive'} />,
    },
    {
      header: 'Action',
      className: 'text-right',
      render: (item) => (
        <div className="flex justify-end gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-blue-600 hover:bg-slate-100 rounded-lg"
            onClick={() => {
              setEditingUser(item);
              setIsDrawerOpen(true);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-amber-600 hover:bg-slate-100 rounded-lg"
            onClick={() => {
              setEditingUser(item);
              setIsDrawerOpen(true);
            }}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <AlertDialogCustom
            title="Xác nhận xóa"
            description={`Bạn có chắc muốn xóa người dùng "${item.name}" không? Hành động này không thể hoàn tác.`}
            actionText="Xóa"
            onConfirm={() => {
              removeUser(item._id);
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
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-950">
              Quản Lý Người Dùng
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Quản lý phân quyền tài khoản thành viên hệ thống tài khoản{' '}
              {activeTab === 'staff' ? 'nhân viên' : 'khách hàng'}
            </p>
          </div>
        </div>

        {/* COMPONENT FILTER TOOLBAR ĐA NĂNG TÁI SỬ DỤNG */}
        <FilterToolbar
          rightActions={
            <div className="flex flex-wrap items-center gap-2">
              {/* ĐIỀU HƯỚNG TAB */}
              <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl border border-slate-200/30">
                <button
                  onClick={() => setActiveTab('staff')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'staff'
                      ? 'bg-white text-cerulean-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserRoundCheck size={14} /> Nhân viên
                </button>
                <button
                  onClick={() => setActiveTab('customer')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'customer'
                      ? 'bg-white text-cerulean-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users size={14} /> Khách hàng
                </button>
              </div>

              <Button
                variant="outline"
                className="text-slate-700 border-slate-200 bg-white hover:bg-slate-50 h-9 rounded-xl text-sm"
              >
                <Download className="mr-2 h-4 w-4 text-slate-500" /> Xuất file
              </Button>

              <Button
                className="bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white h-9 rounded-xl text-sm shadow-sm font-medium"
                onClick={() => {
                  setEditingUser(null);
                  setIsDrawerOpen(true);
                }}
              >
                Thêm {activeTab === 'staff' ? 'nhân viên' : 'khách hàng'}{' '}
                <Plus className="ml-2 h-4 w-4" />
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
                placeholder={`Tìm kiếm tên, email, sđt ${activeTab === 'staff' ? 'nhân viên' : 'khách hàng'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 h-9 rounded-xl border border-slate-200 focus:outline-none focus:border-cerulean-blue-500 text-sm bg-slate-50/50"
              />
            </div>

            {/* Ô CHỌN NHÀ HÀNG CHO ADMIN */}
            {user?.role === 'admin' && activeTab === 'staff' && (
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
        <DataTable
          columns={columns}
          data={paginatedData}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredUsers.length}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          isLoading={isLoading}
          getRowKey={(item) => item._id}
        />

        {/* SIDE DRAWER FORM */}
        <SideDrawer
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setEditingUser(null);
          }}
          title={
            editingUser
              ? 'Chỉnh sửa thông tin'
              : `Thêm ${activeTab === 'staff' ? 'nhân viên' : 'khách hàng'} mới`
          }
          description="Điền thông tin bên dưới để lưu vào hệ thống."
          className="w-[90vw] !max-w-[600px]"
        >
          <FormUser
            initialData={editingUser}
            userType={activeTab}
            onSuccess={() => {
              setIsDrawerOpen(false);
              setEditingUser(null);

              // 🌟 ĐÃ CẬP NHẬT: Tự động chạy lại hàm gộp tổng lực để cập nhật dữ liệu mới sau khi tạo/sửa thành công
              const { rolesToFetch, restaurantId } = getCurrentFilterParams();
              if (rolesToFetch.length > 0) {
                fetchUsersWithFilter(rolesToFetch, restaurantId);
              }
            }}
          />
        </SideDrawer>
      </div>
    </div>
  );
}
