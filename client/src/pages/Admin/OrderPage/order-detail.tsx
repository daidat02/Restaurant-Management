import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrder } from '@/hooks/use-order';
import { StatusTag } from '@/components/StatusTag';
import { CreditCard, Wallet, ShoppingBasket, UserRound } from 'lucide-react';
import OrderDetailHeader from './components/OrderDetailHeader';
import OrderItemsTable from './components/OrderItemsTable';
import OrderInfoCard from './components/OrderInfoCard';
import OrderSummaryCard from './components/OrderSummaryCard';
import OrderStatusControl from './components/OrderStatusControl';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { currentOrder, fetchOrderById, isLoading, changeOrderStatus } = useOrder();

  useEffect(() => {
    if (id) {
      fetchOrderById(id);
    }
  }, [id, fetchOrderById]);

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-slate-50 p-6 text-slate-500">
        Đang tải dữ liệu...
      </div>
    );
  }

  if (!currentOrder) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-slate-50 p-6 text-center text-slate-500">
        Không tìm thấy đơn hàng!
      </div>
    );
  }

  const payMethodLabel =
    currentOrder.orderType === 'delivery'
      ? 'Thanh toán khi nhận hàng (COD)'
      : 'Thanh toán tại quán';

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      <div className="shrink-0 p-4 md:p-6">
        <OrderDetailHeader order={currentOrder} onBack={() => navigate(-1)} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 md:px-6">
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* ===== CỘT CHÍNH ===== */}
          <div className="flex flex-col gap-5">
            {/* CARD SẢN PHẨM + TÓM TẮT */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2">
                  <ShoppingBasket className="h-5 w-5 text-cerulean-blue-600" />
                  <h3 className="text-sm font-bold text-gray-900">Sản phẩm</h3>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                  {currentOrder.itemsCount || currentOrder.items?.length || 0} món
                </span>
              </div>
              <div className="px-5">
                <OrderItemsTable items={currentOrder.items || []} isLoading={isLoading} />
              </div>
              <div className="px-5 pb-5">
                <OrderSummaryCard order={currentOrder} />
              </div>
            </div>
          </div>

          {/* ===== SIDEBAR ===== */}
          <div className="flex flex-col gap-5">
            {/* KHÁCH HÀNG */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-card">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                <UserRound className="h-5 w-5 text-cerulean-blue-600" />
                <h3 className="text-sm font-bold text-gray-900">Khách hàng</h3>
              </div>
              <div className="px-5 py-4">
                <OrderInfoCard order={currentOrder} />
              </div>
            </div>

            {/* CẬP NHẬT TRẠNG THÁI — select theo loại đơn */}
            <OrderStatusControl
              order={currentOrder}
              onStatusChange={(orderId, status) => changeOrderStatus(orderId, status)}
            />

            {/* THANH TOÁN */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-card">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                <CreditCard className="h-5 w-5 text-cerulean-blue-600" />
                <h3 className="text-sm font-bold text-gray-900">Thanh toán</h3>
                <span className="ml-auto inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  Chưa thanh toán
                </span>
              </div>
              <div className="space-y-2.5 px-5 py-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Phương thức</span>
                  <span className="flex items-center gap-1.5 font-semibold text-gray-900">
                    <Wallet className="h-4 w-4 text-slate-400" />
                    {payMethodLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Tình trạng</span>
                  <StatusTag status={currentOrder.paymentStatus || ''} />
                </div>
                {currentOrder.paidAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Đã thanh toán lúc</span>
                    <span className="font-semibold text-gray-900">
                      {new Date(currentOrder.paidAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-sm font-bold text-gray-900">Tổng thanh toán</span>
                  <span className="text-lg font-extrabold text-cerulean-blue-600">
                    {currentOrder.totalAmount?.toLocaleString('vi-VN')}₫
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}