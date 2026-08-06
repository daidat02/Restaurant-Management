import { ChevronDown } from 'lucide-react';
import { StatusTag } from '@/components/StatusTag';
import type { IOrder } from '@/types/order.type';

interface OrderStatusControlProps {
  order: IOrder;
  onStatusChange: (id: string, status: string) => void;
}

export default function OrderStatusControl({ order, onStatusChange }: OrderStatusControlProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-bold text-gray-900 text-lg mb-4">Trạng thái</h3>

      <div className="space-y-5">
        {/* Trạng thái Đơn hàng */}
        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">Trạng thái đơn hàng</p>
          <div className="relative border border-gray-200 rounded-lg bg-gray-50/50 hover:border-gray-300 transition-colors focus-within:ring-2 focus-within:ring-cerulean-blue-200">
            <select
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              value={order.status}
              onChange={(e) => {
                if (order._id) {
                  onStatusChange(order._id, e.target.value);
                }
              }}
            >
              <option value="pending">Chờ xác nhận</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="delivered">Đã giao hàng</option>
              <option value="cancelled">Đã hủy</option>
            </select>

            <div className="p-3.5 flex justify-between items-center pointer-events-none">
              <StatusTag status={order.status || ''} />
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}