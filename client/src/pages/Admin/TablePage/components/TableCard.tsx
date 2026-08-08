import type { ITable } from '@/types/table.type';
import { useRef } from 'react';
import { Plus, Printer } from 'lucide-react';
import { getTimeAgo } from '@/utils/helpers';
import { QRCodeSVG } from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';
const BASE_URL = import.meta.env.VITE_BASE_URL;

interface TableCardProps {
  table: ITable;
  isSelected: boolean;
  onClick: () => void;
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
  restaurantId?: string;
}

// Tone màu + nhãn theo preview tables.html
const STYLE_CONFIG: Record<string, { label: string; badge: string }> = {
  available: { label: 'Bàn trống', badge: 'bg-emerald-50 text-emerald-700' },
  occupied: { label: 'Đang phục vụ', badge: 'bg-amber-50 text-amber-700' },
  reserved: { label: 'Đã đặt', badge: 'bg-cerulean-blue-50 text-cerulean-blue-700' },
  active: { label: 'Đã đặt', badge: 'bg-cerulean-blue-50 text-cerulean-blue-700' },
  inactive: { label: 'Tạm đóng', badge: 'bg-slate-100 text-slate-500' },
};

const money = (n: number) => `${Math.round(n || 0).toLocaleString('vi-VN')}₫`;

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
  restaurantId,
}: TableCardProps) => {
  const isAvailable = table.status === 'available';
  const isReserved = table.status === 'reserved';
  const currentStyle = STYLE_CONFIG[table.status] || STYLE_CONFIG['available'];

  const receiptRef = useRef<HTMLDivElement>(null);
  const triggerPrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Ban_So_${table.tableNumber || 'Moi'}`,
    onAfterPrint: () => {
      if (isAvailable) {
        onChangeStatus?.(table._id, 'occupied');
      }
    },
  });

  const orderId =
    typeof table.currentOrder === 'object' ? table.currentOrder?._id : table.currentOrder;
  const orderTotal =
    typeof table.currentOrder === 'object'
      ? table.currentOrder?.totalAmount
      : undefined;

  const name =
    customerName ||
    (typeof table.currentOrder === 'object'
      ? table.currentOrder?.deliveryInfo?.name ||
        (typeof table.currentOrder?.customer === 'object' ? table.currentOrder.customer.name : null)
      : null) ||
    'Khách lẻ';

  // Thời gian hiển thị theo giờ của đơn hàng
  const orderTime =
    typeof table.currentOrder === 'object' && table.currentOrder
      ? table.currentOrder.createdAt || table.currentOrder.updatedAt
      : null;

  const timeLabel = isAvailable
    ? 'Sẵn sàng'
    : time || (orderTime ? getTimeAgo(orderTime) : table.updatedAt ? getTimeAgo(table.updatedAt) : '-');

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-2xl border bg-white p-4 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover ${
        isSelected
          ? 'border-cerulean-blue-300 ring-2 ring-cerulean-blue-500'
          : 'border-slate-200 hover:border-cerulean-blue-200'
      }`}
    >
      {/* Hàng 1: Số bàn + sức chứa | badge trạng thái */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-gray-900">Bàn số {table.tableNumber}</p>
          <p className="text-xs text-slate-400">{table.capacity} chỗ</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${currentStyle.badge}`}>
          {currentStyle.label}
        </span>
      </div>

      {/* Hàng 2: Mã đơn / Khách / Tổng tiền */}
      <div className="mt-3 rounded-xl bg-slate-50/70 p-3">
        {!isAvailable ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-xs text-slate-400">
                {isReserved ? `Đặt bởi: ${name}` : `Khách: ${name}`}
              </p>
              {typeof table.currentOrder === 'object' && (
                <span className="shrink-0 rounded bg-cerulean-blue-50 px-1 py-0.5 text-[10px] font-semibold text-cerulean-blue-700">
                  #{table.currentOrder?.orderId || ''}
                </span>
              )}
            </div>
            {!isReserved && (
              <p className="mt-1 text-lg font-extrabold text-gray-900">
                {orderTotal != null ? money(orderTotal) : '-'}
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-400">Chưa có đơn hàng</p>
        )}
      </div>

      {/* Hàng 3: Thời gian + nút action */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">{timeLabel}</span>
        <div className="flex gap-1.5">
          {isAvailable ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onCreateOrder) onCreateOrder(table._id);
              }}
              className="flex items-center gap-1 rounded-lg bg-cerulean-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cerulean-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Tạo đơn
            </button>
          ) : isReserved ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChangeStatus?.(table._id, 'occupied');
              }}
              className="flex items-center gap-1 rounded-lg bg-cerulean-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cerulean-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Nhận bàn
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (orderId && onOpenPayment) onOpenPayment(orderId);
              }}
              className="rounded-lg bg-cerulean-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cerulean-blue-700"
            >
              Thanh toán
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerPrint();
            }}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-cerulean-blue-200 hover:text-cerulean-blue-600"
            title="In QR"
          >
            <Printer className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Khu in QR (ẩn) */}
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

            {/* Khung chứa QR */}
            <div className="p-3 rounded-xl my-3 bg-white flex flex-col items-center justify-center">
              <QRCodeSVG
                value={`${BASE_URL}/scan-to-order?${restaurantId ? `restaurantId=${restaurantId}&` : ''}tableId=${table._id}`}
                size={130}
                includeMargin={false}
                level="H"
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
              <div className="border-b border-dashed border-gray-400 w-full mb-3" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-black">
                Chúc Quý Khách Ngon Miệng!
              </p>
              <p className="mt-2 text-[10px] text-gray-700">
                <span className="font-medium">Wifi:</span> {wifiName}{' '}
                <span className="mx-1">|</span> <span className="font-medium">Pass:</span>{' '}
                {wifiPassword}
              </p>
              <p className="text-[9px] text-gray-400 mt-3 tracking-wide">
                Powered by datnd.02 POS v1.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
