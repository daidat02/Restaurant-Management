import React from 'react';
import {
  Loader2,
  Inbox,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

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
  /** Hiển thị nền đan xen giữa các dòng (zebra). */
  striped?: boolean;
}

/** Số dòng skeleton hiển thị khi đang tải. */
const SKELETON_ROWS = 5;

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
  striped = false,
}: DataTableProps<T>) {
  const safeCurrentPage = currentPage || 1;
  const safeTotalPages = totalPages || 1;
  const startItem = (safeCurrentPage - 1) * pageSize + 1;
  const endItem = totalItems
    ? Math.min(safeCurrentPage * pageSize, totalItems)
    : Math.min(safeCurrentPage * pageSize, safeTotalPages * pageSize);
  const finalTotal = totalItems || safeTotalPages * pageSize;
  const hasPagination = !!currentPage && !!totalPages && data.length > 0 && !isLoading;

  // Hàm xoay vòng trạng thái Sort khi click: null -> asc -> desc -> null
  const handleSortClick = (col: ColumnDef<T>) => {
    if (!col.sortable || !col.onSortChange) return;

    let nextDirection: 'asc' | 'desc' | null;
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
    if (direction === 'asc') return <ArrowUp size={12} className="text-cerulean-blue-600" />;
    if (direction === 'desc') return <ArrowDown size={12} className="text-cerulean-blue-600" />;
    return (
      <ArrowUpDown
        size={12}
        className="text-slate-300 opacity-0 transition-opacity group-hover/sort:opacity-100"
      />
    );
  };

  const renderSkeletonRows = () =>
    Array.from({ length: SKELETON_ROWS }).map((_, rowIndex) => (
      <TableRow key={rowIndex} className="pointer-events-none">
        {columns.map((_, colIndex) => (
          <TableCell key={colIndex} className="px-6 py-4">
            <div
              className={cn(
                'h-3.5 animate-pulse rounded-md bg-slate-100',
                colIndex === 0 ? 'w-2/3' : 'w-5/6',
              )}
            />
          </TableCell>
        ))}
      </TableRow>
    ));

  return (
    <div className="flex min-h-0 w-full flex-col">
      {/* VÙNG CHỨA BẢNG */}
      <div className="relative min-w-0 flex-1 overflow-auto rounded-lg border border-slate-200/80 bg-white ">
        {isLoading && (
          <div className="absolute right-4 top-3 z-40 flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-cerulean-blue-600 shadow-sm ring-1 ring-slate-200/60 backdrop-blur-sm">
            <Loader2 className="h-3 w-3 animate-spin" />
            Đang tải
          </div>
        )}
        <Table
          style={{ minWidth: minWidth }}
          className="w-full border-separate border-spacing-0 text-left"
        >
          <TableHeader className="sticky top-0 z-30">
            <TableRow className="bg-slate-50/90 backdrop-blur-sm">
              {columns.map((col, index) => (
                <TableHead
                  key={index}
                  className={cn(
                    'h-12 whitespace-nowrap border-b border-slate-200/60 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-400 first:rounded-tl-2xl last:rounded-tr-2xl',
                    col.className,
                  )}
                >
                  {col.sortable && col.onSortChange ? (
                    <button
                      type="button"
                      onClick={() => handleSortClick(col)}
                      className="group/sort flex cursor-pointer items-center gap-1.5 font-bold uppercase tracking-widest text-[10px] outline-none transition-colors hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-cerulean-blue-500/40"
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
              renderSkeletonRows()
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                      <Inbox className="h-7 w-7" />
                    </span>
                    <p className="mt-3 text-sm font-medium text-slate-400">{emptyMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data?.map((item, rowIndex) => (
                <TableRow
                  key={getRowKey ? getRowKey(item) : rowIndex}
                  className={cn(
                    'group transition-colors hover:bg-cerulean-blue-50/40',
                    striped && rowIndex % 2 === 1 && 'bg-slate-50/40',
                  )}
                >
                  {columns.map((col, colIndex) => (
                    <TableCell
                      key={colIndex}
                      className={cn(
                        'whitespace-nowrap border-b border-slate-100 px-6 py-4 align-middle text-slate-600',
                        col.className,
                      )}
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
      {hasPagination && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-2 pt-5">
          <p className="text-xs text-slate-500">
            Hiển thị <span className="font-bold text-slate-900">{startItem}</span> –{' '}
            <span className="font-bold text-slate-900">{endItem}</span> trên{' '}
            <span className="font-bold text-slate-900">{finalTotal}</span> kết quả
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              Trang
              <select
                value={safeCurrentPage}
                onChange={(e) => onPageChange?.(Number(e.target.value))}
                className="h-9 cursor-pointer rounded-xl border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 shadow-sm outline-none transition focus:border-cerulean-blue-500 focus:ring-2 focus:ring-cerulean-blue-100"
              >
                {Array.from({ length: safeTotalPages }, (_, i) => i + 1).map((page) => (
                  <option key={page} value={page}>
                    {page} / {safeTotalPages}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onPageChange?.(safeCurrentPage - 1)}
                disabled={safeCurrentPage === 1}
                aria-label="Trang trước"
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-cerulean-blue-200 hover:text-cerulean-blue-600 focus-visible:ring-2 focus-visible:ring-cerulean-blue-500/40 disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onPageChange?.(safeCurrentPage + 1)}
                disabled={safeCurrentPage === safeTotalPages}
                aria-label="Trang sau"
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-cerulean-blue-200 hover:text-cerulean-blue-600 focus-visible:ring-2 focus-visible:ring-cerulean-blue-500/40 disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
