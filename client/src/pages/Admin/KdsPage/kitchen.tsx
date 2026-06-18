import { useState } from 'react';
import { CustomTabs } from '@/components/tabsCustom';
import { KitchenOrderCard } from './components/KitchenOrderCard';
import { MOCK_KITCHEN_ORDERS, type MockKitchenOrder } from './components/KitchenOrderCard';
import { ChefHat, RefreshCw } from 'lucide-react';

export default function KitchenOrder() {
  const [orders, setOrders] = useState<MockKitchenOrder[]>(MOCK_KITCHEN_ORDERS);
  const [activeTab, setActiveTab] = useState('all');

  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'all') return true;
    return order.orderType === activeTab;
  });

  const handleCompleteOrder = (orderId: string) => {
    setOrders((prevOrders) => prevOrders.filter((order) => order._id !== orderId));
  };

  const handleResetMockData = () => {
    setOrders(MOCK_KITCHEN_ORDERS);
  };

  const getTabCount = (type: 'all' | 'dine-in' | 'delivery' | 'to-go') => {
    if (type === 'all') return orders.length;
    return orders.filter((o) => o.orderType === type).length;
  };

  return (
    // THAY ĐỔI: Đổi nền tổng sang màu trắng xám nhẹ hửu ích [#f8fafc], màu chữ đen [text-gray-800]
    <div className="flex flex-col flex-1 h-screen w-screen bg-[#f8fafc] text-gray-800 overflow-hidden select-none">
      {/* TOP BAR (Chuyển sang nền trắng, viền xám nhạt nhẹ nhàng) */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-600 rounded-lg text-white">
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            {/* THAY ĐỔI: Chữ tiêu đề thu nhỏ text-base thay vì text-lg */}
            <h1 className="text-base font-black tracking-wide text-gray-900 uppercase flex items-center gap-1">
              Màn Hình Nhà Bếp (KDS)
            </h1>
            {/* THAY ĐỔI: Subtext siêu nhỏ text-[10px] */}
            <p className="text-[10px] text-gray-400 font-medium">
              Nhà hàng: <span className="text-emerald-600 font-bold">Chef's Choice Central</span> |
              Chế độ Live-Monitor
            </p>
          </div>
        </div>

        {/* Khu vực Action và Tabs */}
        <div className="flex items-center gap-3 self-end lg:self-auto">
          <button
            onClick={handleResetMockData}
            // THAY ĐỔI: Nút chuyển sang phong cách sáng viền mỏng, chữ nhỏ gọn text-[11px]
            className="px-2.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-lg transition text-[11px] flex items-center gap-1 font-semibold shadow-sm"
            title="Khôi phục lại dữ liệu mẫu"
          >
            <RefreshCw className="h-3 w-3" />
            Nạp dữ liệu Test
          </button>

          {/* THAY ĐỔI: Hộp bọc tab đổi sang nền xám nhạt tinh tế */}
          <div className="bg-gray-50 p-0.5 rounded-lg border border-gray-200">
            <CustomTabs
              tabs={[
                { id: 'all', label: `Tất cả (${getTabCount('all')})` },
                { id: 'dine-in', label: `Tại quán (${getTabCount('dine-in')})` },
                { id: 'delivery', label: `Giao hàng (${getTabCount('delivery')})` },
                { id: 'to-go', label: `Mang về (${getTabCount('to-go')})` },
              ]}
              activeTab={activeTab}
              onTabChange={(id) => setActiveTab(id)}
            />
          </div>
        </div>
      </div>

      {/* MAIN PANEL (Nền sáng đồng bộ) */}
      <div className="flex-1 p-4 overflow-y-auto w-full bg-[#f8fafc]">
        {/* Giữ nguyên Grid phân chia thông minh lên đến 5 cột trên màn hình siêu lớn */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 items-start">
          {filteredOrders.map((order) => (
            <KitchenOrderCard key={order._id} order={order} onCompleteOrder={handleCompleteOrder} />
          ))}

          {/* TRẠNG THÁI TRỐNG (Đổi phong cách sáng sạch sẽ) */}
          {filteredOrders.length === 0 && (
            <div className="col-span-full py-24 flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200 max-w-xl mx-auto w-full px-6 text-center shadow-sm">
              <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-xl font-bold mb-3 border border-emerald-100">
                ✓
              </div>
              <h3 className="text-sm font-bold text-gray-800 mb-0.5">Bếp Đang Trống Đơn</h3>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Hiện tại không có món ăn nào đang xếp hàng chờ chế biến trong mục này.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
