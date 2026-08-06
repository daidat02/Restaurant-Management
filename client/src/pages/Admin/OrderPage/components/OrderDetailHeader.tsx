import { Button } from '@/components/ui/button';
import { Printer, RotateCcw, ChevronDown, ArrowLeft } from 'lucide-react';
import type { IOrder } from '@/types/order.type';

interface OrderDetailHeaderProps {
  order: IOrder;
  onBack: () => void;
}

export default function OrderDetailHeader({ order, onBack }: OrderDetailHeaderProps) {
  return (
    <div className="flex justify-between items-start mb-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Đơn hàng #{order?.orderId}</h1>
        </div>
        <div className="text-sm text-gray-500 flex items-center gap-2 ml-10">
          <span>
            Ngày tạo:{' '}
            {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : 'N/A'}
          </span>
          <span>•</span>
          <span className="text-cerulean-blue-600 font-medium">
            {order.orderType === 'dine-in'
              ? 'Tại bàn'
              : order.orderType === 'delivery'
                ? 'Giao hàng'
                : 'Mang đi'}
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="text-gray-700 bg-white">
          <Printer className="mr-2 h-4 w-4" /> In Bill
        </Button>
        <Button
          variant="outline"
          className="text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100"
        >
          <RotateCcw className="mr-2 h-4 w-4" /> Hoàn tiền
        </Button>
        <Button variant="outline" className="text-gray-700 bg-white">
          Thao tác khác <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
