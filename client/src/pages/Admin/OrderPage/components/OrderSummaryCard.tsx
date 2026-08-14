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
  const activeItems = (order.items || []).filter((item) => item.status !== 'deleted');
  const subtotal = activeItems.reduce((acc, item) => acc + calcItemTotal(item), 0) || 0;

  const { serviceFeeAmount, vatAmount, total } = useMemo(() => {
    const service = (subtotal * serviceFeeRate) / 100;
    const vat = ((subtotal + service) * vatRate) / 100;
    return { serviceFeeAmount: service, vatAmount: vat, total: subtotal + service + vat };
  }, [subtotal, vatRate, serviceFeeRate]);

  const hasFees = serviceFeeRate > 0 || vatRate > 0;
  const finalTotal = hasFees ? total : order.totalAmount || total;

  return (
    <div className="mt-4 rounded-b-2xl border-t border-slate-100 bg-slate-50/50 px-5 py-4">
      <div className="flex items-center justify-between py-1 text-sm text-slate-600">
        <span>Tạm tính</span>
        <span className="font-semibold text-gray-900">{formatPrice(subtotal)}</span>
      </div>
      {serviceFeeRate > 0 && (
        <div className="flex items-center justify-between py-1 text-sm text-slate-600">
          <span>Phí dịch vụ ({serviceFeeRate}%)</span>
          <span className="font-semibold text-gray-900">+{formatPrice(serviceFeeAmount)}</span>
        </div>
      )}
      {vatRate > 0 && (
        <div className="flex items-center justify-between py-1 text-sm text-slate-600">
          <span>VAT ({vatRate}%)</span>
          <span className="font-semibold text-gray-900">+{formatPrice(vatAmount)}</span>
        </div>
      )}
      {order.orderType === 'delivery' && (
        <div className="flex items-center justify-between py-1 text-sm text-slate-600">
          <span>Phí giao hàng</span>
          <span className="font-semibold text-gray-900">{formatPrice(0)}</span>
        </div>
      )}
      <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-3">
        <span className="text-sm font-bold text-gray-900">Tổng cộng</span>
        <span className="text-2xl font-extrabold tracking-tight text-cerulean-blue-600">
          {formatPrice(finalTotal)}
        </span>
      </div>
    </div>
  );
}