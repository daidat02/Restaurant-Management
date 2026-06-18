import React from 'react';
import { Loader2, Inbox, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

// Định nghĩa cột tinh gọn: Chỉ giữ tính năng Sort tùy chọn
export interface ColumnDef<T> {
  header: string;
  accessorKey?: keyof T;
  render?: (item: T) => React.ReactNode;
  className?: string;

  // Cấu hình cho bộ sắp xếp tại đầu cột (Optional)
  sortable?: boolean;
  onSortChange?: (direction: 'asc' | 'desc' | null) => void;
  currentSortDirection?: 'asc' | 'desc' | null;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  minWidth?: string;
  getRowKey?: (item: T) => string | number;
}

export function DataTable<T>({
  data,
  columns,
  isLoading = false,
  emptyMessage = 'Không tìm thấy dữ liệu phù hợp!',
  currentPage,
  totalPages,
  pageSize = 10,
  totalItems,
  onPageChange,
  minWidth = '1000px',
  getRowKey,
}: DataTableProps<T>) {
  const safeCurrentPage = currentPage || 1;
  const safeTotalPages = totalPages || 1;
  const startItem = (safeCurrentPage - 1) * pageSize + 1;
  const endItem = totalItems
    ? Math.min(safeCurrentPage * pageSize, totalItems)
    : Math.min(safeCurrentPage * pageSize, safeTotalPages * pageSize);
  const finalTotal = totalItems || safeTotalPages * pageSize;

  // Hàm xoay vòng trạng thái Sort khi click: null -> asc -> desc -> null
  const handleSortClick = (col: ColumnDef<T>) => {
    if (!col.sortable || !col.onSortChange) return;

    let nextDirection: 'asc' | 'desc' | null = null;
    if (!col.currentSortDirection) {
      nextDirection = 'asc';
    } else if (col.currentSortDirection === 'asc') {
      nextDirection = 'desc';
    } else {
      nextDirection = null;
    }

    col.onSortChange(nextDirection);
  };

  // Render icon Sort tương ứng với trạng thái hiện tại
  const renderSortIcon = (direction: 'asc' | 'desc' | null | undefined) => {
    if (direction === 'asc') return <ArrowUp size={12} className="text-blue-600" />;
    if (direction === 'desc') return <ArrowDown size={12} className="text-blue-600" />;
    return (
      <ArrowUpDown
        size={12}
        className="text-slate-300 opacity-0 group-hover/sort:opacity-100 transition-opacity"
      />
    );
  };

  return (
    <div className="flex flex-col h-full w-full min-h-0">
      {/* VÙNG CHỨA BẢNG */}
      <div className="flex-1 h-full overflow-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm relative custom-scrollbar">
        <Table
          style={{ minWidth: minWidth }}
          className="border-separate border-spacing-0 w-full text-left"
        >
          <TableHeader className="sticky top-0 z-30">
            <TableRow className="bg-slate-50/70 backdrop-blur-sm">
              {columns.map((col, index) => (
                <TableHead
                  key={index}
                  className={`
                    h-12 whitespace-nowrap text-[10px] font-semibold text-slate-400 uppercase tracking-wider
                    border-b border-slate-200/60 px-6 bg-slate-50/70 first:rounded-tl-2xl last:rounded-tr-2xl
                    ${col.className || ''}
                  `}
                >
                  {/* TIÊU ĐỀ & SORT (CLICK ĐƯỢC NẾU CÓ CẤU HÌNH SORTABLE) */}
                  {col.sortable && col.onSortChange ? (
                    <button
                      type="button"
                      onClick={() => handleSortClick(col)}
                      className="flex items-center gap-1.5 hover:text-slate-600 transition-colors group/sort outline-none font-semibold text-[10px]"
                    >
                      <span>{col.header}</span>
                      {renderSortIcon(col.currentSortDirection)}
                    </button>
                  ) : (
                    <span>{col.header}</span>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-slate-100 text-sm">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="mt-2 text-sm text-slate-500 font-medium">Đang tải dữ liệu...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Inbox className="h-10 w-10 text-slate-300" />
                    <p className="mt-2 text-sm text-slate-400 font-medium">{emptyMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data?.map((item, rowIndex) => (
                <TableRow
                  key={getRowKey ? getRowKey(item) : rowIndex}
                  className="hover:bg-slate-50/50 transition-colors group"
                >
                  {columns.map((col, colIndex) => (
                    <TableCell
                      key={colIndex}
                      className={`
                        py-4 px-6 border-b border-slate-100 whitespace-nowrap text-slate-600 font-normal
                        ${col.className || ''}
                      `}
                    >
                      {col.render
                        ? col.render(item)
                        : col.accessorKey
                          ? String(item[col.accessorKey] ?? '')
                          : ''}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* PHÂN TRANG */}
      {data.length > 0 && !isLoading && currentPage && totalPages && (
        <div className="flex items-center justify-between px-2 pt-5 shrink-0 bg-transparent">
          <p className="text-sm text-slate-500">
            Hiển thị <span className="font-semibold text-slate-900">{startItem}</span> -{' '}
            <span className="font-semibold text-slate-900">{endItem}</span> trên{' '}
            <span className="font-semibold text-slate-900">{finalTotal}</span> kết quả
          </p>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              Trang số
              <select
                value={currentPage}
                onChange={(e) => onPageChange?.(Number(e.target.value))}
                className="border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-1 ring-slate-400 cursor-pointer text-slate-700 bg-white shadow-sm"
              >
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <option key={page} value={page}>
                    {page}
                  </option>
                ))}
              </select>
            </div>

            <Pagination className="w-auto mx-0">
              <PaginationContent className="gap-2">
                <PaginationItem>
                  <PaginationPrevious
                    text=""
                    className={`border border-slate-200 hover:bg-slate-50 text-slate-500 cursor-pointer rounded-lg h-9 w-9 p-0 flex items-center justify-center transition-colors ${
                      currentPage === 1 && 'pointer-events-none opacity-30'
                    }`}
                    onClick={() => onPageChange?.(currentPage - 1)}
                  />
                </PaginationItem>

                <PaginationItem>
                  <PaginationNext
                    text=""
                    className={`border border-slate-200 hover:bg-slate-50 text-slate-500 cursor-pointer rounded-lg h-9 w-9 p-0 flex items-center justify-center transition-colors ${
                      currentPage === totalPages && 'pointer-events-none opacity-30'
                    }`}
                    onClick={() => onPageChange?.(currentPage + 1)}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}
    </div>
  );
}
