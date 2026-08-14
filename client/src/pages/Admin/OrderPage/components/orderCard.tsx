import type { IOrder } from '@/types/order.type';
import { getTimeAgo } from '@/utils/helpers';
import { useAuth } from '@/hooks/use-auth';
import {
  Clock,
  CircleCheck,
  ChefHat,
  Utensils,
  Ban,
  CheckCheck,
  Printer,
  SquarePen,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OrderCardProps {
  order: IOrder;
  isSelected: boolean;
  onClick?: () => void;
  onOpenPayment?: (orderId: string | null) => void;
  isPayment?: boolean; // Thêm prop để xác
}

// Tone màu + icon theo preview orders.html
const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  pending: { label: 'Chờ xử lý', cls: 'bg-slate-100 text-slate-500', icon: Clock },
  confirmed: { label: 'Đã xác nhận', cls: 'bg-sky-50 text-sky-700', icon: CheckCheck },
  preparing: { label: 'Đang chế biến', cls: 'bg-violet-50 text-violet-700', icon: ChefHat },
  serving: { label: 'Đang phục vụ', cls: 'bg-cyan-50 text-cyan-700', icon: Utensils },
  served: { label: 'Đã phục vụ', cls: 'bg-emerald-50 text-emerald-700', icon: Utensils },
  delivered: { label: 'Đã giao hàng', cls: 'bg-teal-50 text-teal-700', icon: Utensils },
  paid: { label: 'Đã thanh toán', cls: 'bg-emerald-50 text-emerald-700', icon: CircleCheck },
  completed: { label: 'Hoàn thành', cls: 'bg-emerald-50 text-emerald-700', icon: CircleCheck },
  cancelled: { label: 'Đã hủy', cls: 'bg-red-50 text-red-600', icon: Ban },
};

const TYPE_LABELS: Record<string, string> = {
  'dine-in': 'Tại quán',
  delivery: 'Giao hàng',
  'to-go': 'Mua về',
};

const money = (n: number) => `${Math.round(n || 0).toLocaleString('vi-VN')}₫`;

export const OrderCard = ({
  order,
  isSelected,
  onClick,
  onOpenPayment,
  isPayment = true,
}: OrderCardProps) => {
  const { user } = useAuth();
  const currentRole = user?.role || 'staff';
  const navigate = useNavigate();

  const currentStyle = STATUS_CONFIG[order?.status as string] || STATUS_CONFIG['pending'];
  const StatusIcon = currentStyle.icon;

  const isTerminal = ['paid', 'completed', 'cancelled'].includes(order?.status as string);

  const customerName =
    order.deliveryInfo?.name ||
    (typeof order?.customer === 'object' ? order?.customer?.name : null) ||
    'Khách lẻ';
  const itemsCount =
    order?.itemsCount || order?.items?.filter((i) => i.status !== 'deleted').length || 0;
  const total = order?.totalAmount || 0;

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-2xl border bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover ${
        isSelected
          ? 'border-cerulean-blue-300 ring-2 ring-cerulean-blue-500'
          : 'border-slate-200 hover:border-cerulean-blue-200'
      }`}
    >
      {/* Hàng 1: Mã đơn + loại + bàn | thời gian */}
      <div className="flex items-start justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold text-xs text-cerulean-blue-700">
            #{order.orderId || order._id?.slice(-6).toUpperCase()}
          </p>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold uppercase text-slate-500">
            {TYPE_LABELS[order?.orderType as string] || 'Tại quán'}
          </span>
          {order.orderType === 'dine-in' && order.table && (
            <span className="rounded-full bg-cerulean-blue-50 px-2 py-0.5 text-[8px] font-semibold text-cerulean-blue-700">
              Bàn {typeof order.table === 'object' ? order.table.tableNumber : ''}
            </span>
          )}
        </div>
        <span className="text-[8px] text-slate-400">
          {order.createdAt ? getTimeAgo(order.createdAt) : '-'}
        </span>
      </div>

      {/* Hàng 2: Khách · số món | tổng tiền */}
      <div className="mt-3 flex items-center justify-between">
        <p className="truncate text-sm font-medium text-slate-600">
          {customerName} · {itemsCount} món
        </p>
        <p className="text-lg font-extrabold text-gray-900">{money(total)}</p>
      </div>

      {/* Hàng 3: Trạng thái + nút action */}
      {!isTerminal && (
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${currentStyle.cls}`}
          >
            <StatusIcon className="h-3 w-3" />
            {currentStyle.label}
          </span>
          <div className="flex gap-1.5">
            {isPayment && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!order?._id) return;
                  onOpenPayment?.(order._id);
                }}
                className="rounded-lg bg-cerulean-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cerulean-blue-700"
              >
                Thanh toán
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/${currentRole}/orders/edit/${order._id}`, {
                  state: { orderData: order },
                });
              }}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-cerulean-blue-200 hover:text-cerulean-blue-600"
              title="Chỉnh sửa đơn"
            >
              <SquarePen className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-cerulean-blue-200 hover:text-cerulean-blue-600"
              title="In hóa đơn"
            >
              <Printer className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Footer trạng thái khi đã chốt (thanh toán / hoàn thành / hủy) */}
      {isTerminal ? (
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${currentStyle.cls}`}
          >
            <StatusIcon className="h-3 w-3" />
            {currentStyle.label}
          </span>
        </div>
      ) : null}
    </div>
  );
};
