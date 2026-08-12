import { MapPin, Phone, User, Clock } from 'lucide-react';
import type { IOrder } from '@/types/order.type';

interface OrderInfoCardProps {
  order: IOrder;
}

export default function OrderInfoCard({ order }: OrderInfoCardProps) {
  return (
    <div className="space-y-5">
      {order.orderType === 'delivery' ? (
        <>
          <div>
            <h3 className="mb-3 font-bold text-slate-900">Thông tin giao hàng</h3>
            <div className="space-y-4 text-sm">
              <div className="flex gap-3">
                <User className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-500">Người nhận</p>
                  <p className="text-slate-900">{order.deliveryInfo?.name || '---'}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-500">Số điện thoại</p>
                  <p className="font-medium text-cerulean-blue-600">
                    {order.deliveryInfo?.phone || '---'}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-500">Địa chỉ nhận hàng</p>
                  <p className="leading-relaxed text-slate-900">
                    {order.deliveryInfo?.address || '---'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="mb-2 font-medium text-slate-500">Ghi chú của khách</p>
            <p className="rounded-lg border border-amber-100 bg-amber-50 p-3 italic leading-relaxed text-slate-900">
              {order.deliveryInfo?.note || order.notes || 'Không có ghi chú của khách'}
            </p>
          </div>
        </>
      ) : (
        <>
          <div>
            <h3 className="mb-3 font-bold text-slate-900">Chi tiết phục vụ</h3>
            <div className="space-y-4 text-sm">
              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-500">Khu vực / Bàn</p>
                  <p className="text-lg font-semibold text-slate-900">
                    Bàn: {order.table?.tableNumber || 'Chưa xếp bàn'}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-500">Thời gian phục vụ</p>
                  <p className="text-slate-900">
                    {order.servedAt
                      ? new Date(order.servedAt).toLocaleTimeString('vi-VN')
                      : 'Đang chờ phục vụ'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="mb-2 font-medium text-slate-500">Ghi chú</p>
            <p className="rounded-lg border border-slate-100 bg-slate-50 p-3 italic leading-relaxed text-slate-700">
              {order.notes || 'Không có ghi chú nào cho đơn hàng này.'}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
