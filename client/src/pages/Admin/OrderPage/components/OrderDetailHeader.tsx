import { Button } from '@/components/ui/button';
import {
  Printer,
  RotateCcw,
  ChevronDown,
  ArrowLeft,
  Clock,
  UtensilsCrossed,
  Bike,
  ShoppingBag,
} from 'lucide-react';
import type { IOrder } from '@/types/order.type';

interface OrderDetailHeaderProps {
  order: IOrder;
  onBack: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Chờ xác nhận', cls: 'bg-orange-50 text-orange-600 ring-orange-100' },
  confirmed: { label: 'Đã xác nhận', cls: 'bg-sky-50 text-sky-700 ring-sky-100' },
  preparing: { label: 'Đang chuẩn bị', cls: 'bg-violet-50 text-violet-700 ring-violet-100' },
  served: { label: 'Đã phục vụ', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  delivered: { label: 'Đã giao', cls: 'bg-teal-50 text-teal-700 ring-teal-100' },
  paid: { label: 'Đã thanh toán', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  cancelled: { label: 'Đã hủy', cls: 'bg-rose-50 text-rose-600 ring-rose-100' },
};

const TYPE_CONFIG: Record<string, { label: string; icon: typeof UtensilsCrossed }> = {
  'dine-in': { label: 'Tại bàn', icon: UtensilsCrossed },
  delivery: { label: 'Giao hàng', icon: Bike },
  'to-go': { label: 'Mang đi', icon: ShoppingBag },
};

export default function OrderDetailHeader({ order, onBack }: OrderDetailHeaderProps) {
  const statusCfg = STATUS_CONFIG[order?.status || 'pending'] || STATUS_CONFIG.pending;
  const typeCfg = TYPE_CONFIG[order.orderType || 'dine-in'] || TYPE_CONFIG['dine-in'];
  const TypeIcon = typeCfg.icon;

  const payMethodLabel =
    order.orderType === 'delivery' ? 'Thanh toán khi nhận hàng (COD)' : 'Thanh toán tại quán';

  return (
    <div className="mb-6">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-cerulean-blue-600 transition hover:text-cerulean-blue-800"
      >
        <ArrowLeft className="h-4 w-4" /> Tất cả đơn hàng
      </button>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Đơn #{order?.orderId}
              </h1>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusCfg.cls}`}
              >
                {statusCfg.label}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                <TypeIcon className="h-3.5 w-3.5" />
                {typeCfg.label}
              </span>
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {order.createdAt
                  ? `Đặt lúc ${new Date(order.createdAt).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })} ${new Date(order.createdAt).toLocaleDateString('vi-VN')}`
                  : '--'}
              </span>
              <span>·</span>
              <span>{payMethodLabel}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="bg-white text-slate-700">
              <Printer className="mr-2 h-4 w-4" /> In Bill
            </Button>
            <Button
              variant="outline"
              className="border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100"
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Hoàn tiền
            </Button>
            <Button variant="outline" className="bg-white text-slate-700">
              Thao tác khác <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
