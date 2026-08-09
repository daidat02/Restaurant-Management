import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShoppingBag,
  CalendarDays,
  MapPin,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  Eye,
  XCircle,
  PackageSearch,
  CalendarX,
} from 'lucide-react';
import { useOrder } from '@/hooks/use-order';
import { useReservation } from '@/hooks/use-reservation';
import { StatusTag } from '@/components/StatusTag';
import { Skeleton } from '@/components/ui/skeleton';
import SideDrawer from '@/components/SideDrawer';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from '@/components/ui/empty';
import type { IOrder } from '@/types/order.type';
import type { IReservation } from '@/types/reservation.type';
import type { IRestaurant } from '@/types/restaurant.type';
import { formatVND } from '@/utils/helpers';
import { mergeOrderItems } from '@/utils/orderItems';
import { cn } from '@/lib/utils';

// Danh sách trạng thái đơn hàng (cho bộ lọc)
const ORDER_STATUSES = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'preparing', label: 'Đang chuẩn bị' },
  { value: 'served', label: 'Đã phục vụ' },
  { value: 'delivered', label: 'Đã giao' },
  { value: 'paid', label: 'Đã thanh toán' },
  { value: 'cancelled', label: 'Đã hủy' },
];

// Danh sách trạng thái đặt bàn (cho bộ lọc)
const RESERVATION_STATUSES = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'checked_in', label: 'Đã nhận bàn' },
  { value: 'cancelled', label: 'Đã hủy' },
];

const PAGE_SIZE = 6;

const formatDateTime = (value?: Date | string) => {
  if (!value) return '--';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getRestaurantName = (restaurant?: IRestaurant | string) => {
  if (!restaurant) return 'NhamNhi';
  if (typeof restaurant === 'object') return restaurant.name || 'NhamNhi';
  return 'NhamNhi';
};

// ==========================================
// 1. MODAL CHI TIẾT ĐƠN HÀNG
// ==========================================
function OrderDetailDrawer({
  order,
  onClose,
}: {
  order: IOrder | null;
  onClose: () => void;
}) {
  return (
    <SideDrawer
      isOpen={!!order}
      onClose={onClose}
      title="Chi tiết đơn hàng"
      description={order?.orderId ? `Mã đơn: ${order.orderId}` : undefined}
      className="sm:max-w-lg"
    >
      {order && (
        <div className="px-6 py-5 space-y-5">
          {/* THÔNG TIN CHUNG */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-gray-400">Ngày đặt</p>
              <p className="text-sm font-semibold text-gray-800">{formatDateTime(order.createdAt)}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-xs text-gray-400">Trạng thái</p>
              <StatusTag status={order.status || ''} />
            </div>
          </div>

          {/* LOẠI ĐƠN + THANH TOÁN */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Loại đơn</p>
              <p className="text-xs font-bold text-gray-800 mt-1 capitalize">
                {order.orderType === 'dine-in'
                  ? 'Tại bàn'
                  : order.orderType === 'delivery'
                    ? 'Giao hàng'
                    : order.orderType === 'to-go'
                      ? 'Mang đi'
                      : '--'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Thanh toán</p>
              <div className="mt-1">
                <StatusTag status={order.paymentStatus || ''} />
              </div>
            </div>
          </div>

          {/* ĐỊA CHỈ GIAO HÀNG */}
          {order.orderType === 'delivery' && order.deliveryInfo && (
            <div className="bg-orange-50/60 border border-orange-100 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <MapPin className="h-3.5 w-3.5 text-orange-500" />
                <p className="text-xs font-bold text-orange-700">Thông tin giao hàng</p>
              </div>
              <p className="text-xs text-gray-700">
                {order.deliveryInfo.name} • {order.deliveryInfo.phone}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{order.deliveryInfo.address}</p>
              {order.deliveryInfo.note && (
                <p className="text-xs text-gray-400 mt-0.5">Ghi chú: {order.deliveryInfo.note}</p>
              )}
            </div>
          )}

          {/* DANH SÁCH MÓN */}
          <div>
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-2">
              Món đã gọi ({order.items?.length || order.itemsCount || 0})
            </p>
            <div className="space-y-2">
              {mergeOrderItems(order.items || []).map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">
                      {item.nameSnapshot}
                    </p>
                    {item.toppings && item.toppings.length > 0 && (
                      <p className="text-[10px] text-cerulean-blue-600 truncate">
                        + {item.toppings.map((t) => t.name).join(', ')}
                      </p>
                    )}
                    {item.note && (
                      <p className="text-[10px] text-amber-600 truncate">Ghi chú: {item.note}</p>
                    )}
                    <p className="text-[10px] text-gray-400">SL: x{item.quantity}</p>
                  </div>
                  <p className="text-xs font-bold text-gray-800 shrink-0">
                    {formatVND((item.priceSnapshot || 0) * (item.quantity || 1))}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* TỔNG TIỀN */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <p className="text-sm font-bold text-gray-900">Tổng tiền</p>
            <p className="text-base font-bold text-orange-600">
              {formatVND(order.totalAmount || 0)}
            </p>
          </div>
        </div>
      )}
    </SideDrawer>
  );
}

// ==========================================
// 2. MODAL CHI TIẾT ĐẶT BÀN
// ==========================================
function ReservationDetailDrawer({
  reservation,
  onClose,
}: {
  reservation: IReservation | null;
  onClose: () => void;
}) {
  return (
    <SideDrawer
      isOpen={!!reservation}
      onClose={onClose}
      title="Chi tiết đặt bàn"
      description={reservation?.reservationId ? `Mã đặt bàn: ${reservation.reservationId}` : undefined}
      className="sm:max-w-lg"
    >
      {reservation && (
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Nhà hàng</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">
                {getRestaurantName(reservation.restaurant)}
              </p>
            </div>
            <StatusTag status={reservation.status || ''} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-orange-500 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-400">Ngày</p>
                <p className="text-xs font-bold text-gray-800">
                  {new Date(reservation.date).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-400">Giờ</p>
                <p className="text-xs font-bold text-gray-800">{reservation.reservationTime}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-500 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-400">Số người</p>
                <p className="text-xs font-bold text-gray-800">{reservation.partySize} người</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-orange-500 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-400">Khách</p>
                <p className="text-xs font-bold text-gray-800 truncate">
                  {reservation.customerInfo?.name || '--'}
                </p>
              </div>
            </div>
          </div>

          {reservation.customerInfo?.note && (
            <div className="bg-orange-50/60 border border-orange-100 rounded-xl p-3">
              <p className="text-xs font-bold text-orange-700 mb-1">Ghi chú</p>
              <p className="text-xs text-gray-600">{reservation.customerInfo.note}</p>
            </div>
          )}
        </div>
      )}
    </SideDrawer>
  );
}

// ==========================================
// 3. PAGINATION ĐƠN GIẢN
// ==========================================
function PaginationBar({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:border-orange-300 hover:text-orange-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={cn(
            'h-8 w-8 rounded-lg text-xs font-semibold transition-colors',
            p === page
              ? 'bg-orange-500 text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-500 hover:border-orange-300 hover:text-orange-500',
          )}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:border-orange-300 hover:text-orange-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ==========================================
// 4. TRANG CHÍNH
// ==========================================
export default function AccountOrders() {
  const { orders, isLoading: isLoadingOrders, fetchMyOrders } = useOrder();
  const {
    reservations,
    isLoading: isLoadingReservations,
    fetchMyReservations,
    cancelMyReservation,
  } = useReservation();

  const [activeTab, setActiveTab] = useState<'orders' | 'reservations'>('orders');
  const [orderFilter, setOrderFilter] = useState('all');
  const [reservationFilter, setReservationFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<IOrder | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<IReservation | null>(null);

  const loadData = useCallback(async () => {
    await Promise.all([fetchMyOrders(), fetchMyReservations()]);
  }, [fetchMyOrders, fetchMyReservations]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Lọc + sắp xếp đơn hàng
  const filteredOrders = useMemo(() => {
    const sorted = [...orders].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    );
    if (orderFilter === 'all') return sorted;
    return sorted.filter((o) => o.status === orderFilter);
  }, [orders, orderFilter]);

  // Phân trang đơn hàng
  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, page]);

  const filteredReservations = useMemo(() => {
    const sorted = [...reservations].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    );
    if (reservationFilter === 'all') return sorted;
    return sorted.filter((r) => r.status === reservationFilter);
  }, [reservations, reservationFilter]);

  const paginatedReservations = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredReservations.slice(start, start + PAGE_SIZE);
  }, [filteredReservations, page]);

  const handleCancelReservation = async (res: IReservation) => {
    await cancelMyReservation(res._id || '');
  };

  const renderOrderSkeleton = () =>
    Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-3 w-48" />
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>
    ));

  return (
    <div className="space-y-5">
      {/* ---------- TABS ĐƠN HÀNG / ĐẶT BÀN ---------- */}
      <div className="bg-white border border-gray-100 rounded-2xl p-1.5 flex gap-1 w-full">
        {(
          [
            { id: 'orders', label: 'Đơn hàng', icon: ShoppingBag },
            { id: 'reservations', label: 'Đặt bàn', icon: CalendarDays },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count =
            tab.id === 'orders' ? filteredOrders.length : filteredReservations.length;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
                setOrderFilter('all');
                setReservationFilter('all');
              }}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all',
                isActive
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-orange-50 hover:text-orange-600',
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px]',
                  isActive ? 'bg-white/20' : 'bg-gray-100 text-gray-500',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ---------- TAB ĐƠN HÀNG ---------- */}
      {activeTab === 'orders' && (
        <>
          {/* BỘ LỌC TRẠNG THÁI */}
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ORDER_STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => {
                  setOrderFilter(s.value);
                  setPage(1);
                }}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap border transition-colors',
                  orderFilter === s.value
                    ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-600',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* DANH SÁCH ĐƠN HÀNG */}
          {isLoadingOrders ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{renderOrderSkeleton()}</div>
          ) : paginatedOrders.length === 0 ? (
            <Empty className="bg-white border border-gray-100 rounded-2xl min-h-[300px]">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <PackageSearch className="h-6 w-6" />
                </EmptyMedia>
                <EmptyTitle>Chưa có đơn hàng</EmptyTitle>
                <EmptyDescription>
                  Bạn chưa có đơn hàng nào ở trạng thái này. Khám phá thực đơn ngay nhé!
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {paginatedOrders.map((order) => (
                <div
                  key={order._id}
                  className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-orange-200 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {order.orderId || `#${order._id?.slice(-6)}`}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <StatusTag status={order.status || ''} />
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold px-2 py-0.5 bg-gray-100 rounded">
                      {order.orderType === 'dine-in'
                        ? 'Tại bàn'
                        : order.orderType === 'delivery'
                          ? 'Giao hàng'
                          : order.orderType === 'to-go'
                            ? 'Mang đi'
                            : 'Khác'}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {order.itemsCount || order.items?.length || 0} món
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-[10px] text-gray-400">Tổng tiền</p>
                      <p className="text-sm font-bold text-orange-600">
                        {formatVND(order.totalAmount || 0)}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 border border-gray-200 px-3.5 py-2 text-[11px] font-semibold text-gray-700 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Chi tiết
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <PaginationBar
            page={page}
            totalPages={Math.ceil(filteredOrders.length / PAGE_SIZE)}
            onChange={setPage}
          />
        </>
      )}

      {/* ---------- TAB ĐẶT BÀN ---------- */}
      {activeTab === 'reservations' && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {RESERVATION_STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => {
                  setReservationFilter(s.value);
                  setPage(1);
                }}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap border transition-colors',
                  reservationFilter === s.value
                    ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-600',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          {isLoadingReservations ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{renderOrderSkeleton()}</div>
          ) : paginatedReservations.length === 0 ? (
            <Empty className="bg-white border border-gray-100 rounded-2xl min-h-[300px]">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarX className="h-6 w-6" />
                </EmptyMedia>
                <EmptyTitle>Chưa có lịch đặt bàn</EmptyTitle>
                <EmptyDescription>
                  Bạn chưa đặt bàn lần nào. Đặt bàn ngay để có chỗ ngồi ưng ý!
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {paginatedReservations.map((res) => (
                <div
                  key={res._id}
                  className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-orange-200 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {res.reservationId}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {getRestaurantName(res.restaurant)}
                      </p>
                    </div>
                    <StatusTag status={res.status || ''} />
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-[11px] text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5 text-orange-500" />
                      {new Date(res.date).toLocaleDateString('vi-VN')}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-orange-500" />
                      {res.reservationTime}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-orange-500" />
                      {res.partySize} người
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                    {(res.status === 'pending' || res.status === 'confirmed') && (
                      <button
                        onClick={() => handleCancelReservation(res)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2 text-[11px] font-semibold text-red-600 hover:bg-red-500 hover:text-white transition-colors"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Hủy đặt
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedReservation(res)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 border border-gray-200 px-3.5 py-2 text-[11px] font-semibold text-gray-700 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Chi tiết
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <PaginationBar
            page={page}
            totalPages={Math.ceil(filteredReservations.length / PAGE_SIZE)}
            onChange={setPage}
          />
        </>
      )}

      {/* DRAWERS */}
      <OrderDetailDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      <ReservationDetailDrawer
        reservation={selectedReservation}
        onClose={() => setSelectedReservation(null)}
      />
    </div>
  );
}
