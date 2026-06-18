import type { ITable } from '@/types/table.type';
import { useRef, useState } from 'react';
import { SelectDropdown } from '@/components/SelectDropdown';
import { Clock, Plus, Printer, SquarePen, X } from 'lucide-react';
import { extractId, getTimeAgo } from '@/utils/helpers';
import { QRCodeSVG } from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';
export const BASE_URL = import.meta.env.VITE_BASE_URL;

interface TableCardProps {
  table: ITable;
  isSelected: boolean;
  onClick: () => void;
  // Thêm prop để hứng sự kiện khi bấm nút tạo đơn
  onCreateOrder?: (tableId: string) => void;

  orderId?: string;
  customerName?: string;
  total?: number;
  time?: string;
  onChangeStatus?: (id: string, status: string) => void;
  open?: boolean;
  onOpenPayment?: (orderId: string) => void;
  wifiName?: string;
  wifiPassword?: string;
  restaurantName?: string;
}

export const TableCard = ({
  table,
  isSelected,
  onClick,
  onCreateOrder,
  customerName,
  time,
  onChangeStatus,
  onOpenPayment,
  wifiName,
  wifiPassword,
  restaurantName,
}: TableCardProps) => {
  const styleConfig = {
    available: {
      bg: 'bg-gray-50/60',
      text: 'text-gray-500',
      border: 'border-gray-200',
      label: 'Bàn trống',
    },
    occupied: {
      bg: 'bg-emerald-50/60',
      text: 'text-emerald-500',
      border: 'border-emerald-200',
      label: 'Đang phục vụ',
    },
    reserved: {
      bg: 'bg-amber-50/60',
      text: 'text-amber-500',
      border: 'border-amber-200',
      label: 'Đã đặt',
    },
    active: {
      bg: 'bg-amber-50/60',
      text: 'text-amber-500',
      border: 'border-amber-200',
      label: 'Đã đặt',
    },
    inactive: {
      bg: 'bg-red-50/60',
      text: 'text-red-500',
      border: 'border-red-200',
      label: 'Tạm dừng phục vụ',
    },
  };

  const currentStyle = styleConfig[table.status];
  const isAvailable = table.status === 'available';
  const receiptRef = useRef<HTMLDivElement>(null);
  const triggerPrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Ban_So_${table.tableNumber || 'Moi'}`,
    onAfterPrint: () => {
      if (table.status == 'available') {
        onChangeStatus?.(table._id, 'occupied');
      }
      return;
    },
  });

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-sm flex flex-col hover:shadow-md  cursor-pointer min-h-[140px] ${
        isSelected
          ? 'ring-2 ring-cerulean-blue-500 border-cerulean-blue-400'
          : 'border border-gray-200'
      }`}
    >
      {' '}
      <div className="hidden">
        <div ref={receiptRef}>
          {/* Layout chuẩn khổ giấy in nhiệt K80 (80mm) */}
          <div className="w-[80mm] p-5 bg-white text-black font-sans text-xs flex flex-col items-center border border-slate-100">
            {/* Tên nhà hàng & Tiêu đề hóa đơn */}
            <div className="text-center w-full mb-3">
              <h2 className="text-sm font-extrabold tracking-wide uppercase">
                Hệ Thống Nhà Hàng {restaurantName}
              </h2>
              <div className="border-b border-dashed border-black/40 my-1.5 w-full" />
              <p className="text-[10px] text-gray-600 italic">
                Quét mã để xem menu & đặt món tự động
              </p>
            </div>

            {/* Khung chứa QR có viền nét đứt tạo hiệu ứng trực quan */}
            <div className="p-3 rounded-xl my-3 bg-white flex flex-col items-center justify-center">
              <QRCodeSVG
                value={`${BASE_URL}/scan-to-order?tableId=${table._id}`}
                size={130} // Tăng kích thước lên một chút cho dễ quét bằng camera điện thoại
                includeMargin={false}
                level="H" // Tăng mức độ sửa lỗi (Error Correction Level) giúp mã QR dễ quét hơn ngay cả khi mờ
              />
            </div>

            {/* Hướng dẫn các bước cho thực khách */}
            <div className="text-center w-full mt-1 space-y-1 bg-gray-50 p-2 rounded-lg border border-gray-100">
              <p className="font-bold text-[10px] text-gray-800 uppercase tracking-tight">
                Hướng dẫn gọi món:
              </p>
              <ol className="text-[9px] text-gray-600 text-left list-decimal list-inside space-y-0.5 font-medium pl-1">
                <li>Mở ứng dụng Camera hoặc Zalo trên điện thoại.</li>
                <li>Quét mã QR phía trên để xem thực đơn điện tử.</li>
                <li>Chọn món ăn và bấm gửi đơn ngay tại bàn.</li>
              </ol>
            </div>

            {/* Chân trang cám ơn */}
            <div className="w-full mt-6 text-center text-gray-800">
              {/* Đường gạch ngang phân cách nét đứt rõ ràng hơn */}
              <div className="border-b border-dashed border-gray-400 w-full mb-3" />

              {/* Lời chúc: Tăng nhẹ size, đậm, tạo khoảng cách chữ */}
              <p className="text-[11px] font-bold uppercase tracking-widest text-black">
                Chúc Quý Khách Ngon Miệng!
              </p>

              {/* Thông tin Wifi: Đổi từ italic sang text thường kèm bôi đậm label để dễ đọc */}
              <p className="mt-2 text-[10px] text-gray-700">
                <span className="font-medium">Wifi:</span> {wifiName}{' '}
                <span className="mx-1">|</span> <span className="font-medium">Pass:</span>{' '}
                {wifiPassword}
              </p>

              {/* Bản quyền: Thu nhỏ lại làm nền, mờ nhẹ vừa phải */}
              <p className="text-[9px] text-gray-400 mt-3 tracking-wide">
                Powered by datnd.02 POS v1.0
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1 gap-2.5">
        {/* Số bàn & Sức chứa / Mã đơn */}
        <div className="flex justify-between items-center">
          <span className="font-bold text-gray-800 text-sm">Bàn số {table.tableNumber}</span>
          <span className="text-gray-400 text-xs">
            {isAvailable
              ? `Sức chứa: ${table.capacity}`
              : table.currentOrder && `#${extractId(table.currentOrder, 'orderId')}`}
          </span>
        </div>

        {/* KHU VỰC GIỮA: Thông tin khách HOẶC Nút Tạo đơn */}
        <div className="flex-1 flex flex-col justify-center mt-1">
          {!isAvailable ? (
            // NẾU BÀN CÓ KHÁCH: Hiện tên khách và tổng tiền
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-gray-500 line-clamp-1 max-w-[120px]">
                  Khách: {customerName}
                </span>
                {table.currentOrder && (
                  <span className="font-bold text-gray-800">
                    {extractId(table.currentOrder, 'totalAmount').toLocaleString() + 'đ'}
                  </span>
                )}
              </div>

              {/* Cụm Nút Action cho bàn đang phục vụ */}
              <div className="flex justify-between items-center h-7">
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const orderId =
                        typeof table.currentOrder === 'object'
                          ? table.currentOrder?._id
                          : table.currentOrder;
                      if (orderId && onOpenPayment) onOpenPayment(orderId as string);
                    }}
                    className="bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                  >
                    Thanh toán
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <button
                    className="bg-[#f4f6fa] hover:bg-gray-200 p-1.5 rounded-lg text-gray-400 transition-colors"
                    title="In hóa đơn"
                    onClick={() => onChangeStatus?.(table._id, 'available')}
                  >
                    <X size={16} />
                  </button>
                  <button
                    className="bg-[#f4f6fa] hover:bg-gray-200 p-1.5 rounded-lg text-gray-400 transition-colors"
                    title="In hóa đơn"
                    onClick={triggerPrint}
                  >
                    <Printer size={16} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // NẾU BÀN TRỐNG: Hiện Text "Chưa có đơn hàng" và Nút tạo đơn
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400 italic">Chưa có đơn hàng</span>
              <div className="flex gap-1.5">
                <button
                  className="bg-[#f4f6fa] hover:bg-gray-200 p-1.5 rounded-lg text-gray-400 transition-colors"
                  title="In hóa đơn"
                  onClick={triggerPrint}
                >
                  <Printer size={16} />
                </button>
                <button
                  onClick={(e) => {
                    // CỰC KỲ QUAN TRỌNG: Ngăn chặn sự kiện click lan ra thẻ div bọc ngoài (tránh việc vừa mở trang order vừa chớp chọn bàn)
                    e.stopPropagation();
                    if (onCreateOrder) onCreateOrder(table._id);
                  }}
                  className="bg-cerulean-blue-100 hover:bg-cerulean-blue-600 text-cerulean-blue-600 hover:text-white px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  Tạo đơn
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Footer trạng thái (Giữ nguyên) */}
      <div
        className={`px-4 py-2 border-t border-dashed flex justify-between items-center text-[11px] font-bold rounded-b-2xl ${currentStyle?.bg} ${currentStyle?.border}`}
      >
        <span className={`${currentStyle.text}`}>{currentStyle.label}</span>
        {!isAvailable && (
          <div className={`flex items-center gap-1 ${currentStyle.text}`}>
            <Clock size={12} />
            <span>{getTimeAgo(table.updatedAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
