import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrder } from '@/hooks/use-order';
import { StatusTag } from '@/components/StatusTag';
import { CreditCard, Wallet } from 'lucide-react';
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
      <div className="p-4 md:p-6">
        <OrderDetailHeader order={currentOrder} onBack={() => navigate(-1)} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 md:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* ===== CỘT CHÍNH ===== */}
          <div className="flex flex-col gap-6">
            {/* CARD SẢN PHẨM + TÓM TẮT */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-card">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 pb-4 pt-5">
                <h3 className="font-bold text-slate-900">Sản phẩm</h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {currentOrder.itemsCount || currentOrder.items?.length || 0} món
                </span>
              </div>
              <div className="px-6">
                <OrderItemsTable items={currentOrder.items || []} isLoading={isLoading} />
              </div>
              <div className="px-6 pb-6">
                <OrderSummaryCard order={currentOrder} />
              </div>
            </div>
          </div>

          {/* ===== SIDEBAR ===== */}
          <div className="flex flex-col gap-6">
            {/* CẬP NHẬT TRẠNG THÁI */}
            <OrderStatusControl
              order={currentOrder}
              onStatusChange={(orderId, status) => changeOrderStatus(orderId, status)}
            />

            {/* KHÁCH HÀNG */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <h3 className="mb-4 font-bold text-slate-900">Khách hàng</h3>
              <OrderInfoCard order={currentOrder} />
            </div>

            {/* THANH TOÁN */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <div className="mb-4 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-cerulean-blue-600" />
                <h3 className="font-bold text-slate-900">Thanh toán</h3>
              </div>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="mb-1 font-medium text-slate-500">Phương thức</p>
                  <p className="flex items-center gap-1.5 font-medium text-slate-900">
                    <Wallet className="h-4 w-4 text-slate-400" />
                    {payMethodLabel}
                  </p>
                </div>
                <div>
                  <p className="mb-1.5 font-medium text-slate-500">Tình trạng</p>
                  <StatusTag status={currentOrder.paymentStatus || ''} />
                </div>
                {currentOrder.paidAt && (
                  <div>
                    <p className="mb-1 font-medium text-slate-500">Đã thanh toán lúc</p>
                    <p className="text-slate-900">
                      {new Date(currentOrder.paidAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
