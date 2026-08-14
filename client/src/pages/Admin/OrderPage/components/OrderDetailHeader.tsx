import { Button } from '@/components/ui/button';
import {
  Printer,
  UtensilsCrossed,
  Bike,
  ShoppingBag,
  ArrowLeft,
  CalendarDays,
  Wallet,
  Clock,
  CheckCircle2,
  ChefHat,
  Utensils,
  Truck,
  XCircle,
} from 'lucide-react';
import type { IOrder } from '@/types/order.type';

interface OrderDetailHeaderProps {
  order: IOrder;
  onBack: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  pending: { label: 'Chờ xác nhận', cls: 'bg-orange-50 text-orange-600', icon: Clock },
  confirmed: { label: 'Đã xác nhận', cls: 'bg-sky-50 text-sky-700', icon: CheckCircle2 },
  preparing: { label: 'Đang chế biến', cls: 'bg-violet-50 text-violet-700', icon: ChefHat },
  serving: { label: 'Đang phục vụ', cls: 'bg-amber-50 text-amber-700', icon: Clock },
  served: { label: 'Đã phục vụ', cls: 'bg-emerald-50 text-emerald-700', icon: Utensils },
  delivered: { label: 'Đã giao', cls: 'bg-teal-50 text-teal-700', icon: Truck },
  paid: { label: 'Đã thanh toán', cls: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  completed: { label: 'Hoàn thành', cls: 'bg-blue-50 text-blue-700', icon: CheckCircle2 },
  cancelled: { label: 'Đã hủy', cls: 'bg-red-50 text-red-600', icon: XCircle },
};

const TYPE_CONFIG: Record<string, { label: string; icon: typeof UtensilsCrossed }> = {
  'dine-in': { label: 'Tại quán', icon: UtensilsCrossed },
  delivery: { label: 'Giao hàng', icon: Bike },
  'to-go': { label: 'Mua về', icon: ShoppingBag },
};

export default function OrderDetailHeader({ order, onBack }: OrderDetailHeaderProps) {
  const statusCfg = STATUS_CONFIG[order?.status || 'pending'] || STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;
  const typeCfg = TYPE_CONFIG[order.orderType || 'dine-in'] || TYPE_CONFIG['dine-in'];
  const TypeIcon = typeCfg.icon;

  const payMethodLabel =
    order.orderType === 'delivery' ? 'Thanh toán khi nhận hàng (COD)' : 'Thanh toán tại quán';

  const createdAt = order.createdAt
    ? new Date(order.createdAt).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '--';

  return (
    <div className="flex flex-wrap items-start gap-4">
      <button
        type="button"
        onClick={onBack}
        aria-label="Quay lại đơn hàng"
        title="Quay lại đơn hàng"
        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-card transition hover:border-cerulean-blue-200 hover:text-cerulean-blue-600"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 md:text-3xl">
            #{order.orderId || order._id || 'Đơn hàng'}
          </h1>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusCfg.cls}`}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {statusCfg.label}
          </span>
          {order.table?.tableNumber && (
            <span className="rounded-full bg-cerulean-blue-50 px-3 py-1 text-xs font-semibold text-cerulean-blue-700">
              Bàn {order.table.tableNumber}
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            {createdAt}
          </span>
          <span className="flex items-center gap-1.5">
            <TypeIcon className="h-4 w-4 text-slate-400" />
            {typeCfg.label}
          </span>
          <span className="flex items-center gap-1.5">
            <Wallet className="h-4 w-4 text-slate-400" />
            {payMethodLabel}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          className="h-10 cursor-pointer rounded-xl bg-white px-4 text-slate-600 shadow-card transition hover:border-cerulean-blue-200 hover:text-cerulean-blue-600"
        >
          <UtensilsCrossed className="size-4" />
          Thêm món
        </Button>
        <Button
          variant="outline"
          className="h-10 cursor-pointer rounded-xl bg-white px-4 text-slate-600 shadow-card transition hover:border-cerulean-blue-200 hover:text-cerulean-blue-600"
        >
          <Printer className="size-4" />
          In hóa đơn
        </Button>
        <Button
          className="h-10 cursor-pointer rounded-xl bg-cerulean-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-cerulean-blue-200 transition hover:bg-cerulean-blue-700"
        >
          <CheckCircle2 className="size-4" />
          Thanh toán
        </Button>
      </div>
    </div>
  );
}