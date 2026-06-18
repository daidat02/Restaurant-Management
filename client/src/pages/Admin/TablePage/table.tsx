import { useEffect, useState } from 'react';
import { CustomTabs } from '@/components/tabsCustom';
import type { ITable } from '@/types/table.type';
import { useNavigate } from 'react-router-dom';
import { useTable } from '@/hooks/use-table';
import { useAuth } from '@/hooks/use-auth';
import { useOrder } from '@/hooks/use-order';

import { usePayment } from '@/hooks/use-payment';
import { extractId } from '@/utils/helpers';
import type { IOrder } from '@/types/order.type';
import { PaymentModal } from '../components/PaymentModal';
import { TableCard } from './components/TableCard';
import FormBillOrder from '../components/FormBillOrder';
export interface OrderItemProps {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
  amount: number;
}

export default function Table() {
  const { user } = useAuth();
  const currentRole = user?.role || 'staff';
  const { fetchOrderById } = useOrder();
  const { tables, fetchTablesByRestaurant, changeTableStatus } = useTable();
  const { updatePaymentStatus } = usePayment();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('all');
  const [selectedTable, setSelectedTable] = useState<ITable | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [order, setOrder] = useState<IOrder | null>(null);
  const [orderIdSelected, setOrderIdSelected] = useState<string | null>(null);

  // STATE: Quản lý ẩn/hiện chi tiết hóa đơn (Drawer) trên Mobile
  const [isMobileBillOpen, setIsMobileBillOpen] = useState(false);

  // Lọc dữ liệu theo tab
  const filteredTables = tables.filter((table) => {
    if (activeTab === 'all') return true;
    return table.status === activeTab;
  });

  useEffect(() => {
    fetchTablesByRestaurant(extractId(user?.restaurant, '_id'));
  }, [fetchTablesByRestaurant, updatePaymentStatus, user?.restaurant]);

  return (
    // Đổi sang flex-col lg:flex-row để các cột tự chồng lên nhau trên Mobile
    <div className="flex flex-col lg:flex-row flex-1 h-full bg-[#f8f9fc] overflow-hidden relative">
      <PaymentModal
        isOpen={isPaymentModalOpen}
        orderId={orderIdSelected}
        onOpen={() => setIsPaymentModalOpen(true)}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setOrderIdSelected(null);
        }}
        onPaymentSucess={() => fetchTablesByRestaurant(extractId(user?.restaurant, '_id'))}
      />

      {/* BÊN TRÁI: DANH SÁCH BÀN */}
      <div className="flex-1 lg:flex-[1.5] p-4 lg:p-6 overflow-y-auto w-full">
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
            setSelectedTable(null); // Đổi tab thì bỏ chọn bàn hiện tại
            setIsMobileBillOpen(false); // Đóng drawer trên mobile nếu đang mở
          }}
        />

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3 lg:gap-4">
          {filteredTables.map((table) => (
            <TableCard
              key={table._id}
              table={table}
              isSelected={selectedTable?._id === table._id}
              onClick={async () => {
                setSelectedTable(table);
                if (table.currentOrder) {
                  const orderId =
                    typeof table.currentOrder == 'object' ? table.currentOrder?._id : '';
                  const result = await fetchOrderById(orderId || '');
                  setOrder(result || null);
                  // Mở ngăn kéo xem bill trên mobile khi chọn bàn đang phục vụ
                  setIsMobileBillOpen(true);
                } else {
                  setOrder(null);
                }
              }}
              onChangeStatus={(id, newStatus) => {
                changeTableStatus(id, newStatus);
              }}
              onOpenPayment={(orderId) => {
                setOrderIdSelected(orderId);
                setIsPaymentModalOpen(true);
              }}
              time="15 phút"
              onCreateOrder={(tableId) => {
                navigate(`/${currentRole}/orders/pos?tableId=${tableId}`);
              }}
              restaurantName="Nham Nhi"
              wifiName="Nham Nhi Quan"
              wifiPassword="xincamon"
            />
          ))}
        </div>
      </div>

      {/* ========================================= */}
      {/* BÊN PHẢI: CHI TIẾT ĐƠN HÀNG (DRAWER) */}
      {/* ========================================= */}

      {/* Lớp phủ màn hình tối khi mở Drawer trên Mobile */}
      {isMobileBillOpen && (
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileBillOpen(false)}
        />
      )}

      {/* Container của Drawer Hóa Đơn */}
      <div
        className={`
          fixed inset-y-0 right-0 w-[85vw] sm:w-[400px] z-50 bg-white shadow-2xl transition-transform duration-300 flex flex-col
          lg:static lg:flex-1 lg:h-full lg:w-auto lg:min-w-[320px] lg:max-w-[500px] lg:translate-x-0 lg:border-l lg:border-gray-100
          ${isMobileBillOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Nút đóng Drawer (Chỉ hiện trên Mobile) */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <h2 className="font-bold text-gray-800 text-lg">
            {selectedTable?.tableNumber || 'Chi tiết hóa đơn'}
          </h2>
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
          {selectedTable && selectedTable.status !== 'available' ? (
            <FormBillOrder
              orderItems={order?.items || []}
              onClearOrder={() => {
                setOrder(null);
                setSelectedTable(null);
                setOrderIdSelected(null);
                setIsMobileBillOpen(false); // Đóng drawer sau khi clear
              }}
              tableInfo={selectedTable}
              onTriggerPayment={(orderId) => {
                setOrderIdSelected(orderId);
                setIsPaymentModalOpen(true);
                setIsMobileBillOpen(false); // Đóng drawer để mở Modal thanh toán
              }}
            />
          ) : (
            // Placeholder khi chưa chọn bàn (Sẽ luôn hiện trên Desktop nếu trống)
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/50">
              <div className="w-16 h-16 mb-4 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center text-gray-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <path d="M3 9h18" />
                  <path d="M9 21V9" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-gray-600 mb-1">
                {selectedTable?.status !== 'available' ? 'Chưa chọn bàn' : 'Tạo Đơn Hàng'}
              </h3>
              <p className="text-[11px] text-gray-400">
                {selectedTable?.status !== 'available'
                  ? 'Vui lòng chọn một bàn đang phục vụ để xem hóa đơn'
                  : 'Vui lòng tạo một đơn hàng mới để xem hóa đơn'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
