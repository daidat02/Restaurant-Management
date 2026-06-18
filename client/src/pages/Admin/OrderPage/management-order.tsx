import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ListFilter, Download, Eye, Edit2, ChevronRight } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { useOrder } from '@/hooks/use-order';
import { extractId } from '@/utils/helpers';
import type { IOrder } from '@/types/order.type';

import { Button } from '@/components/ui/button';
import { DataTable, type ColumnDef } from '@/components/TableData';
import { StatusTag } from '@/components/StatusTag';
import { CustomSelect } from '@/components/SelectCustom';
import { CustomDatePicker } from '@/components/DatePickerCustom';

const translateOrderType = (type: string) => {
  switch (type) {
    case 'dine-in':
      return 'Tại bàn';
    case 'delivery':
      return 'Giao hàng';
    case 'to-go':
      return 'Mang đi';
    default:
      return type;
  }
};

export default function OrderManagement() {
  const { user } = useAuth();
  const currentRole = user?.role || 'staff';
  const navigate = useNavigate();

  const { orders, isLoading, fetchOrdersByRestaurant, fetchOrdersByStatus } = useOrder();

  // Các State quản lý bộ lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState('');

  // State phân trang & dữ liệu hiển thị
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [ordersData, setOrdersData] = useState<IOrder[]>([]);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0], // Trả về định dạng chuẩn HTML: "YYYY-MM-DD"
  );

  // 🌟 Cấu hình danh sách các option loại đơn hàng phù hợp với CustomSelect
  const orderTypeOptions = useMemo(
    () => [
      { value: '', label: 'Tất cả loại đơn' },
      { value: 'dine-in', label: 'Tại bàn' },
      { value: 'delivery', label: 'Giao hàng' },
      { value: 'to-go', label: 'Mang đi' },
    ],
    [],
  );

  // 1. API Fetching
  useEffect(() => {
    if (user?.restaurant) {
      const restaurantId = extractId(user.restaurant, '_id');
      if (activeTab === 'all') {
        fetchOrdersByRestaurant(restaurantId, '');
      } else {
        if (fetchOrdersByStatus) {
          fetchOrdersByStatus(restaurantId, activeTab);
        } else {
          fetchOrdersByRestaurant(restaurantId, activeTab);
        }
      }
    }
    setCurrentPage(1);
    setSortDirection(null);
  }, [user, activeTab]);

  // 2. Client-side Search, Filter & Sort logic kết hợp liên hoàn
  useEffect(() => {
    if (!orders) return;

    let result = [...orders];

    // Tiến hành lọc theo từ khóa tìm kiếm (Mã đơn hàng)
    if (searchTerm.trim() !== '') {
      result = result.filter((order) => {
        const orderIdStr = order.orderId || order._id || '';
        return orderIdStr.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Tiến hành lọc theo Loại đơn hàng (Dine-in, Delivery, To-go)
    if (orderTypeFilter !== '') {
      result = result.filter((order) => order.orderType === orderTypeFilter);
    }

    setOrdersData(result);
    setCurrentPage(1);
  }, [orders, searchTerm, orderTypeFilter]);

  // 3. Phân trang dữ liệu
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return ordersData.slice(startIndex, startIndex + pageSize);
  }, [ordersData, currentPage]);

  const totalPages = Math.ceil(ordersData.length / pageSize) || 1;

  // Định nghĩa các cột hiển thị trong bảng dữ liệu
  const columns: ColumnDef<IOrder>[] = [
    {
      header: 'Mã Đơn Hàng',
      render: (order) => (
        <span
          onClick={() => {
            navigate(`/${currentRole}/orders/edit/${order._id}`, {
              state: { orderData: order },
            });
          }}
          className="text-xs text-cerulean-blue-600 font-mono font-medium hover:underline cursor-pointer"
        >
          #{order.orderId || order._id?.substring(0, 6).toUpperCase()}
        </span>
      ),
      sortable: true,
      currentSortDirection: sortDirection,
      onSortChange: (direction) => {
        setSortDirection(direction);
        if (!direction) {
          setOrderTypeFilter(orderTypeFilter);
          return;
        }
        const sorted = [...ordersData].sort((a, b) => {
          const idA = a.orderId || a._id || '';
          const idB = b.orderId || b._id || '';
          return direction === 'asc' ? idA.localeCompare(idB) : idB.localeCompare(idA);
        });
        setOrdersData(sorted);
      },
    },
    {
      header: 'Loại đơn',
      render: (order) => (
        <div className="text-xs flex flex-col">
          <span className="font-medium text-slate-800">
            {translateOrderType(order.orderType as string)}
          </span>
          <span className="text-xs text-slate-500 mt-0.5">
            {order.orderType === 'dine-in' && order.table
              ? `Bàn: ${(order.table as any)?.tableNumber || 'N/A'}`
              : order.deliveryInfo?.name || 'Khách lẻ'}
          </span>
        </div>
      ),
    },
    {
      header: 'TỔNG TIỀN',
      render: (order) => (
        <span className="font-semibold text-slate-900">
          {order.totalAmount?.toLocaleString('vi-VN')} đ
        </span>
      ),
      sortable: true,
      currentSortDirection: sortDirection,
      onSortChange: (direction) => {
        setSortDirection(direction);
        if (!direction) {
          const resetOrders = [...orders].filter(
            (o) =>
              (searchTerm === '' ||
                (o.orderId || o._id || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
              (orderTypeFilter === '' || o.orderType === orderTypeFilter),
          );
          setOrdersData(resetOrders);
          return;
        }
        const sorted = [...ordersData].sort((a, b) => {
          const priceA = a.totalAmount || 0;
          const priceB = b.totalAmount || 0;
          return direction === 'asc' ? priceA - priceB : priceB - priceA;
        });
        setOrdersData(sorted);
      },
    },
    {
      header: 'Trạng thái đơn',
      render: (order) => <StatusTag status={order.status || ''} />,
    },
    {
      header: 'Thanh toán',
      render: (order) => <StatusTag status={order.paymentStatus || ''} />,
    },
    {
      header: 'Thời gian tạo',
      render: (order) => (
        <span className="text-sm text-slate-600">
          {new Date(order.createdAt || '').toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      header: 'Hành động',
      className: 'text-right',
      render: (order) => (
        <div className="flex justify-end gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:bg-slate-100 rounded-lg"
            onClick={() => {
              navigate(`/${currentRole}/orders/edit/${order._id}`, {
                state: { orderData: order },
              });
            }}
          >
            <ChevronRight size={18} />
          </Button>
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
              Quản Lý Đơn Hàng
            </h1>
            <p className="text-sm text-slate-500 mt-1">Hệ thống theo dõi và xử lý hóa đơn</p>
          </div>
        </div>

        {/* COMPONENT FILTER TOOLBAR ĐA NĂNG */}
        <FilterToolbar
          rightActions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="text-slate-700 border-slate-200 bg-white hover:bg-slate-50 h-9 rounded-xl text-sm"
              >
                <ListFilter className="mr-2 h-4 w-4 text-slate-500" /> Lọc nâng cao
              </Button>
              <Button
                variant="outline"
                className="text-slate-700 border-slate-200 bg-white hover:bg-slate-50 h-9 rounded-xl text-sm"
              >
                <Download className="mr-2 h-4 w-4 text-slate-500" /> Xuất file
              </Button>
            </div>
          }
        >
          {/* Ô TÌM KIẾM */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm mã đơn hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 h-9 rounded-xl border border-slate-200 focus:outline-none focus:border-cerulean-blue-500 text-sm bg-slate-50/50"
            />
          </div>

          {/* 🌟 Ô CHỌN LOẠI ĐƠN HÀNG CUSTOM */}
          <CustomSelect
            options={orderTypeOptions}
            value={orderTypeFilter}
            onChange={(val: any) => setOrderTypeFilter(val)}
          />
          <CustomDatePicker value={selectedDate} onChange={(val: any) => setSelectedDate(val)} />
        </FilterToolbar>

        {/* BẢNG HIỂN THỊ CHÍNH */}
        <DataTable
          columns={columns}
          data={paginatedData}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={ordersData.length}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          isLoading={isLoading}
          getRowKey={(order) => (order._id ?? order.orderId ?? '') as string | number}
        />
      </div>
    </div>
  );
}

interface FilterToolbarProps {
  children: React.ReactNode;
  rightActions?: React.ReactNode;
}

export function FilterToolbar({ children, rightActions }: FilterToolbarProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 mb-6 shadow-sm flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      {/* Cụm bộ lọc chính bên trái */}
      <div className="flex flex-1 flex-col sm:flex-row flex-wrap gap-3">{children}</div>

      {/* Cụm hành động phụ bên phải */}
      {rightActions && (
        <div className="flex items-center gap-2 self-start lg:self-auto">{rightActions}</div>
      )}
    </div>
  );
}
