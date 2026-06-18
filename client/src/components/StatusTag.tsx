import React from 'react';
import {
  Clock,
  CheckCircle,
  Activity,
  AlertCircle,
  Flame,
  Utensils,
  Truck,
  XCircle,
  Wallet,
  Coins,
  RefreshCcw,
  EyeOff,
} from 'lucide-react';

// 1. Cấu hình màu sắc cho từng trạng thái
const STATUS_STYLES: Record<string, string> = {
  // --- TRẠNG THÁI ĐƠN HÀNG (ORDER) ---
  pending: 'bg-orange-100 text-orange-700 border border-orange-300',
  confirmed: 'bg-sky-100 text-sky-700 border border-sky-300',
  preparing: 'bg-violet-100 text-violet-700 border border-violet-300',
  served: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
  delivered: 'bg-teal-100 text-teal-700 border border-teal-300',
  cancelled: 'bg-rose-100 text-rose-700 border border-rose-300',

  // --- TRẠNG THÁI THANH TOÁN (PAYMENT) ---
  unpaid: 'bg-red-100 text-red-700 border border-red-300',
  partial: 'bg-amber-100 text-amber-700 border border-amber-300',
  paid: 'bg-blue-100 text-blue-700 border border-blue-300',
  refunded: 'bg-gray-100 text-gray-700 border border-gray-300',

  // --- TRẠNG THÁI CHUNG (HỆ THỐNG / THỰC ĐƠN / ĐẶT BÀN) ---
  active: 'bg-green-100 text-green-700 border border-green-300',
  inactive: 'bg-slate-100 text-slate-700 border border-slate-300',
  completed: 'bg-blue-100 text-blue-700 border border-blue-300',
  waiting_paid: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
  checked_in: 'bg-green-100 text-green-700 border border-green-300',

  // Mặc định
  default: 'bg-gray-100 text-gray-700 border border-neutral-200',
};

// 2. Cấu hình nhãn Tiếng Việt để hiển thị
const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị',
  served: 'Đã phục vụ',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
  unpaid: 'Chưa thanh toán',
  partial: 'Thanh toán 1 phần',
  paid: 'Đã thanh toán',
  refunded: 'Đã hoàn tiền',
  active: 'Hoạt động',
  inactive: 'Tạm ẩn',
  completed: 'Hoàn thành',
  waiting_paid: 'Chờ thanh toán',
  checked_in: 'Đã nhận bàn',
};

// 3. Cấu hình Icon tương ứng (Không khai báo 'default' để trả về null)
const STATUS_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  // Order Icons
  pending: Clock,
  confirmed: CheckCircle,
  preparing: Flame,
  served: Utensils,
  delivered: Truck,
  cancelled: XCircle,

  // Payment Icons
  unpaid: AlertCircle,
  partial: Coins,
  paid: Wallet,
  refunded: RefreshCcw,

  // System/Other Icons
  active: Activity,
  inactive: EyeOff,
  completed: CheckCircle,
  waiting_paid: Clock,

  //Reservation Icons
  checked_in: CheckCircle,
};

interface StatusTagProps {
  status: string | null;
  className?: string; // Cho phép ghi đè style nếu cần
}

export const StatusTag = ({ status, className }: StatusTagProps) => {
  // Chuyển status về chữ thường để match với các Key map dữ liệu
  const normalizedStatus = status?.toLowerCase() || 'default';

  // Lấy style và nhãn dịch tương ứng
  const statusStyle = STATUS_STYLES[normalizedStatus] || STATUS_STYLES['default'];
  const displayLabel = STATUS_LABELS[normalizedStatus] || status;

  // FIX ĐỂ TRẢ VỀ NULL: Nếu có trong map thì lấy Icon component, không thì trả về undefined
  const IconComponent = STATUS_ICONS[normalizedStatus];

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-sm 
        text-[8px] font-bold uppercase tracking-wider 
        ${statusStyle} 
        ${className || ''}
      `}
    >
      {/* Chỉ render Icon ra màn hình nếu tìm thấy IconComponent phù hợp */}
      {IconComponent && <IconComponent size={10} className="shrink-0" />}
      <span>{displayLabel}</span>
    </span>
  );
};
