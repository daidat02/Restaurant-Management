import { useEffect, useState } from 'react';
import { CustomTabs } from '@/components/tabsCustom';
import { useNavigate } from 'react-router-dom';
import { useOrder } from '@/hooks/use-order';
import { useAuth } from '@/hooks/use-auth';
import { useActiveRestaurantId } from '@/hooks/use-active-restaurant';
import PlanGate from '@/components/PlanGate';
import type { IOrder } from '@/types/order.type';

import { PaymentModal } from '../components/PaymentModal';
import { OrderCard } from './components/orderCard';
import OrderDetailDrawer from '../components/OrderDetailDrawer';
import { AlertDialogCustom } from '@/components/AlertDialog';

export interface OrderItemProps {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
  amount: number;
}

export default function Order() {
  const { fetchActiveOrders, orders, fetchOrderById, startListeningRestaurantSocket } = useOrder();
  const { user } = useAuth();
  const activeRestaurantId = useActiveRestaurantId();
  const navigate = useNavigate();
  const currentRole = user?.role || 'staff';

  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<IOrder | null>(null);

  const [orderIdSelected, setOrderIdSelected] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);

  // Lọc dữ liệu theo tab (Dựa trên orderType)
  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'all') return true;
    return order.orderType === activeTab; // 'dine-in' | 'delivery' | 'go-to'
  });

  useEffect(() => {
    if (activeRestaurantId) {
      fetchActiveOrders(activeRestaurantId);
      startListeningRestaurantSocket(activeRestaurantId);
    }
  }, [fetchActiveOrders, startListeningRestaurantSocket, activeRestaurantId]);

  return (
    <div className="flex h-full flex-col bg-[#f8f9fc] overflow-hidden">
      <PaymentModal
        isOpen={isPaymentModalOpen}
        orderId={orderIdSelected}
        onOpen={() => setIsPaymentModalOpen(true)}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setOrderIdSelected(null);
        }}
        onPaymentSucess={() => {
          fetchActiveOrders(activeRestaurantId);
          setSelectedOrder(null);
        }}
      />

      {/* DANH SÁCH ĐƠN HÀNG */}
      <div className="flex-1 p-4 lg:p-6 overflow-y-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
          <div className="overflow-x-auto pb-1 sm:pb-0 hide-scrollbar w-[90%]">
            <CustomTabs
              tabs={[
                { id: 'all', label: 'Tất cả' },
                { id: 'dine-in', label: 'Tại quán' },
                { id: 'delivery', label: 'Giao Hàng' },
                { id: 'to-go', label: 'Mua về' },
              ]}
              activeTab={activeTab}
              onTabChange={(id) => {
                setActiveTab(id);
                setSelectedOrder(null);
              }}
            />
          </div>

          {/* Nút tạo đơn nhanh */}
          <PlanGate resource="daily_orders" fallbackMode="upsell">
            <button
              onClick={() => navigate(`/${currentRole}/orders/pos`)}
              className="bg-cerulean-blue-600 hover:bg-cerulean-blue-500 text-white px-4 py-2.5 sm:py-2 rounded-lg text-[13px] sm:text-[12px] font-semibold shadow-md transition-all shrink-0 w-full sm:w-auto text-center"
            >
              + Đơn mới
            </button>
          </PlanGate>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order?._id}
              order={order}
              isSelected={selectedOrder?._id === order?._id}
              onClick={async () => {
                const result = await fetchOrderById(order._id || '');
                if (result) {
                  setSelectedOrder(result);
                }
              }}
              onOpenPayment={(orderId) => {
                if (order?.status == 'served') {
                  setOrderIdSelected(orderId);
                  setIsPaymentModalOpen(true);
                } else {
                  setAlertDialogOpen(true);
                }
              }}
            />
          ))}

          {filteredOrders.length === 0 && (
            <div className="col-span-full py-10 text-center text-gray-400 text-sm">
              Không có đơn hàng nào.
            </div>
          )}
        </div>
      </div>

      {/* DRAWER CHI TIẾT ĐƠN (Mobile: bottom sheet, Desktop: slide-over) */}
      <OrderDetailDrawer
        key={selectedOrder?._id || 'none'}
        open={selectedOrder !== null}
        onClose={() => {
          setSelectedOrder(null);
          setOrderIdSelected(null);
        }}
        order={selectedOrder}
        onAddMore={(order) => {
          setSelectedOrder(null);
          navigate(
            `/${currentRole}/orders/pos?orderId=${order._id}&tableId=${typeof order.table === 'object' ? order.table?._id : ''}`,
          );
        }}
        onPayment={(orderId, status) => {
          if (status == 'served') {
            setSelectedOrder(null);
            setOrderIdSelected(orderId);
            setIsPaymentModalOpen(true);
          } else {
            setAlertDialogOpen(true);
          }
        }}
        onOrderUpdated={(updated) => setSelectedOrder(updated)}
      />
      <AlertDialogCustom
        open={!!alertDialogOpen}
        onOpenChange={(open) => !open && setAlertDialogOpen(false)}
        variant="warning"
        title="Đơn hàng đang chờ hoàn tất"
        description={
          alertDialogOpen
            ? `Bàn đang có món chưa phục vụ. Vui lòng hoàn tất hoặc hủy các món còn lại trước khi thanh toán.`
            : ''
        }
        confirmText="Đồng ý"
        cancelText="Huỷ"
        onCancel={() => setAlertDialogOpen(false)}
      />
    </div>
  );
}
