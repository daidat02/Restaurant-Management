import { useState, useEffect, useMemo } from 'react';
import { Search, Download, Plus, Eye, Edit2, Trash2 } from 'lucide-react';

import { useRestaurant } from '@/hooks/use-restaurant';
import type { IRestaurant } from '@/types/restaurant.type';

import { Button } from '@/components/ui/button';
import { DataTable, type ColumnDef } from '@/components/TableData';
import { StatusTag } from '@/components/StatusTag';
import SideDrawer from '@/components/SideDrawer';
import { AlertDialogCustom } from '@/components/AlertDialog';
import { FilterToolbar } from '../OrderPage/management-order';
import FormCreateRestaurant from './components/FormCreateRestaurant';

export default function RestaurantsPage() {
  const { fetchRestaurants, restaurants, isLoading, deleteRestaurant } = useRestaurant();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<IRestaurant | null>(null);

  // Các State quản lý bộ lọc & tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');

  // State quản lý phân trang & dữ liệu hiển thị cục bộ
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [filteredRestaurants, setFilteredRestaurants] = useState<IRestaurant[]>([]);

  // 1. Lấy dữ liệu từ API khi component mount
  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  // 2. Xử lý Tìm kiếm cục bộ (Client-side Search) liên kết mượt mà với phân trang
  useEffect(() => {
    if (!restaurants) {
      setFilteredRestaurants([]);
      return;
    }

    let result = [...restaurants];

    // Tiến hành lọc theo tên nhà hàng hoặc địa chỉ, số điện thoại
    if (searchTerm.trim() !== '') {
      const keyword = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.name?.toLowerCase().includes(keyword) ||
          item.address?.toLowerCase().includes(keyword) ||
          item.phone?.toLowerCase().includes(keyword),
      );
    }

    setFilteredRestaurants(result);
    setCurrentPage(1); // Quay về trang 1 khi gõ từ khóa mới
  }, [restaurants, searchTerm]);

  // 3. Tính toán dữ liệu phân trang chuẩn xác từ mảng đã qua bộ lọc "filteredRestaurants"
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRestaurants.slice(startIndex, startIndex + pageSize);
  }, [filteredRestaurants, currentPage]);

  const totalPages = Math.ceil(filteredRestaurants.length / pageSize) || 1;

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
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-950">
              Quản Lý Nhà Hàng
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Danh sách chuỗi chi nhánh hệ thống nhà hàng toàn quốc
            </p>
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
                  setEditingRestaurant(null);
                  setIsDrawerOpen(true);
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
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 h-9 rounded-xl border border-slate-200 focus:outline-none focus:border-cerulean-blue-500 text-sm bg-slate-50/50"
            />
          </div>
        </FilterToolbar>

        {/* BẢNG HIỂN THỊ CHÍNH */}
        <DataTable
          columns={columns}
          data={paginatedData}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredRestaurants.length}
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
      </div>
    </div>
  );
}
