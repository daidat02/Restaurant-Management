import { useEffect, useMemo, useState } from 'react';
import { Search, Lock, Unlock } from 'lucide-react';

import { useRestaurant } from '@/hooks/use-restaurant';
import type { IRestaurant } from '@/types/restaurant.type';

import { Button } from '@/components/ui/button';
import { DataTable, type ColumnDef } from '@/components/TableData';
import { StatusTag } from '@/components/StatusTag';
import { AlertDialogCustom } from '@/components/AlertDialog';
import { FilterToolbar } from '../Admin/OrderPage/management-order';

export default function SuperAdminRestaurants() {
  const { fetchRestaurants, restaurants, isLoading, updateRestaurantStatus } =
    useRestaurant();

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [filteredRestaurants, setFilteredRestaurants] = useState<IRestaurant[]>([]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  useEffect(() => {
    if (!restaurants) {
      setFilteredRestaurants([]);
      return;
    }

    let result = [...restaurants];

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
    setCurrentPage(1);
  }, [restaurants, searchTerm]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRestaurants.slice(startIndex, startIndex + pageSize);
  }, [filteredRestaurants, currentPage]);

  const totalPages = Math.ceil(filteredRestaurants.length / pageSize) || 1;

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
      header: 'Email',
      render: (item) => (
        <span className="text-xs font-medium text-slate-600">{item.email || '---'}</span>
      ),
    },
    {
      header: 'Manager',
      render: (item) => {
        const manager = item.managerId;
        if (manager && typeof manager === 'object' && 'name' in manager) {
          return <span className="font-medium text-xs text-slate-700">{manager.name as string}</span>;
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
      header: 'Status',
      render: (item) => <StatusTag status={item.status || 'active'} />,
    },
    {
      header: 'Action',
      className: 'text-right',
      render: (item) => {
        const isInactive = item.status === 'inactive';
        return (
          <div className="flex justify-end gap-1.5">
            <AlertDialogCustom
              title={isInactive ? 'Xác nhận mở khóa' : 'Xác nhận khóa nhà hàng'}
              description={
                isInactive
                  ? `Mở khóa "${item.name}" — admin/manager/staff của nhà hàng sẽ hoạt động trở lại.`
                  : `Khóa "${item.name}" — admin/manager/staff của nhà hàng sẽ không thể thao tác cho tới khi mở khóa.`
              }
              actionText={isInactive ? 'Mở khóa' : 'Khóa'}
              onConfirm={() => {
                updateRestaurantStatus(item._id, isInactive ? 'active' : 'inactive');
              }}
            >
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 rounded-lg hover:bg-slate-100 ${
                  isInactive ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {isInactive ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
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
              Quản Lý Nhà Hàng
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Khóa / mở nhà hàng để tạm dừng toàn bộ hoạt động của chi nhánh trên nền tảng
            </p>
          </div>
        </div>

        <FilterToolbar>
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
      </div>
    </div>
  );
}
