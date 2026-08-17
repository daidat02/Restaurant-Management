import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { DialogCustom } from '@/components/DialogCustom';

export interface PaymentSuccessRow {
  label: string;
  value: ReactNode;
}

interface PaymentSuccessDialogProps {
  open: boolean;
  /** Tiêu đề dialog. Mặc định: "Thanh toán thành công!". */
  title?: string;
  /** Phụ đề dưới tiêu đề. */
  subtitle?: string;
  /** Các dòng thông tin hiển thị trong khung (Nhà hàng / Số tiền / Mã đơn...). */
  rows: PaymentSuccessRow[];
  /** Nhãn nút xác nhận. Mặc định: "Hoàn tất". */
  confirmLabel?: string;
  /** Hành động khi bấm xác nhận (đóng dialog + điều hướng/refresh theo từng màn hình). */
  onConfirm: () => void;
}

/**
 * Dialog "thanh toán thành công" dùng chung cho POS (FormPayment), /admin/billing,
 * trang tạo nhà hàng mới và trang thanh toán khách hàng.
 * Overlay trên màn hình hiện tại (không swap page).
 */
export function PaymentSuccessDialog({
  open,
  title = 'Thanh toán thành công!',
  subtitle,
  rows,
  confirmLabel = 'Hoàn tất',
  onConfirm,
}: PaymentSuccessDialogProps) {
  return (
    <DialogCustom
      open={open}
      content={
        <div className="flex flex-col items-center justify-center p-2 sm:p-4 max-w-full">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 border-4 border-green-50 shadow-sm">
            <Check color="#16c52a" className="h-8 w-8 sm:h-10 sm:w-10" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1 text-center">{title}</h2>
          {subtitle && (
            <p className="text-gray-500 text-xs sm:text-sm mb-4 text-center">{subtitle}</p>
          )}

          <div className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 space-y-2.5 sm:space-y-3 text-xs sm:text-sm">
            {rows.map((row, idx) => (
              <div
                key={idx}
                className={`flex justify-between items-center gap-3 ${
                  idx < rows.length - 1 ? 'border-b border-gray-200 pb-2' : ''
                }`}
              >
                <span className="text-gray-500">{row.label}</span>
                <span className="font-medium text-gray-800 text-right break-words max-w-[70%]">
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={onConfirm}
            className="w-full bg-blue-600 text-white font-semibold py-2.5 sm:py-3 px-4 rounded-lg shadow hover:bg-blue-700 transition-colors duration-200 text-sm"
          >
            {confirmLabel}
          </button>
        </div>
      }
    />
  );
}
