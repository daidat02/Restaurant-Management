import { useEffect, useMemo, useState } from 'react';
import { Search, Building2 } from 'lucide-react';

import { useUser } from '@/hooks/use-user';
import { useRestaurant } from '@/hooks/use-restaurant';
import { type IUser } from '@/types/user.type';

import { DataTable, type ColumnDef } from '@/components/TableData';
import { StatusTag } from '@/components/StatusTag';
import { FilterToolbar } from '../Admin/OrderPage/management-order';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TENANT_ROLES = ['admin', 'manager', 'staff'];

export default function SuperAdminTenants() {
  const { users, isLoading, fetchUsersWithFilter } = useUser();
  const { restaurants, fetchRestaurants } = useRestaurant();

  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [filteredUsers, setFilteredUsers] = useState<IUser[]>([]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  // Fetch tài khoản người thuê khi chọn nhà hàng (super-admin: truyền thẳng restaurantId vào query)
  useEffect(() => {
    fetchUsersWithFilter(
      TENANT_ROLES,
      selectedRestaurantId !== 'all' ? selectedRestaurantId : undefined,
    );
  }, [selectedRestaurantId, fetchUsersWithFilter]);

  useEffect(() => {
    if (!users) {
      setFilteredUsers([]);
      return;
    }

    let result = [...users];

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
  }, [users, searchTerm]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;

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
              : item.role === 'manager'
                ? 'bg-amber-50 text-amber-600 border border-amber-100'
                : 'bg-cerulean-blue-50 text-cerulean-blue-600 border border-cerulean-blue-100'
          }`}
        >
          {item.role?.toUpperCase() || 'CUSTOMER'}
        </span>
      ),
    },
    {
      header: 'Nhà hàng trực thuộc',
      render: (item) => (
        <span className="text-xs font-medium text-slate-600">
          {item.restaurantIds?.length ?? 0} nhà hàng
        </span>
      ),
    },
    {
      header: 'Status',
      render: (item) => <StatusTag status={item?.isActive ? 'active' : 'inactive'} />,
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
              Xem tài khoản admin / quản lý / nhân viên theo từng nhà hàng
            </p>
          </div>
        </div>

        <FilterToolbar>
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm tên, email, số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 h-9 rounded-xl border border-slate-200 focus:outline-none focus:border-cerulean-blue-500 text-sm bg-slate-50/50"
            />
          </div>

          <div className="min-w-[220px]">
            <Select value={selectedRestaurantId} onValueChange={setSelectedRestaurantId}>
              <SelectTrigger className="h-9 rounded-xl border-slate-200 bg-white text-xs text-slate-700 focus:ring-1 focus:ring-cerulean-blue-500">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <SelectValue placeholder="Chọn nhà hàng" />
                </div>
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
        </FilterToolbar>

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
      </div>
    </div>
  );
}
