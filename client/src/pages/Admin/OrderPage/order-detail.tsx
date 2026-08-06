import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrder } from '@/hooks/use-order';
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
      <div className="p-6 flex justify-center items-center h-full text-gray-500">
        Đang tải dữ liệu...
      </div>
    );
  }

  if (!currentOrder) {
    return <div className="p-6 text-center text-gray-500">Không tìm thấy đơn hàng!</div>;
  }

  return (
    <div className="p-2 h-full flex flex-col min-h-0 bg-gray-50/50">
      <OrderDetailHeader order={currentOrder} onBack={() => navigate(-1)} />

      <div className="flex-1 overflow-y-auto min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6">
        <div className="col-span-2 flex flex-col gap-6">
          {/* BẢNG MÓN */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <OrderItemsTable items={currentOrder.items || []} isLoading={isLoading} />
          </div>

          {/* THÔNG TIN GIAO HÀNG / PHỤC VỤ */}
          <OrderInfoCard order={currentOrder} />
        </div>

        {/* CỘT PHẢI (1/3): Summary & Status */}
        <div className="col-span-1 flex flex-col gap-6">
          <OrderSummaryCard order={currentOrder} />

          <OrderStatusControl
            order={currentOrder}
            onStatusChange={(orderId, status) => changeOrderStatus(orderId, status)}
          />
        </div>
      </div>
    </div>
  );
}