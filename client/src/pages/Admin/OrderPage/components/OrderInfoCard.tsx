import { MapPin, Phone, User, Clock } from 'lucide-react';
import type { IOrder } from '@/types/order.type';

interface OrderInfoCardProps {
  order: IOrder;
}

export default function OrderInfoCard({ order }: OrderInfoCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
      {order.orderType === 'delivery' ? (
        <>
          <div>
            <h3 className="font-bold text-gray-900 mb-4 text-lg">Thông tin giao hàng</h3>
            <div className="space-y-4 text-sm">
              <div className="flex gap-3">
                <User className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-500 font-medium">Người nhận</p>
                  <p className="text-gray-900">{order.deliveryInfo?.name || '---'}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Phone className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-500 font-medium">Số điện thoại</p>
                  <p className="text-blue-600 font-medium">{order.deliveryInfo?.phone || '---'}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-500 font-medium">Địa chỉ nhận hàng</p>
                  <p className="text-gray-900 leading-relaxed">
                    {order.deliveryInfo?.address || '---'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-4 text-lg">Chi tiết khác</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-gray-500 font-medium mb-1">Ghi chú của khách</p>
                <p className="text-gray-900 bg-amber-50 p-3 rounded-lg border border-amber-100 italic leading-relaxed">
                  {order.deliveryInfo?.note || order.notes || 'Không có ghi chú của khách'}
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div>
            <h3 className="font-bold text-gray-900 mb-4 text-lg">Chi tiết phục vụ</h3>
            <div className="space-y-4 text-sm">
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-500 font-medium">Khu vực / Bàn</p>
                  <p className="text-gray-900 font-semibold text-lg">
                    Bàn: {order.table?.tableNumber || 'Chưa xếp bàn'}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Clock className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-500 font-medium">Thời gian phục vụ</p>
                  <p className="text-gray-900">
                    {order.servedAt
                      ? new Date(order.servedAt).toLocaleTimeString('vi-VN')
                      : 'Đang chờ phục vụ'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-4 text-lg">Ghi chú</h3>
            <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-100 italic">
              {order.notes || 'Không có ghi chú nào cho đơn hàng này.'}
            </p>
          </div>
        </>
      )}
    </div>
  );
}