import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChefHat, RefreshCw, WifiOff, LogOut, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CustomTabs } from '@/components/tabsCustom';
import { KitchenOrderCard } from './components/KitchenOrderCard';
import { KdsGate } from './components/KdsGate';
import { getKdsActiveOrders, updateKdsItemStatus } from '@/api/kds.api';
import {
  clearKdsSession,
  getKdsSession,
  isKdsSessionValid,
  type KdsSession,
} from '@/utils/kds-session';
import { kdsSocket, connectKdsSocketWithAuth } from '@/configs/socket.io';
import type { IOrder, IOrderItem } from '@/types/order.type';
import { useNotification } from '@/hooks/use-notification';

// KDS hiển thị đơn khi còn ít nhất 1 món chưa được phục vụ (cần nấu),
// không phụ thuộc trạng thái đơn (served/paid vẫn hiện nếu còn món chưa xong).
const hasUnservedItems = (order?: Partial<IOrder>): boolean =>
  Boolean(order?.items?.length) && order!.items!.some((i) => i.status !== 'served');

type TabId = 'all' | 'dine-in' | 'delivery' | 'to-go';

export default function KitchenOrder() {
  const [session, setSession] = useState<KdsSession | null>(() => {
    const s = getKdsSession();
    return isKdsSessionValid(s) ? s : null;
  });

  if (!session) {
    return <KdsGate onSuccess={setSession} />;
  }

  return <KitchenDashboard session={session} onSessionExpired={() => setSession(null)} />;
}

// ==========================================
// DASHBOARD NHÀ BẾP (Chỉ hiển thị khi đã có phiên hợp lệ)
// ==========================================
function KitchenDashboard({
  session,
  onSessionExpired,
}: {
  session: KdsSession;
  onSessionExpired: () => void;
}) {
  const { playAudio } = useNotification();
  const restaurantId = session.restaurantId;
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(kdsSocket.connected);

  const handleSessionExpired = useCallback(() => {
    clearKdsSession();
    onSessionExpired();
    toast.error('Phiên nhà bếp đã hết hạn. Vui lòng nhập mã mới.', { position: 'top-right' });
  }, [onSessionExpired]);

  const fetchOrders = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await getKdsActiveOrders(restaurantId);
      setOrders((result || []).filter((o) => hasUnservedItems(o)));
    } catch (error) {
      const err = error as { message?: string; status?: number };
      if (err?.status === 401) {
        handleSessionExpired();
        return;
      }
      const errMsg = err?.message || 'Không tải được danh sách đơn hàng';
      setLoadError(errMsg);
      toast.error(errMsg, { position: 'top-right' });
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, handleSessionExpired]);

  // Tải danh sách đơn khi vào phiên
  useEffect(() => {
    const load = async () => {
      await fetchOrders();
    };
    void load();
  }, [fetchOrders]);

  // Xử lý sự kiện realtime từ socket
  const handleOrderEvent = useCallback(
    (res: { action: string; orderData?: Partial<IOrder>; itemData?: Partial<IOrderItem> }) => {
      console.log('KDS socket event:', res.action, res.itemData);
      const { action, orderData, itemData } = res;
      setOrders((prevOrders) => {
        switch (action) {
          case 'CREATE': {
            playAudio(3);
            if (!orderData) return prevOrders;
            if (String(orderData.restaurant) !== String(restaurantId)) return prevOrders;
            if (!hasUnservedItems(orderData)) return prevOrders;
            if (prevOrders.some((o) => o._id === orderData._id)) return prevOrders;
            return [orderData as IOrder, ...prevOrders];
          }
          case 'ADD_ITEMS': {
            playAudio(1);
            if (!orderData) return prevOrders;
            // Đơn thêm món mới: nếu đã từng bị ẩn khỏi KDS (đã served hết trước đó)
            // thì đưa lại vào danh sách khi còn món chưa xong.
            if (!hasUnservedItems(orderData)) return prevOrders;
            const exists = prevOrders.some((o) => o._id === orderData._id);
            if (exists) {
              return prevOrders.map((o) => (o._id === orderData._id ? { ...o, ...orderData } : o));
            }
            return [orderData as IOrder, ...prevOrders];
          }
          case 'UPDATE_STATUS': {
            if (!orderData) return prevOrders;
            // Giữ đơn nếu còn món chưa xong; chỉ ẩn khi đơn kết thúc và không còn món phải nấu.
            if (!hasUnservedItems(orderData)) {
              return prevOrders.filter((o) => o._id !== orderData._id);
            }
            return prevOrders.map((o) =>
              o._id === orderData._id ? { ...o, ...orderData, items: o.items } : o,
            );
          }
          case 'UPDATE_ITEM': {
            if (!itemData) return prevOrders;
            return prevOrders.reduce<IOrder[]>((acc, o) => {
              const hasItem = o.items?.some((i) => i._id === itemData._id);
              if (!hasItem) return [...acc, o];
              const newItems = o.items!.map((i) =>
                i._id === itemData._id ? { ...i, status: itemData.status } : i,
              );
              const stillCooking = newItems.some(
                (i) => i.status !== 'served' && i.status !== 'deleted',
              );
              if (!stillCooking) return acc; // Không còn món nào cần nấu -> tự ẩn card
              return [...acc, { ...o, items: newItems }];
            }, []);
          }
          case 'DELETE_ITEM': {
            if (!orderData) return prevOrders;

            playAudio(1);

            return prevOrders
              .map((o) => {
                if (o._id === orderData._id) {
                  // Cập nhật order, ưu tiên giữ lại mảng items từ orderData (nếu có),
                  // nếu orderData không gửi items thì dùng items hiện tại
                  return {
                    ...o,
                    ...orderData,
                    items: orderData.items ?? o.items,
                  };
                }
                return o;
              })
              .filter((o) => {
                // 1. Nếu đơn hàng không còn món nào trong danh sách -> Ẩn Card
                if (!o.items || o.items.length === 0) return false;

                // 2. Kiểm tra xem còn món nào chưa phục vụ và chưa bị hủy không
                const stillCooking = o.items.some(
                  (i) => i.status !== 'served' && i.status !== 'deleted',
                );
                return stillCooking; // Chỉ giữ lại Card nếu vẫn còn món cần chế biến
              });
          }
          default:
            return prevOrders;
        }
      });
    },
    [restaurantId],
  );

  // Kết nối socket phòng nhà hàng của phiên bếp (xác thực bằng token KDS)
  useEffect(() => {
    if (!restaurantId) return;
    console.log('Connecting KDS socket for restaurant:', restaurantId, 'with KDS token...');
    connectKdsSocketWithAuth(session.token);
    kdsSocket.emit('init_room_restaurant', restaurantId);

    const handleConnect = () => {
      setIsSocketConnected(true);
      kdsSocket.emit('init_room_restaurant', restaurantId);
      console.log('KDS socket connected to restaurant room:', restaurantId);
      fetchOrders();
    };
    const handleDisconnect = () => setIsSocketConnected(false);

    kdsSocket.on('order_event', handleOrderEvent);
    kdsSocket.on('connect', handleConnect);
    kdsSocket.on('disconnect', handleDisconnect);

    return () => {
      kdsSocket.off('order_event', handleOrderEvent);
      kdsSocket.off('connect', handleConnect);
      kdsSocket.off('disconnect', handleDisconnect);
      kdsSocket.emit('leave_restaurant', restaurantId);
    };
  }, [restaurantId, session.token, handleOrderEvent, fetchOrders]);

  const handleItemTap = useCallback(
    async (itemId: string, nextStatus: 'preparing' | 'served') => {
      try {
        await updateKdsItemStatus(itemId, nextStatus);
        // Cập nhật tối ưu local ngay (socket sẽ echo trạng thái mới)
        setOrders((prevOrders) =>
          prevOrders.reduce<IOrder[]>((acc, o) => {
            if (!o.items?.some((i) => i._id === itemId)) return [...acc, o];
            const newItems = o.items.map((i) =>
              i._id === itemId ? { ...i, status: nextStatus } : i,
            );
            const stillCooking = newItems.some((i) => i.status !== 'served');
            if (!stillCooking) return acc;
            return [...acc, { ...o, items: newItems }];
          }, []),
        );
      } catch (error) {
        const err = error as { message?: string; status?: number };
        if (err?.status === 401) {
          handleSessionExpired();
        } else {
          toast.error(err?.message || 'Không cập nhật được trạng thái món', {
            position: 'top-right',
          });
        }
      }
    },
    [handleSessionExpired],
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchOrders();
    setIsRefreshing(false);
  };

  const handleLogout = () => {
    clearKdsSession();
    onSessionExpired();
  };

  const filteredOrders = useMemo(() => {
    if (activeTab === 'all') return orders;
    return orders.filter((o) => o.orderType === activeTab);
  }, [orders, activeTab]);

  const getTabCount = (type: TabId) => {
    if (type === 'all') return orders.length;
    return orders.filter((o) => o.orderType === type).length;
  };

  return (
    <div className="flex flex-col flex-1 h-screen w-screen bg-[#f8f9fc] text-gray-800 overflow-hidden select-none">
      {/* TOP BAR */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-cerulean-blue-600 rounded-lg text-white">
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-wide text-gray-900 uppercase flex items-center gap-1">
              Màn Hình Nhà Bếp (KDS)
            </h1>
            <p className="text-[10px] text-gray-400 font-medium">
              Nhà hàng:{' '}
              <span className="text-cerulean-blue-600 font-bold">{session.restaurantName}</span> |
              Chế độ Live-Monitor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end lg:self-auto">
          <button
            onClick={handleLogout}
            className="px-2.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-lg transition text-[11px] flex items-center gap-1 font-semibold shadow-sm"
            title="Thoát phiên nhà bếp"
          >
            <LogOut className="h-3 w-3" />
            Thoát phiên
          </button>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-2.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-lg transition text-[11px] flex items-center gap-1 font-semibold shadow-sm disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </button>

          <div className="bg-gray-50 p-0.5 rounded-lg ">
            <CustomTabs
              tabs={[
                { id: 'all', label: 'Tất cả', count: getTabCount('all') },
                { id: 'dine-in', label: 'Tại quán', count: getTabCount('dine-in') },
                { id: 'delivery', label: 'Giao hàng', count: getTabCount('delivery') },
                { id: 'to-go', label: 'Mang về', count: getTabCount('to-go') },
              ]}
              activeTab={activeTab}
              onTabChange={(id) => setActiveTab(id as TabId)}
            />
          </div>
        </div>
      </div>

      {/* BANNER MẤT KẾT NỐI SOCKET */}
      {!isSocketConnected && (
        <div className="bg-rose-50 border-b border-rose-200 px-6 py-2 flex items-center justify-center gap-2 shrink-0">
          <WifiOff className="h-3.5 w-3.5 text-rose-600" />
          <span className="text-[11px] font-semibold text-rose-700">
            Mất kết nối realtime — đang tự động kết nối lại...
          </span>
        </div>
      )}

      {/* MAIN PANEL */}
      <div className="flex-1 p-4 overflow-y-auto w-full bg-[#f8f9fc]">
        {isLoading && orders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin text-cerulean-blue-600" />
            <p className="text-xs font-medium">Đang tải đơn hàng từ bếp...</p>
          </div>
        ) : loadError && orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 h-full text-gray-400">
            <p className="text-xs font-medium text-rose-600">{loadError}</p>
            <button
              onClick={handleRefresh}
              className="px-3 py-1.5 text-[11px] font-semibold text-white bg-cerulean-blue-600 hover:bg-cerulean-blue-700 rounded-lg transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 items-start">
            {filteredOrders.map((order) => (
              <KitchenOrderCard key={order._id} order={order} onItemTap={handleItemTap} />
            ))}

            {filteredOrders.length === 0 && (
              <div className="col-span-full py-24 flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200 max-w-xl mx-auto w-full px-6 text-center shadow-sm">
                <div className="h-12 w-12 bg-cerulean-blue-50 text-cerulean-blue-600 rounded-full flex items-center justify-center text-xl font-bold mb-3 border border-cerulean-blue-100">
                  ✓
                </div>
                <h3 className="text-sm font-bold text-gray-800 mb-0.5">Bếp Đang Trống Đơn</h3>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Hiện tại không có món ăn nào đang xếp hàng chờ chế biến trong mục này.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
