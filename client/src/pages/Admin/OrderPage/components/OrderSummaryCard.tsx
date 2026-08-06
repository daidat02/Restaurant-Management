import type { IOrder } from '@/types/order.type';
import { calcItemTotal, formatPrice } from './orderDetailHelpers';

interface OrderSummaryCardProps {
  order: IOrder;
}

export default function OrderSummaryCard({ order }: OrderSummaryCardProps) {
  const subtotal =
    order.items?.reduce((acc, item) => acc + calcItemTotal(item), 0) || 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-bold text-gray-900 text-lg mb-4">Tổng quan thanh toán</h3>
      <div className="space-y-3 text-sm text-gray-600 mb-4 pb-4 border-b border-dashed border-gray-200">
        <div className="flex justify-between">
          <span>Tạm tính ({order.itemsCount || order.items?.length || 0} món):</span>
          <span className="font-medium text-gray-900">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-green-600">
          <span>Giảm giá:</span>
          <span>- 0 đ</span>
        </div>
        <div className="flex justify-between">
          <span>VAT (8%):</span>
          <span className="font-medium text-gray-900">0 đ</span>
        </div>
        {order.orderType === 'delivery' && (
          <div className="flex justify-between">
            <span>Phí giao hàng:</span>
            <span className="font-medium text-gray-900">0 đ</span>
          </div>
        )}
      </div>
      <div className="flex justify-between items-center text-xl font-extrabold text-gray-900">
        <span>Tổng cộng:</span>
        <span className="text-cerulean-blue-600">{formatPrice(order.totalAmount || 0)}</span>
      </div>
    </div>
  );
}