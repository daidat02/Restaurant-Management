import { useEffect, useState } from 'react';
import { Clock, User, Home, Bike, AlertTriangle } from 'lucide-react';
import type { IOrder, IOrderItem } from '@/types/order.type';

interface KitchenOrderCardProps {
  order: IOrder;
  onItemTap: (itemId: string, nextStatus: 'preparing' | 'served') => void;
}

const getNextStatus = (status?: string): 'preparing' | 'served' | null => {
  if (status === 'pending') return 'preparing';
  if (status === 'preparing') return 'served';
  return null;
};

const formatTime = (date?: Date | string) => {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

export function KitchenOrderCard({ order, onItemTap }: KitchenOrderCardProps) {
  const [minutesElapsed, setMinutesElapsed] = useState(0);

  useEffect(() => {
    const calculateTime = () => {
      const createdTime = new Date(order.createdAt || Date.now()).getTime();
      const diffMs = Date.now() - createdTime;
      setMinutesElapsed(Math.max(0, Math.floor(diffMs / 60000)));
    };

    calculateTime();
    const interval = setInterval(calculateTime, 30000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  let timerBg = 'bg-cerulean-blue-50 text-cerulean-blue-700 border-cerulean-blue-200';
  if (minutesElapsed >= 10 && minutesElapsed < 20) {
    timerBg = 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
  } else if (minutesElapsed >= 20) {
    timerBg = 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse font-bold';
  }

  const typeConfigs = {
    'dine-in': {
      label: order.table && typeof order.table !== 'string' ? `Bàn ${order.table.tableNumber}` : 'Tại quán',
      icon: <User className="h-3 w-3" />,
      color: 'bg-cerulean-blue-600 text-white',
    },
    'to-go': {
      label: 'Mang Về',
      icon: <Home className="h-3 w-3" />,
      color: 'bg-purple-600 text-white',
    },
    delivery: {
      label: order.deliveryInfo?.name || 'Giao hàng',
      icon: <Bike className="h-3 w-3" />,
      color: 'bg-orange-500 text-white',
    },
  };
  const currentType = typeConfigs[order.orderType || 'dine-in'];

  return (
    <div className="flex h-auto min-h-[280px] flex-col rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden transition-all">
      {/* CARD HEADER */}
      <div className="p-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 shrink-0 ${currentType.color}`}>
            {currentType.icon}
            {currentType.label}
          </span>
          <span className="text-[11px] font-extrabold text-gray-800 tracking-wide truncate">
            {order.orderId || order._id?.slice(-6).toUpperCase() || '—'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-medium text-gray-500">
            {formatTime(order.createdAt)}
          </span>
          <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[10px] font-medium ${timerBg}`}>
            <Clock className="h-2.5 w-2.5" />
            <span>{minutesElapsed} ph</span>
          </div>
        </div>
      </div>

      {/* CARD BODY: DANH SÁCH MÓN */}
      <div className="flex-1 p-2 overflow-y-auto divide-y divide-gray-100 bg-white">
        {(order.items || []).map((item: IOrderItem) => {
          const nextStatus = getNextStatus(item.status);
          const isServed = item.status === 'served';

          return (
            <button
              key={item._id}
              type="button"
              disabled={!nextStatus}
              onClick={() => nextStatus && onItemTap(item._id!, nextStatus)}
              title={
                isServed
                  ? 'Món đã xong'
                  : nextStatus === 'served'
                    ? 'Đánh dấu món đã xong'
                    : 'Bắt đầu nấu món'
              }
              className={`w-full py-1.5 flex items-start gap-1.5 text-left select-none transition-all ${
                isServed ? 'opacity-30 cursor-default' : 'cursor-pointer hover:bg-cerulean-blue-50/50'
              }`}
            >
              <span
                className={`inline-flex items-center justify-center min-w-[18px] h-5 px-1 rounded text-xs font-extrabold ${
                  isServed ? 'bg-gray-100 text-gray-400 line-through' : 'bg-gray-800 text-white'
                }`}
              >
                {item.quantity}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p
                    className={`text-xs font-bold text-gray-700 leading-tight ${
                      isServed ? 'line-through text-gray-400' : ''
                    }`}
                  >
                    {item.nameSnapshot}
                  </p>
                  {!isServed && (
                    <span
                      className={`shrink-0 text-[9px] font-bold px-1 py-0.5 rounded-full ${
                        item.status === 'preparing'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-gray-100 text-gray-500 border border-gray-200'
                      }`}
                    >
                      {item.status === 'preparing' ? 'Đang nấu' : 'Chờ'}
                    </span>
                  )}
                </div>

                {item.toppings && item.toppings.length > 0 && (
                  <span className="block mt-0.5 text-[10px] font-medium text-purple-700 bg-purple-50 px-1 rounded border border-purple-100">
                    + {item.toppings.map((t) => t.name).join(', ')}
                  </span>
                )}

                {item.note && (
                  <span className="inline-flex items-center gap-0.5 mt-0.5 text-[10px] font-medium text-amber-700 bg-amber-50 px-1 rounded border border-amber-100">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {item.note}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* CARD FOOTER: Thanh tiến độ món */}
      <div className="p-2 bg-white border-t border-gray-200 shrink-0">
        <div className="flex items-center gap-1">
          <span className={`h-1 flex-1 rounded-full ${(order.items || []).some((i) => i.status === 'served') ? 'bg-cerulean-blue-600' : 'bg-gray-200'}`} />
          <span className={`h-1 flex-1 rounded-full ${(order.items || []).some((i) => i.status === 'preparing') ? 'bg-amber-500' : 'bg-gray-200'}`} />
          <span className={`h-1 flex-1 rounded-full ${(order.items || []).some((i) => i.status === 'pending') ? 'bg-gray-300' : 'bg-gray-200'}`} />
        </div>
      </div>
    </div>
  );
}
