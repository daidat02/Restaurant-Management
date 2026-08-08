import { useEffect, useState } from 'react';
import { CustomTabs } from '@/components/tabsCustom';
import type { ITable } from '@/types/table.type';
import { useNavigate } from 'react-router-dom';
import { useTable } from '@/hooks/use-table';
import { useAuth } from '@/hooks/use-auth';
import { useOrder } from '@/hooks/use-order';

import { usePayment } from '@/hooks/use-payment';
import { useActiveRestaurantId } from '@/hooks/use-active-restaurant';
import type { IOrder } from '@/types/order.type';
import { PaymentModal } from '../components/PaymentModal';
import { TableCard } from './components/TableCard';
import OrderDetailDrawer from '../components/OrderDetailDrawer';

export default function Table() {
  const { user } = useAuth();
  const currentRole = user?.role || 'staff';
  const activeRestaurantId = useActiveRestaurantId();
  const { fetchOrderById } = useOrder();
  const { tables, fetchTablesByRestaurant, changeTableStatus } = useTable();
  const { updatePaymentStatus } = usePayment();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<IOrder | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [orderIdSelected, setOrderIdSelected] = useState<string | null>(null);

  // Lọc dữ liệu theo tab
  const filteredTables = tables.filter((table) => {
    if (activeTab === 'all') return true;
    return table.status === activeTab;
  });

  useEffect(() => {
    fetchTablesByRestaurant(activeRestaurantId);
  }, [fetchTablesByRestaurant, updatePaymentStatus, activeRestaurantId]);

  // Mở chi tiết đơn khi chọn bàn đang phục vụ
  const handleSelectTable = async (table: ITable) => {
    if (table.status === 'available') return;
    const orderId =
      typeof table.currentOrder === 'object' ? table.currentOrder?._id : table.currentOrder;
    if (!orderId) return;
    const result = await fetchOrderById(orderId);
    if (result) {
      setSelectedOrder(result);
      setIsDrawerOpen(true);
    }
  };

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
        onPaymentSucess={() => fetchTablesByRestaurant(activeRestaurantId)}
      />

      {/* DANH SÁCH BÀN */}
      <div className="flex-1 p-4 lg:p-6 overflow-y-auto w-full">
        <CustomTabs
          tabs={[
            { id: 'all', label: 'Tất Cả' },
            { id: 'available', label: 'Bàn Trống' },
            { id: 'occupied', label: 'Đang Phục Vụ' },
            { id: 'reserved', label: 'Đã Đặt' },
          ]}
          activeTab={activeTab}
          onTabChange={(id) => {
            setActiveTab(id);
            setSelectedOrder(null);
            setIsDrawerOpen(false);
          }}
        />

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTables.map((table) => (
            <TableCard
              key={table._id}
              table={table}
              isSelected={selectedOrder?._id === (typeof table.currentOrder === 'object' ? table.currentOrder?._id : '')}
              onClick={() => handleSelectTable(table)}
              onChangeStatus={(id, newStatus) => {
                changeTableStatus(id, newStatus);
              }}
              onOpenPayment={(orderId) => {
                setOrderIdSelected(orderId);
                setIsPaymentModalOpen(true);
              }}
              onCreateOrder={(tableId) => {
                navigate(`/${currentRole}/orders/pos?tableId=${tableId}`);
              }}
              restaurantName="Nham Nhi"
              restaurantId={activeRestaurantId}
              wifiName="Nham Nhi Quan"
              wifiPassword="xincamon"
            />
          ))}
        </div>
      </div>

      {/* DRAWER CHI TIẾT ĐƠN (Mobile: bottom sheet, Desktop: slide-over) */}
      <OrderDetailDrawer
        key={selectedOrder?._id || 'none'}
        open={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        tables={tables}
        onAddMore={(order) => {
          setIsDrawerOpen(false);
          setSelectedOrder(null);
          navigate(
            `/${currentRole}/orders/pos?orderId=${order._id}&tableId=${typeof order.table === 'object' ? order.table?._id : ''}`,
          );
        }}
        onPayment={(orderId) => {
          setIsDrawerOpen(false);
          setSelectedOrder(null);
          setOrderIdSelected(orderId);
          setIsPaymentModalOpen(true);
        }}
      />
    </div>
  );
}
