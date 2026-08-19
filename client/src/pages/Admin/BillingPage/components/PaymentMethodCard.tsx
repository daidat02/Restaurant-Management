import { Check, Landmark, QrCode, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ISubscriptionInfo } from '@/types/subscription.type';

import type { PaymentMethod } from './PaymentDialog';

const METHOD_LABEL: Record<PaymentMethod, { text: string; desc: string }> = {
  payos: { text: 'PayOS', desc: 'Quét QR hoặc chuyển khoản qua PayOS' },
  vnpay: { text: 'VNPay', desc: 'Thanh toán qua cổng VNPay' },
};

interface PaymentMethodCardProps {
  selected: ISubscriptionInfo | undefined;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onRenew: () => void;
}

export function PaymentMethodCard({
  selected,
  paymentMethod,
  onPaymentMethodChange,
  onRenew,
}: PaymentMethodCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
      <h3 className="text-sm font-bold text-gray-900">Phương thức thanh toán</h3>
      <p className="mt-0.5 text-xs text-slate-400">Chọn cổng thanh toán cho gói dịch vụ</p>
      <div className="mt-4 space-y-2.5">
        {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => {
          const Icon = m === 'payos' ? QrCode : Landmark;
          const active = paymentMethod === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onPaymentMethodChange(m)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition',
                active
                  ? 'border-cerulean-blue-300 bg-cerulean-blue-50/60'
                  : 'border-slate-200 bg-white hover:border-cerulean-blue-200',
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                  m === 'payos'
                    ? 'bg-cerulean-blue-600 text-white'
                    : 'bg-amber-100 text-amber-700',
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800">{METHOD_LABEL[m].text}</p>
                <p className="text-xs text-slate-400">{METHOD_LABEL[m].desc}</p>
              </div>
              <span
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-full border-2 transition',
                  active
                    ? 'border-cerulean-blue-600 bg-cerulean-blue-600'
                    : 'border-slate-300',
                )}
              >
                {active && <Check className="h-2.5 w-2.5 text-white" />}
              </span>
            </button>
          );
        })}
      </div>

      <Button
        onClick={onRenew}
        disabled={!selected}
        className="mt-4 h-10 w-full rounded-xl bg-cerulean-blue-600 text-sm font-semibold text-white shadow-lg shadow-cerulean-blue-200 transition hover:bg-cerulean-blue-700"
      >
        <RotateCcw className="h-4 w-4" /> Gia hạn gói
      </Button>
      <p className="mt-2 text-center text-[11px] text-slate-400">
        Chọn nhà hàng và gói, sau đó bấm gia hạn để tạo link thanh toán {METHOD_LABEL[paymentMethod].text}.
      </p>
    </div>
  );
}