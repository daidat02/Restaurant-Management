import { useMemo } from 'react';
import type { IOrder } from '@/types/order.type';
import { calcItemTotal, formatPrice } from './orderDetailHelpers';

interface OrderSummaryCardProps {
  order: IOrder;
  vatRate?: number;
  serviceFeeRate?: number;
}

export default function OrderSummaryCard({
  order,
  vatRate = 0,
  serviceFeeRate = 0,
}: OrderSummaryCardProps) {
  const subtotal =
    order.items?.reduce((acc, item) => acc + calcItemTotal(item), 0) || 0;

  const { serviceFeeAmount, vatAmount, total } = useMemo(() => {
    const service = (subtotal * serviceFeeRate) / 100;
    const vat = ((subtotal + service) * vatRate) / 100;
    return { serviceFeeAmount: service, vatAmount: vat, total: subtotal + service + vat };
  }, [subtotal, vatRate, serviceFeeRate]);

  const hasFees = serviceFeeRate > 0 || vatRate > 0;
  const finalTotal = hasFees ? total : order.totalAmount || total;
  const itemsCount = order.itemsCount || order.items?.length || 0;

  return (
    <div className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-sm">
      <div className="flex justify-between">
        <span className="text-slate-500">Tạm tính ({itemsCount} món)</span>
        <span className="font-medium text-slate-900">{formatPrice(subtotal)}</span>
      </div>
      {serviceFeeRate > 0 && (
        <div className="flex justify-between">
          <span className="text-slate-500">Phí phục vụ ({serviceFeeRate}%)</span>
          <span className="font-medium text-slate-900">+{formatPrice(serviceFeeAmount)}</span>
        </div>
      )}
      {vatRate > 0 && (
        <div className="flex justify-between">
          <span className="text-slate-500">VAT ({vatRate}%)</span>
          <span className="font-medium text-slate-900">+{formatPrice(vatAmount)}</span>
        </div>
      )}
      {order.orderType === 'delivery' && (
        <div className="flex justify-between">
          <span className="text-slate-500">Phí giao hàng</span>
          <span className="font-medium text-slate-900">{formatPrice(0)}</span>
        </div>
      )}
      <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-cerulean-blue-50 to-white px-4 py-3 ring-1 ring-cerulean-blue-100">
        <span className="font-bold text-slate-900">Tổng cộng</span>
        <span className="text-xl font-extrabold tracking-tight text-cerulean-blue-600">
          {formatPrice(finalTotal)}
        </span>
      </div>
    </div>
  );
}
