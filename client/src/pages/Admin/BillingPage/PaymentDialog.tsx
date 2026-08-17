import { QRCodeSVG } from 'qrcode.react';
import { ExternalLink, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const fmtVND = (n: number) => `${n.toLocaleString('vi-VN')}đ`;

export type PaymentMethod = 'payos' | 'vnpay';

interface IPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  cycleText: string;
  restaurantName: string;
  price: number;
  /** Phương thức thanh toán đang chọn. */
  method: PaymentMethod;
  /** Link thanh toán (checkoutUrl) — chưa có nghĩa là đang tạo link. */
  checkoutUrl?: string;
  /** QR PayOS (qrCodeData) — chỉ có với PayOS. */
  qrCodeData?: string;
  paying: boolean;
  onOpenCheckout: () => void;
  /** Ghi chú giá (vd: "Giá hôm nay (pro-rate)") — hiển thị dưới số tiền khi nâng gói giữa chu kỳ. */
  priceNote?: string;
}

/** Modal "Hoàn tất thanh toán" — PayOS (QR + mở trang) / VNPay (mở cổng thanh toán). */
export function PaymentDialog({
  open,
  onOpenChange,
  planName,
  cycleText,
  restaurantName,
  price,
  method,
  checkoutUrl,
  qrCodeData,
  paying,
  onOpenCheckout,
  priceNote,
}: IPaymentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-[600px]"
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <DialogTitle className="font-heading text-base leading-none font-medium text-gray-900">
              Hoàn tất thanh toán
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-xs leading-relaxed text-slate-500">
              {method === 'payos'
                ? 'Quét mã QR bằng app ngân hàng hoặc bấm mở trang thanh toán PayOS.'
                : 'Bấm mở cổng thanh toán VNPay để hoàn tất giao dịch.'}
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Đóng"
            >
              ✕
            </button>
          </DialogClose>
        </div>

        {/* Số tiền + QR */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <div className="rounded-xl bg-gradient-to-br from-cerulean-blue-600 to-cerulean-blue-800 p-5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-cerulean-blue-100">
              Số tiền cần thanh toán
            </p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight">{fmtVND(price)}</p>
            {priceNote && (
              <p className="mt-0.5 text-[11px] font-medium text-cerulean-blue-100">{priceNote}</p>
            )}
            <p className="mt-1 text-xs text-cerulean-blue-100/90">
              {planName} · {cycleText} · {restaurantName}
            </p>
          </div>

          {method === 'payos' && (
            <div className="flex flex-col items-center rounded-xl border border-slate-100 bg-white p-4">
              <div className="rounded-lg border border-slate-100 p-2">
                <QRCodeSVG
                  value={qrCodeData || checkoutUrl || ''}
                  size={164}
                  style={{ borderRadius: '6px' }}
                  includeMargin={false}
                />
              </div>
              <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">
                Số tiền và nội dung được điền sẵn theo link thanh toán. Thanh toán xong hệ thống tự
                kích hoạt gói.
              </p>
            </div>
          )}

          <Button
            onClick={onOpenCheckout}
            disabled={paying || !checkoutUrl}
            className={cn(
              'h-12 w-full rounded-xl text-sm font-semibold text-white',
              paying ? 'bg-cerulean-blue-500' : 'bg-cerulean-blue-600 hover:bg-cerulean-blue-700',
            )}
          >
            {paying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tạo link thanh toán...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />{' '}
                {method === 'payos' ? 'Mở trang thanh toán PayOS' : 'Mở cổng thanh toán VNPay'}
              </>
            )}
          </Button>

          <p className="text-xs leading-relaxed text-slate-400">
            {method === 'payos'
              ? 'Link hết hạn sau 15 phút. Sau khi thanh toán, gói sẽ tự động kích hoạt.'
              : 'Sau khi thanh toán xong tại VNPay, hệ thống sẽ tự động kích hoạt gói cho nhà hàng.'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
