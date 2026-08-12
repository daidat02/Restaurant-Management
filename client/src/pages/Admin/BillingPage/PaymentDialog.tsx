import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { IBankAccountConfig } from '@/types/setting.type';
import { cn } from '@/lib/utils';

const fmtVND = (n: number) => `${n.toLocaleString('vi-VN')}đ`;

interface IPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  cycleText: string;
  restaurantName: string;
  price: number;
  paymentCode: string;
  bank?: IBankAccountConfig;
  paying: boolean;
  onConfirm: () => void;
}

function CopyRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Đã sao chép ${label}`, { position: 'top-right' });
    } catch {
      toast.error('Không thể sao chép, vui lòng thử lại', { position: 'top-right' });
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 truncate font-bold text-slate-800">{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-cerulean-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-cerulean-blue-700 transition hover:bg-cerulean-blue-50"
      >
        <Copy className="h-3.5 w-3.5" /> Sao chép
      </button>
    </div>
  );
}

/**
 * Modal "Hoàn tất thanh toán" — hiển thị mã thanh toán và thông tin chuyển khoản,
 * cấu trúc tham khảo từ trang gói dịch vụ Uweb, giữ nguyên màu sắc của hệ thống.
 */
export function PaymentDialog({
  open,
  onOpenChange,
  planName,
  cycleText,
  restaurantName,
  price,
  paymentCode,
  bank,
  paying,
  onConfirm,
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
              Chuyển đúng số tiền và nội dung bên dưới để hệ thống tự động đối soát.
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
              Số tiền cần chuyển
            </p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight">{fmtVND(price)}</p>
            <p className="mt-1 text-xs text-cerulean-blue-100/90">
              {planName} · {cycleText} · {restaurantName}
            </p>
          </div>

          <div className="flex flex-col items-center rounded-xl border border-slate-100 bg-white p-4">
            {bank?.fixedQrUrl ? (
              <img
                src={bank.fixedQrUrl}
                alt="Mã QR chuyển khoản (VietQR)"
                className="h-44 w-44 rounded-lg object-contain"
              />
            ) : (
              <div className="rounded-lg border border-slate-100 p-2">
                <QRCodeSVG
                  value={paymentCode}
                  size={164}
                  style={{ borderRadius: '6px' }}
                  includeMargin={false}
                />
              </div>
            )}
            <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">
              Quét mã bằng app ngân hàng — số tài khoản, số tiền và nội dung được điền sẵn. Vui
              lòng kiểm tra lại trước khi xác nhận.
            </p>
          </div>

          {/* Thông tin chuyển khoản */}
          <div className="space-y-2">
            <CopyRow
              label="Ngân hàng"
              value={bank?.bankName ? `${bank.bankName} · ${bank.accountName ?? ''}`.trim() : '—'}
            />
            <CopyRow label="Số tài khoản" value={bank?.accountNumber || '—'} />
            <CopyRow label="Nội dung chuyển khoản" value={paymentCode} />
          </div>

          {/* Cảnh báo */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
            <p className="text-xs font-bold text-amber-800">Bắt buộc chuyển khoản đúng nội dung</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-700">
              Chỉ chuyển khoản với nội dung <strong>{paymentCode}</strong>. Nếu nhập sai hoặc thêm,
              bớt ký tự, giao dịch sẽ không được tự động ghi nhận và chúng tôi không chịu trách
              nhiệm đối với sai sót này.
            </p>
          </div>

          <p className="text-xs leading-relaxed text-slate-400">
            Sau khi nhận đúng số tiền và nội dung, hệ thống sẽ tự động kích hoạt gói (thường dưới 2
            phút). Nếu lâu hơn, vui lòng liên hệ hotline để được hỗ trợ.
          </p>

          <Button
            onClick={onConfirm}
            disabled={paying}
            className={cn(
              'h-12 w-full rounded-xl text-sm font-semibold text-white',
              paying ? 'bg-cerulean-blue-500' : 'bg-cerulean-blue-600 hover:bg-cerulean-blue-700',
            )}
          >
            {paying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xác nhận...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Tôi đã chuyển khoản
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}