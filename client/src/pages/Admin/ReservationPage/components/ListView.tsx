import React, { useMemo } from 'react';
import { ChevronRight, Users } from 'lucide-react';
import { DataTable, type ColumnDef } from '@/components/TableData'; // Bạn nhớ điều chỉnh lại đường dẫn import này cho đúng cấu trúc thư mục nhé
import type { IReservation } from '@/types/reservation.type';
import { extractId } from '@/utils/helpers';
import { StatusTag } from '@/components/StatusTag';

interface ListViewProps {
  reservations: IReservation[];
  onSelect: (res: IReservation) => void;
  isLoading: boolean | false;
}

export function ListView({ reservations, onSelect, isLoading }: ListViewProps) {
  // Định nghĩa các cột cho bảng quản lý đặt bàn thông qua useMemo để tối ưu hiệu năng
  const columns = useMemo<ColumnDef<IReservation>[]>(
    () => [
      {
        header: 'Mã Đơn',
        render: (res) => (
          <span
            onClick={() => {
              onSelect(res);
            }}
            className="text-xs text-cerulean-blue-600 font-mono hover:underline cursor-pointer"
          >
            #{res.reservationId}
          </span>
        ),
      },
      {
        header: 'Khách Hàng',
        render: (res) => (
          <>
            <div className="font-semibold text-slate-900">{res.customerInfo.name}</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">
              {res.customerInfo.phoneNumber}
            </div>
          </>
        ),
      },
      {
        header: 'Số Khách',
        render: (res) => (
          <span className="font-medium flex items-center gap-1">
            <Users size={14} className="text-slate-400" /> {res.partySize} người
          </span>
        ),
      },
      {
        header: 'Bàn Số',
        className: 'font-semibold',
        render: (res) => (
          <span className="font-medium flex items-center gap-1">
            Bàn {extractId(res.table, 'tableNumber')}
          </span>
        ),
      },
      {
        header: 'Thời Gian',
        render: (res) => (
          <>
            <div className="font-semibold text-slate-900">{res.reservationTime}</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">
              Dự kiến ngồi: {res.reservationTime}
            </div>
          </>
        ),
      },
      {
        header: 'Trạng Thái',
        render: (res) => <StatusTag status={res.status as string} />,
      },
      // {
      //   header: 'Ghi Chú',
      //   className: ' max-w-[200px] truncate',
      //   render: (res) => <span title={res.notes}>{res.notes || '—'}</span>,
      // },
      {
        header: 'Hành động',
        className: 'text-right',
        render: (res) => (
          <button
            onClick={() => {
              onSelect(res);
            }}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        ),
      },
    ],
    [],
  ); // Giữ nguyên mảng dependency trống
  return (
    <DataTable
      columns={columns}
      data={reservations}
      emptyMessage="Không tìm thấy lịch đặt bàn nào khớp với bộ lọc!"
      getRowKey={(res) => res._id as string}
      minWidth="1000px" // Đảm bảo bảng không bị bóp nghẹt khi thu nhỏ màn hình máy tính
      isLoading={isLoading}
    />
  );
}
