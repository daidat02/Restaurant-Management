import { useEffect, useState } from 'react';
import { CustomTabs } from '@/components/tabsCustom';
import { useNavigate } from 'react-router-dom';
import { useOrder } from '@/hooks/use-order';
import { useAuth } from '@/hooks/use-auth';
import type { IOrder } from '@/types/order.type';
import { PanelsTopLeft } from 'lucide-react';

import { extractId } from '@/utils/helpers';
import { PaymentModal } from '../components/PaymentModal';
import { OrderCard } from './components/orderCard';
import FormBillOrder from '../components/FormBillOrder';

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
  const navigate = useNavigate();
  const currentRole = user?.role || 'staff';

  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<IOrder | null>(null);

  const [orderIdSelected, setOrderIdSelected] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // STATE: Quản lý ẩn/hiện ngăn kéo chi tiết đơn hàng trên Mobile
  const [isMobileBillOpen, setIsMobileBillOpen] = useState(false);

  // Lọc dữ liệu theo tab (Dựa trên orderType)
  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'all') return true;
    return order.orderType === activeTab; // 'dine-in' | 'delivery' | 'go-to'
  });

  useEffect(() => {
    if (user?.restaurant) {
      fetchActiveOrders(extractId(user?.restaurant, '_id'));
      startListeningRestaurantSocket(extractId(user?.restaurant, '_id'));
    }
  }, [fetchActiveOrders, startListeningRestaurantSocket, user]);

  return (
    // Chuyển flex-row thành lg:flex-row và flex-col để responsive
    <div className="flex flex-col lg:flex-row flex-1 h-full bg-[#f8f9fc] overflow-hidden relative">
      <PaymentModal
        isOpen={isPaymentModalOpen}
        orderId={orderIdSelected}
        onOpen={() => setIsPaymentModalOpen(true)}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setOrderIdSelected(null);
        }}
        onPaymentSucess={() => {
          fetchActiveOrders(extractId(user?.restaurant, '_id'));
          setSelectedOrder(null);
        }}
      />

      {/* BÊN TRÁI: DANH SÁCH ĐƠN HÀNG */}
      <div className="flex-1 lg:flex-[1.5] p-4 lg:p-6 overflow-y-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
          <div className="overflow-x-auto pb-1 sm:pb-0 hide-scrollbar w-full">
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
                setIsMobileBillOpen(false); // Đóng drawer khi đổi tab
              }}
            />
          </div>

          {/* Nút tạo đơn nhanh */}
          <button
            onClick={() => navigate(`/${currentRole}/orders/pos`)}
            className="bg-cerulean-blue-600 hover:bg-cerulean-blue-500 text-white px-4 py-2.5 sm:py-2 rounded-lg text-[13px] sm:text-[12px] font-semibold shadow-md transition-all shrink-0 w-full sm:w-auto text-center"
          >
            + Đơn mới
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3 lg:gap-4">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order?._id}
              order={order}
              isSelected={selectedOrder?._id === order?._id}
              onClick={async () => {
                const result = await fetchOrderById(order._id || '');
                if (result) {
                  setSelectedOrder(result);
                  setIsMobileBillOpen(true); // Trượt Drawer ra trên mobile
                }
              }}
              onOpenPayment={(orderId) => {
                setOrderIdSelected(orderId);
                setIsPaymentModalOpen(true);
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

      {/* ========================================= */}
      {/* BÊN PHẢI: CHI TIẾT ĐƠN HÀNG (DRAWER) */}
      {/* ========================================= */}

      {/* Lớp phủ màn hình khi mở Drawer */}
      {isMobileBillOpen && (
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileBillOpen(false)}
        />
      )}

      {/* Container Drawer */}
      <div
        className={`
          fixed inset-y-0 right-0 w-[85vw] sm:w-[400px] z-50 bg-white shadow-2xl transition-transform duration-300 flex flex-col
          lg:static lg:flex-1 lg:h-full lg:w-auto lg:min-w-[320px] lg:max-w-[450px] lg:translate-x-0 lg:border-l lg:border-gray-100
          ${isMobileBillOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header của Drawer (Mobile) */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <h2 className="font-bold text-gray-800 text-lg">Chi tiết hóa đơn</h2>
          <button
            onClick={() => setIsMobileBillOpen(false)}
            className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-hidden relative flex flex-col">
          {selectedOrder ? (
            <FormBillOrder
              order={selectedOrder || undefined}
              orderItems={selectedOrder?.items || []}
              tableInfo={selectedOrder?.table}
              onClearOrder={() => {
                setSelectedOrder(null);
                setOrderIdSelected(null);
                setIsMobileBillOpen(false); // Tự động đóng Drawer
              }}
              onTriggerPayment={(orderId) => {
                setOrderIdSelected(orderId);
                setIsPaymentModalOpen(true);
                setIsMobileBillOpen(false); // Tạm ẩn Drawer nhường chỗ cho Modal thanh toán
              }}
            />
          ) : (
            // Placeholder hiển thị trên Desktop khi chưa chọn
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/50">
              <div className="w-16 h-16 mb-4 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center text-gray-300">
                <PanelsTopLeft />
              </div>
              <h3 className="text-sm font-bold text-gray-600 mb-1">Chưa chọn đơn hàng</h3>
              <p className="text-[11px] text-gray-400">
                Vui lòng chọn một hóa đơn bên trái để xem chi tiết
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
