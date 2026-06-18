import { useState, useEffect, useMemo } from 'react';
import { Search, ListFilter, Download, Plus, Eye, Edit2, ChevronRight } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { useMenu } from '@/hooks/use-menu';
import { extractId } from '@/utils/helpers';
import type { IMenuItem } from '@/types/category.type';

import { Button } from '@/components/ui/button';
import { DataTable, type ColumnDef } from '@/components/TableData';
import { StatusTag } from '@/components/StatusTag';
import { Switch } from '@/components/ui/switch';
import { useNavigate } from 'react-router-dom';
import { CustomSelect } from '@/components/SelectCustom';
import { FilterToolbar } from '../OrderPage/management-order';

export default function ProductsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    items,
    isLoading,
    categories,
    fetchItemsByCat,
    toggleAvailability,
    fetchCategories,
    fetchAllItems,
  } = useMenu();

  // Các State quản lý bộ lọc & tìm kiếm
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // State quản lý phân trang & dữ liệu hiển thị cục bộ
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [filteredItems, setFilteredItems] = useState<IMenuItem[]>([]);

  // Tổng số lượng món ăn của tất cả danh mục cộng lại
  const totalFoodCount = useMemo(() => {
    return categories?.reduce((total, cat) => total + (cat?.foodCount || 0), 0) || 0;
  }, [categories]);

  // 🌟 Định dạng danh sách options cho Danh Mục phù hợp với CustomSelect
  const categoryOptions = useMemo(() => {
    const allOption = { value: 'all', label: `Tất cả (${totalFoodCount})` };
    const listOptions =
      categories?.map((cat) => ({
        value: cat._id,
        label: `${cat.name} (${cat?.foodCount || 0})`,
      })) || [];
    return [allOption, ...listOptions];
  }, [categories, totalFoodCount]);

  // 🌟 Định dạng danh sách options cho Trạng Thái
  const statusOptions = useMemo(
    () => [
      { value: '', label: 'Tất cả trạng thái' },
      { value: 'active', label: 'Còn hàng (Active)' },
      { value: 'inactive', label: 'Hết hàng (Inactive)' },
    ],
    [],
  );

  // 1. Lấy danh sách danh mục (Categories) khi component mount
  useEffect(() => {
    if (user?.restaurant) {
      fetchCategories(extractId(user.restaurant));
    }
  }, [user, fetchCategories]);

  // 2. Gọi API lấy danh sách món ăn khi đổi danh mục qua ô select
  useEffect(() => {
    if (user?.restaurant) {
      const restaurantId = extractId(user.restaurant);
      if (activeCategory === 'all') {
        fetchAllItems(restaurantId);
      } else {
        fetchItemsByCat(activeCategory);
      }
    }
    setCurrentPage(1);
  }, [user, activeCategory, fetchAllItems, fetchItemsByCat]);

  // 3. Xử lý Lọc & Tìm kiếm cục bộ (Client-side Search & Filter)
  useEffect(() => {
    if (!items) return;

    let result = [...items];

    // Tiến hành lọc theo tên món ăn hoặc mô tả
    if (searchTerm.trim() !== '') {
      const keyword = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.name?.toLowerCase().includes(keyword) ||
          item.description?.toLowerCase().includes(keyword),
      );
    }

    // Tiến hành lọc theo trạng thái hoạt động (Còn hàng / Hết hàng)
    if (statusFilter !== '') {
      const isAvailableTarget = statusFilter === 'active';
      result = result.filter((item) => item.isAvailable === isAvailableTarget);
    }

    setFilteredItems(result);
    setCurrentPage(1);
  }, [items, searchTerm, statusFilter]);

  // 4. Tính toán dữ liệu phân trang chuẩn xác từ mảng đã qua bộ lọc "filteredItems"
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredItems.slice(startIndex, startIndex + pageSize);
  }, [filteredItems, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;

  // Cấu hình các cột hiển thị trong bảng dữ liệu món ăn
  const columns: ColumnDef<IMenuItem>[] = [
    {
      header: 'Tên món ăn',
      render: (item) => (
        <div className="flex gap-3 w-full max-w-[500px] items-center">
          <img
            src={item?.imageUrl?.[0]?.url || 'https://github.com/shadcn.png'}
            className="rounded-xl w-10 h-10 object-cover shrink-0 border border-slate-100 shadow-sm"
            alt={item.name}
          />
          <div className="flex flex-col w-full min-w-0">
            <span className="font-semibold text-xs text-slate-900">{item.name}</span>
            <span className="text-xs text-slate-500 line-clamp-1 break-words text-wrap mt-0.5">
              {item.description || 'Chưa có mô tả'}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Giá bán',
      render: (item) => (
        <span className="text-xs font-medium text-slate-700">
          {item.price.toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      header: 'Danh mục',
      render: (item) => {
        const categoryName =
          typeof item.category === 'string' ? item.category : item.category?.name || '';
        return <StatusTag status={categoryName} />;
      },
    },
    {
      header: 'Tags',
      render: (item) => (
        <div className="flex flex-wrap gap-1 w-full max-w-[300px]">
          {item.tags?.map((t: string, index: number) => (
            <StatusTag key={index} status={t} />
          ))}
        </div>
      ),
    },
    {
      header: 'Trạng thái',
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <StatusTag status={item.isAvailable ? 'active' : 'inactive'} />
          <Switch
            checked={item.isAvailable}
            className="data-[state=checked]:bg-cerulean-blue-600 h-5 w-9"
            onCheckedChange={(checked) => {
              toggleAvailability(item._id, checked);
            }}
          />
        </div>
      ),
    },
    {
      header: 'Hành động',
      className: 'text-right',
      render: (item) => (
        <div className="flex justify-end gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:bg-slate-100 rounded-lg"
            onClick={() => {
              navigate(`/manager/menu/items/edit/${item._id}`, {
                state: { itemData: item },
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
              Quản Lý Thực Đơn
            </h1>
            <p className="text-sm text-slate-500 mt-1">Danh sách món ăn và điều chỉnh nhà hàng</p>
          </div>
        </div>

        {/* BỘ LỌC ĐA NĂNG FILTER TOOLBAR */}
        <FilterToolbar
          rightActions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="text-slate-700 border-slate-200 bg-white hover:bg-slate-50 h-9 rounded-xl text-sm"
              >
                <Download className="mr-2 h-4 w-4 text-slate-500" /> Xuất file
              </Button>
              <Button
                className="bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white h-9 rounded-xl text-sm shadow-sm"
                onClick={() => navigate('/manager/menu/items/create')}
              >
                Thêm món mới <Plus className="ml-2 h-4 w-4" />
              </Button>
            </div>
          }
        >
          {/* Ô TÌM KIẾM THEO TÊN MÓN ĂN */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm tên món ăn, mô tả..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 h-9 rounded-xl border border-slate-200 focus:outline-none focus:border-cerulean-blue-500 text-sm bg-slate-50/50"
            />
          </div>

          {/* 🌟 Ô LỌC THEO DANH MỤC CUSTOM */}
          <CustomSelect
            options={categoryOptions}
            value={activeCategory}
            onChange={(val: any) => setActiveCategory(val)}
          />

          {/* 🌟 Ô LỌC THEO TRẠNG THÁI CUSTOM */}
          <CustomSelect
            options={statusOptions}
            value={statusFilter}
            onChange={(val: any) => setStatusFilter(val)}
          />
        </FilterToolbar>

        {/* BẢNG HIỂN THỊ CHÍNH */}
        <DataTable
          columns={columns}
          data={paginatedData}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredItems.length}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          isLoading={isLoading}
          getRowKey={(item) => item._id}
        />
      </div>
    </div>
  );
}
