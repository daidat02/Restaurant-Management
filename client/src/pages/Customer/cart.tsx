import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Minus,
  Plus,
  ShoppingBag,
  ArrowLeft,
  ShieldCheck,
  ChevronRight,
  Info,
  Clock,
  CheckCircle2,
  Receipt,
  Search,
  MapPin,
  BellRing,
  Star,
  UtensilsCrossed,
  Store,
  X,
  ChevronDown,
  ChevronLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { useMenu } from '@/hooks/use-menu';
import { extractId } from '@/utils/helpers';
import { mergeOrderItems } from '@/utils/orderItems';
import { addToCart, updateQuantity, clearCart } from '@/redux/slices/cartSlice';
import { selectRestaurant } from '@/redux/slices/restaurantSlice';
import type { IMenuItem } from '@/types/category.type';
import { useAppSelector } from '@/hooks/redux-hook';
import { useTable } from '@/hooks/use-table';
import SideDrawer from '@/components/SideDrawer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/use-auth';
import { useOrder } from '@/hooks/use-order';
import type { IOrder } from '@/types/order.type';
import type { IRestaurant } from '@/types/restaurant.type';

interface LayoutContextType {
  openLoginModal: () => void;
}

const greetingByHour = () => {
  const h = new Date().getHours();
  if (h < 11) return 'Chào buổi sáng';
  if (h < 13) return 'Chào buổi trưa';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
};

export default function CartPage() {
  const context = useOutletContext<LayoutContextType>() || {};
  const openLoginModal =
    context.openLoginModal || (() => console.log('Không tìm thấy Login Modal'));
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    categories,
    items,
    fetchCategories,
    fetchTopBestSellers,
    fetchItemsByCat,
    fetchAllItems,
  } = useMenu();
  const { currentOrder, addOrder, addItemToOrder, fetchOrderByTableId, startListeningOrderSocket } =
    useOrder();
  const { currentTable, fetchTableById, callStaffAtTable, requestPaymentAtTable } = useTable();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showWelcome, setShowWelcome] = useState<boolean>(true);

  // Quản lý 2 Drawer riêng biệt cho Mobile
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);
  const [isStatusDrawerOpen, setIsStatusDrawerOpen] = useState<boolean>(false);

  // Modal nhỏ xác nhận đã gửi yêu cầu gọi nhân viên / thanh toán thành công
  const [requestSent, setRequestSent] = useState<{ title: string; message: string } | null>(null);

  // Drawer chi tiết món ăn (mở khi click vào card)
  const [selectedFood, setSelectedFood] = useState<IMenuItem | null>(null);
  const [isItemDetailOpen, setIsItemDetailOpen] = useState<boolean>(false);

  const openItemDetail = (food: IMenuItem) => {
    setSelectedFood(food);
    setIsItemDetailOpen(true);
  };

  const closeItemDetail = () => {
    setIsItemDetailOpen(false);
    setSelectedFood(null);
  };

  // Đơn hàng thực tế đã gửi xuống nhà bếp thành công
  const [activeOrder, setActiveOrder] = useState<any>(currentOrder || null);

  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('tableId');
  const restaurantId = searchParams.get('restaurantId');

  const { isAuthenticated, user } = useAuth();

  //redux
  const { restaurantSelected } = useAppSelector((state) => state.restaurant);
  const { cartItems } = useAppSelector((state) => state.cart);

  // Thông tin nhà hàng (được populate sẵn trong GET /tables/:id) để hiển thị màn chào khách
  const restaurantInfo = useMemo(() => {
    const r = currentTable?.restaurant;
    if (r && typeof r === 'object' && r?.name) {
      const rest = r as IRestaurant;
      return {
        name: rest.name,
        address: rest.address || '',
        phone: rest.phone || '',
        logoUrl: rest.logoUrl || '',
      };
    }
    return null;
  }, [currentTable]);

  const subtotal = (cartItems || []).reduce(
    (acc, item) => acc + item.food?.price * item.quantity,
    0,
  );
  const totalItemsCount = (cartItems || []).reduce((acc, item) => acc + (item?.quantity || 0), 0);

  // Lọc món theo từ khoá tìm kiếm (theo iPOS: thanh "Bạn muốn tìm món gì ?")
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items || [];
    return (items || []).filter(
      (food) =>
        food.name.toLowerCase().includes(q) || (food.description || '').toLowerCase().includes(q),
    );
  }, [items, searchQuery]);

  const fetchActiveOrder = async (id: string) => {
    try {
      const result = await fetchOrderByTableId(id);
      setActiveOrder(result || null);
      if (result) {
        startListeningOrderSocket(result._id || '');
      }
    } catch (error) {
      console.error('Lỗi kiểm tra đơn hàng bàn:', error);
    }
  };

  const handleAddToCart = (food: IMenuItem) => {
    dispatch(addToCart({ food }));
  };

  const handleQuantityChange = (id: string, delta: number) => {
    dispatch(updateQuantity({ id, delta }));
  };

  // Thêm món vào giỏ với đúng số lượng người dùng chọn (set số lượng chính xác nếu món đã có trong giỏ)
  const handleConfirmAddItem = (food: IMenuItem, qty: number) => {
    const existing = cartItems?.find((i) => i.food._id === food._id);
    if (existing) {
      const diff = qty - existing.quantity;
      if (diff > 0) {
        for (let i = 0; i < diff; i++) dispatch(updateQuantity({ id: food._id, delta: 1 }));
      } else if (diff < 0) {
        for (let i = 0; i < -diff; i++) dispatch(updateQuantity({ id: food._id, delta: -1 }));
      }
    } else {
      dispatch(addToCart({ food }));
      for (let i = 1; i < qty; i++) dispatch(updateQuantity({ id: food._id, delta: 1 }));
    }
    closeItemDetail();
  };

  const handleCheckoutSubmit = async () => {
    if (cartItems.length === 0) return;

    try {
      const formattedItems: IOrder['items'] = cartItems.map((item) => ({
        menuItem: item.food._id,
        nameSnapshot: item.food.name,
        priceSnapshot: item.food.price,
        quantity: item.quantity,
      }));

      if (!tableId) {
        if (!isAuthenticated) {
          openLoginModal();
          return;
        }
        navigate('/payment');
        setIsCartDrawerOpen(false);
        return;
      }

      if (activeOrder) {
        const dineInOrderPayload: IOrder = {
          orderId: activeOrder._id,
          items: formattedItems,
        };
        await addItemToOrder(dineInOrderPayload);
        fetchActiveOrder(tableId);
      } else {
        const createPayload: IOrder = {
          table: tableId as any,
          restaurant: (restaurantId || extractId(currentTable?.restaurant)) as any,
          items: formattedItems,
          totalAmount: subtotal,
          orderType: 'dine-in',
        };
        // TRƯỜNG HỢP 2: ĐƠN HÀNG ĐẦU TIÊN CỦA BÀN
        const result = await addOrder(createPayload);
        if (result) {
          fetchActiveOrder(tableId);
        }
      }

      dispatch(clearCart());
      setIsCartDrawerOpen(false);
    } catch (error) {
      console.error('Lỗi khi gửi yêu cầu gọi món tại bàn:', error);
    }
  };

  // Khách bấm nút gọi thanh toán tại bàn → gửi yêu cầu thật tới nhân viên qua hook
  const handlePaymentRequest = async () => {
    if (!tableId) return;
    const result = await requestPaymentAtTable({
      tableId,
      restaurantId: restaurantId || extractId(currentTable?.restaurant) || undefined,
    });
    setIsStatusDrawerOpen(false);
    if (result) {
      setRequestSent({
        title: 'Đã gửi yêu cầu thanh toán!',
        message: 'Nhân viên sẽ mang hóa đơn tới bàn của bạn ngay.',
      });
    }
  };

  // Gọi nhân viên → gửi yêu cầu thật tới nhân viên qua hook
  const handleCallStaff = async () => {
    if (!tableId) return;
    const result = await callStaffAtTable({
      tableId,
      restaurantId: restaurantId || extractId(currentTable?.restaurant) || undefined,
    });
    if (result) {
      setRequestSent({
        title: 'Đã gọi nhân viên!',
        message: 'Nhân viên sẽ tới bàn của bạn ngay.',
      });
    }
  };

  const handleReview = () => {
    toast.info('Cảm ơn bạn! Chúng tôi rất mong nhận được đánh giá của bạn.', {
      position: 'top-center',
    });
  };

  const menuTabs = [{ _id: 'all', name: 'Gợi Ý Cho Bạn' }, ...(categories || [])];

  useEffect(() => {
    if (restaurantSelected && !tableId) {
      fetchCategories(restaurantSelected || '');
    }
    if (tableId) {
      const fetchDataToScanQR = async () => {
        const table = await fetchTableById(tableId);
        // Set đúng nhà hàng vào phiên khách (QR mang restaurantId); fallback theo bàn cho QR cũ chỉ có tableId
        dispatch(selectRestaurant(restaurantId || extractId(table?.restaurant)));
        await fetchActiveOrder(tableId);
        await fetchCategories(restaurantId || extractId(table?.restaurant));
        fetchTopBestSellers(restaurantId || extractId(table?.restaurant));
      };
      fetchDataToScanQR();
    }
  }, [fetchCategories, fetchTableById, tableId, restaurantId]);

  //  Polling đơn theo bàn — khách chưa đăng nhập không nhận được socket realtime,
  // nên định kỳ lấy lại đơn để cập nhật trạng thái món do bếp cập nhật.
  useEffect(() => {
    if (!tableId || !activeOrder?._id) return;

    let cancelled = false;
    const pollOrder = async () => {
      try {
        const result = await fetchOrderByTableId(tableId);
        if (!cancelled) setActiveOrder(result || null);
      } catch (error: any) {
        // Đơn đã thanh toán/hủy → backend trả 404 → reset đơn active cho bàn
        if (!cancelled && error?.response?.status === 404) {
          setActiveOrder(null);
        }
      }
    };

    pollOrder();
    const interval = setInterval(pollOrder, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tableId, activeOrder?._id]);

  useEffect(() => {
    if (activeTab && activeTab === 'all' && !tableId) {
      if (restaurantSelected) {
        fetchTopBestSellers(restaurantSelected || '');
      }
    } else if (activeTab === 'all' && tableId) {
      // Tab "Tất cả" khi có bàn → lấy toàn bộ item của cơ sở (không gọi getItemsByCategory('all'))
      const rid = restaurantId || restaurantSelected || '';
      if (rid) fetchAllItems(rid);
    } else {
      fetchItemsByCat(activeTab);
    }
  }, [activeTab, fetchItemsByCat, fetchTopBestSellers, fetchAllItems, restaurantId, tableId]);

  // Màn chào khách — chỉ hiển thị trong luồng quét QR (có tableId)
  if (tableId && showWelcome) {
    return (
      <>
        <WelcomeScreen
          restaurantName={restaurantInfo?.name || ''}
          restaurantAddress={restaurantInfo?.address || ''}
          logoUrl={restaurantInfo?.logoUrl || ''}
          tableNumber={currentTable?.tableNumber || tableId}
          hasActiveOrder={!!activeOrder}
          onEnterMenu={() => setShowWelcome(false)}
          onPaymentRequest={handlePaymentRequest}
          onCallStaff={handleCallStaff}
          onReview={handleReview}
        />
        <RequestSentDialog requestSent={requestSent} onClose={() => setRequestSent(null)} />
      </>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white pb-24 pt-4 text-gray-800 antialiased font-sans relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-16">
        {/* THANH ĐIỀU HƯỚNG TRÊN CÙNG (MOBILE HEADER) */}
        <MobileHeader
          menuTabs={menuTabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onBack={() => navigate(-1)}
          onBackToWelcome={() => setShowWelcome(true)}
          tableNumber={currentTable?.tableNumber || null}
          activeOrder={activeOrder}
          restaurantName={restaurantInfo?.name || ''}
          restaurantAddress={restaurantInfo?.address || ''}
        />

        {/* LAYOUT CHIA CHUẨN KÍCH THƯỚC 3 CỘT */}
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_340px] gap-8 items-start">
          {/* CỘT 1: SIDEBAR DANH MỤC TRÁI */}
          <SidebarMenu menuTabs={menuTabs} activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* CỘT 2: KHU VỰC THỰC ĐƠN TRUNG TÂM */}
          <main className="space-y-4">
            {/* Thanh tìm kiếm món (theo iPOS: "Bạn muốn tìm món gì ?") */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-300 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Bạn muốn tìm món gì ?"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 py-3 text-sm font-medium text-gray-900 placeholder:text-slate-400 outline-none transition-all focus:border-cerulean-blue-300 focus:bg-white focus:ring-4 focus:ring-cerulean-blue-50"
              />
            </div>

            <div className="pb-2 border-b border-slate-100 flex items-baseline justify-between lg:mt-0 mt-2">
              <h2 className="text-sm lg:text-lg font-black text-gray-950 tracking-tight">
                {menuTabs.find((c) => c._id === activeTab)?.name}
              </h2>
              <span className="text-[10px] font-medium text-slate-400 font-mono">
                {filteredItems.length} món sẵn có
              </span>
            </div>

            {filteredItems.length > 0 ? (
              <div className="space-y-3.5">
                {filteredItems?.map((food) => (
                  <FoodRow
                    key={food._id}
                    food={food}
                    cartItem={cartItems?.find((i) => i.food._id === food._id)}
                    onAddToCart={handleAddToCart}
                    onQuantityChange={handleQuantityChange}
                    onOpenDetail={() => openItemDetail(food)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-xs text-slate-400 italic rounded-2xl border border-dashed border-slate-200 bg-slate-50/40">
                Không tìm thấy món nào phù hợp với từ khoá "{searchQuery}".
              </div>
            )}
          </main>

          {/* CỘT 3: TRÊN DESKTOP */}
          <div className="hidden lg:block space-y-4 sticky top-24">
            <OrderSummary
              cartItems={cartItems}
              subtotal={subtotal}
              onQuantityChange={handleQuantityChange}
              onCheckout={handleCheckoutSubmit}
              tableNumber={currentTable?.tableNumber || null}
              isInsideDrawer={false}
              activeOrder={activeOrder}
            />

            {/* Khối xem nhanh trạng thái bếp cho màn Desktop */}
            {activeOrder && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-400 uppercase">
                    Trạng thái bàn ăn
                  </span>
                  <button
                    onClick={() => setIsStatusDrawerOpen(true)}
                    className="text-xs font-bold text-cerulean-blue-600 hover:underline"
                  >
                    Xem chi tiết món ({activeOrder.items.length})
                  </button>
                </div>
                <button
                  onClick={handlePaymentRequest}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3 uppercase transition-all shadow-sm"
                >
                  <Receipt className="w-4 h-4" />
                  Yêu cầu thanh toán
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FLOATING BUTTONS: THANH CHỨC NĂNG NỔI MOBILE */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-50 lg:hidden flex gap-2">
        {/* Nút Xem thông tin đơn hàng đã đặt */}
        {activeOrder && (
          <button
            onClick={() => {
              setIsStatusDrawerOpen(true);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl p-4 shadow-xl font-bold text-xs uppercase active:scale-95 transition-all"
          >
            <Clock className="w-4 h-4 text-cerulean-blue-500" />
            <span>Món Đã Gọi</span>
          </button>
        )}

        {/* Nút Xem giỏ hàng tạm thời */}
        {totalItemsCount > 0 && (
          <button
            onClick={() => setIsCartDrawerOpen(true)}
            /* Thay flex-[2] thành flex-1 nếu đã có activeOrder để 2 nút bằng chằn chặn nhau */
            className={`flex flex-items-center justify-between bg-cerulean-blue-600 text-white rounded-xl p-4 shadow-xl font-bold active:scale-95 transition-all hover:bg-cerulean-blue-700 ${
              activeOrder ? 'flex-1 justify-center gap-1.5' : 'flex-[2]'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="bg-cerulean-blue-700 text-[11px] px-2 py-0.5 rounded-md text-white font-mono">
                {totalItemsCount}
              </div>
              <span className="text-xs tracking-wide uppercase">
                {activeOrder ? 'Giỏ món thêm' : 'Xem giỏ hàng'}
              </span>
            </div>

            {/* Chỉ hiển thị số tiền và mũi tên khi CHƯA có đơn hàng nào tại bàn (luồng ban đầu) */}
            {!activeOrder && (
              <div className="flex items-center gap-1 text-sm font-black">
                <span>{subtotal.toLocaleString('vi-VN')} đ</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            )}
          </button>
        )}
      </div>

      {/* SIDE DRAWER 1: GIỎ HÀNG THÊM MÓN — BOTTOM SHEET FULL MÀN HÌNH MOBILE */}
      <SideDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        side="bottom"
        isHeaderless={true}
        className="!w-full !max-w-full !h-[100dvh] overflow-hidden !rounded-none lg:!max-w-lg lg:!h-[85vh] lg:mx-auto lg:!rounded-t-3xl overscroll-contain touch-manipulation"
      >
        <div className="flex flex-col h-full">
          {/* Header drawer: nút back + tiêu đề */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 shrink-0">
            <button
              onClick={() => setIsCartDrawerOpen(false)}
              aria-label="Đóng giỏ hàng"
              className="flex items-center justify-center w-8 h-8 rounded-sm bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-90 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-black text-gray-900">
              {activeOrder ? 'Giỏ món thêm' : 'Giỏ hàng'}
            </span>
            <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md">
              {totalItemsCount} món
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            <OrderSummary
              cartItems={cartItems}
              subtotal={subtotal}
              onQuantityChange={handleQuantityChange}
              onCheckout={handleCheckoutSubmit}
              tableNumber={currentTable?.tableNumber || null}
              isInsideDrawer={true}
              activeOrder={activeOrder}
            />
          </div>
        </div>
      </SideDrawer>

      {/* SIDE DRAWER 2: TRẠNG THÁI ĐƠN HÀNG/MÓN ĂN — BOTTOM SHEET FULL MÀN HÌNH MOBILE */}
      <SideDrawer
        isOpen={isStatusDrawerOpen}
        onClose={() => setIsStatusDrawerOpen(false)}
        side="bottom"
        isHeaderless={true}
        className="!w-full !max-w-full !h-[100dvh] overflow-hidden !rounded-none lg:!max-w-lg lg:!h-[85vh] lg:mx-auto lg:!rounded-t-3xl overscroll-contain touch-manipulation"
      >
        <div className="flex flex-col h-full">
          {/* Header drawer: nút back + tiêu đề */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 shrink-0">
            <button
              onClick={() => setIsStatusDrawerOpen(false)}
              aria-label="Đóng danh sách món đã gọi"
              className="flex items-center justify-center w-8 h-8 rounded-sm bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-90 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-black text-gray-900">Món Đã Gọi</span>

            {activeOrder && (
              <span className="ml-auto text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 font-bold rounded">
                ● Đang phục vụ - Bàn {currentTable?.tableNumber || tableId}
              </span>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            <ActiveOrderStatus
              activeOrder={activeOrder}
              tableNumber={currentTable?.tableNumber || tableId}
              onPaymentRequest={handlePaymentRequest}
            />
          </div>
        </div>
      </SideDrawer>

      {/* DRAWER CHI TIẾT MÓN ĂN — BOTTOM SHEET FULL MÀN HÌNH MOBILE */}
      <SideDrawer
        isOpen={isItemDetailOpen}
        onClose={closeItemDetail}
        side="bottom"
        isHeaderless={true}
        className="!w-full !max-w-full !h-[100dvh] overflow-hidden !rounded-none lg:!max-w-lg lg:!h-[85vh] lg:mx-auto lg:!rounded-t-3xl overscroll-contain touch-manipulation"
      >
        {selectedFood && (
          <ItemDetailSheet
            food={selectedFood}
            cartItem={cartItems?.find((i) => i.food._id === selectedFood._id)}
            onClose={closeItemDetail}
            onConfirmAdd={handleConfirmAddItem}
          />
        )}
      </SideDrawer>

      {/* MODAL NHỎ XÁC NHẬN ĐÃ GỬI YÊU CẦU (GỌI NHÂN VIÊN / THANH TOÁN) */}
      <RequestSentDialog requestSent={requestSent} onClose={() => setRequestSent(null)} />
    </div>
  );
}

/* ==========================================================================
   MODAL NHỎ XÁC NHẬN ĐÃ GỬI YÊU CẦU (DÙNG CHUNG: MÀN WELCOME + TRANG CHÍNH)
   ========================================================================== */

interface RequestSentDialogProps {
  requestSent: { title: string; message: string } | null;
  onClose: () => void;
}

function RequestSentDialog({ requestSent, onClose }: RequestSentDialogProps) {
  return (
    <AlertDialog open={!!requestSent} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-xs text-center">
        <div className="flex flex-col items-center gap-2 py-2">
          <span className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </span>
          <AlertDialogTitle className="text-base">{requestSent?.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            {requestSent?.message}
          </AlertDialogDescription>
        </div>
        <AlertDialogAction
          onClick={onClose}
          className="w-full bg-cerulean-blue-600 hover:bg-cerulean-blue-700"
        >
          OK
        </AlertDialogAction>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ==========================================================================
   MÀN CHÀO KHÁCH (THEO iPOS, NHƯNG PHONG CÁCH LANDING PAGE)
   ========================================================================== */

interface WelcomeScreenProps {
  restaurantName: string;
  restaurantAddress: string;
  logoUrl: string;
  tableNumber: number | string;
  hasActiveOrder: boolean;
  onEnterMenu: () => void;
  onPaymentRequest: () => void;
  onCallStaff: () => void;
  onReview: () => void;
}

function WelcomeScreen({
  restaurantName,
  restaurantAddress,
  logoUrl,
  tableNumber,
  hasActiveOrder,
  onEnterMenu,
  onPaymentRequest,
  onCallStaff,
  onReview,
}: WelcomeScreenProps) {
  return (
    <div className="w-full min-h-screen bg-white flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 relative overflow-hidden">
      {/* Decorative blur giống landing page */}
      <div className="pointer-events-none absolute -top-32 right-0 h-[480px] w-[480px] rounded-full bg-cerulean-blue-50 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 bottom-0 h-[360px] w-[360px] rounded-full bg-slate-50 blur-3xl" />

      <div className="relative w-full max-w-md sm:max-w-lg lg:max-w-4xl mx-auto">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(30,64,175,0.10)] overflow-hidden lg:grid lg:grid-cols-[1fr_1.25fr]">
          {/* HEADER TÊN QUÁN — trên mobile nằm phía trên; trên desktop là cột trái full height */}
          <div className="bg-gradient-to-br from-cerulean-blue-600 to-cerulean-blue-800 px-6 sm:px-10 pt-9 pb-8 text-center text-white relative lg:flex lg:flex-col lg:justify-center">
            <div className="flex items-center justify-center gap-2.5">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={restaurantName}
                  className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl object-cover bg-white/20 ring-1 ring-white/40"
                />
              ) : (
                <span className="flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white/20 ring-1 ring-white/40">
                  <Store className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
              )}
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                {restaurantName || 'Nhà hàng của bạn'}
              </h1>
            </div>
            {restaurantAddress && (
              <p className="mt-2.5 inline-flex items-center gap-1 text-[11px] sm:text-xs font-medium text-cerulean-blue-100">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{restaurantAddress}</span>
              </p>
            )}

            {/* Khối thông tin bàn hiển thị rõ ràng hơn trên desktop */}
            <div className="hidden lg:block mt-6 pt-6 border-t border-white/15">
              <p className="text-sm text-cerulean-blue-100">
                Chúng tôi sẽ phục vụ tại bàn:{' '}
                <span className="font-black text-white font-mono text-lg">{tableNumber}</span>
              </p>
            </div>
          </div>

          {/* NỘI DUNG CHÀO KHÁCH */}
          <div className="px-6 sm:px-10 py-7 sm:py-9 space-y-5 sm:space-y-6 lg:flex lg:flex-col lg:justify-center">
            {/* Lời chào */}
            <div className="text-center lg:text-left space-y-1.5">
              <p className="text-lg sm:text-xl lg:text-2xl font-black tracking-tight text-gray-900">
                {greetingByHour()} Quý khách 👋
              </p>
              <p className="text-sm sm:text-base text-slate-500 font-medium lg:hidden">
                Chúng tôi sẽ phục vụ tại bàn:{' '}
                <span className="font-black text-cerulean-blue-600 font-mono">{tableNumber}</span>
              </p>
            </div>

            {/* Ô nhập SĐT tích điểm (theo iPOS) */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 flex items-center gap-3 flex-col sm:flex-row">
              <input
                type="tel"
                inputMode="numeric"
                placeholder="Nhập số điện thoại để tích điểm"
                className="flex-1 w-full bg-transparent text-sm font-medium text-gray-900 placeholder:text-slate-400 outline-none"
              />
              <button className="shrink-0 w-full sm:w-auto rounded-full bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white text-[11px] sm:text-xs font-bold px-4 py-2 transition-all active:scale-95">
                Tích điểm
              </button>
            </div>

            {/* 3 nút nhanh — luôn xếp trên một hàng ngang giống desktop */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={onPaymentRequest}
                disabled={!hasActiveOrder}
                className="flex items-center justify-center flex-col gap-2.5 sm:gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:py-3.5 transition-all hover:border-emerald-200 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:bg-white active:scale-95"
              >
                <Receipt className="w-5 h-5 shrink-0 text-emerald-600" />
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-600">
                  Gọi thanh toán
                </span>
              </button>
              <button
                onClick={onCallStaff}
                className="flex items-center justify-center flex-col gap-2.5 sm:gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:py-3.5 transition-all hover:border-cerulean-blue-200 hover:bg-cerulean-blue-50 active:scale-95"
              >
                <BellRing className="w-5 h-5 shrink-0 text-cerulean-blue-600" />
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-600">
                  Gọi nhân viên
                </span>
              </button>
              <button
                onClick={onReview}
                className="flex items-center justify-center flex-col gap-2.5 sm:gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:py-3.5 transition-all hover:border-amber-200 hover:bg-amber-50 active:scale-95"
              >
                <Star className="w-5 h-5 shrink-0 text-amber-500" />
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-600">
                  Đánh giá
                </span>
              </button>
            </div>

            {/* Nút chính: Xem Menu - Gọi món */}
            <button
              onClick={onEnterMenu}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white font-extrabold text-sm sm:text-base py-4 tracking-tight transition-all shadow-lg shadow-cerulean-blue-200 active:scale-[0.98]"
            >
              <UtensilsCrossed className="w-5 h-5" />
              Xem Menu - Gọi món
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] sm:text-xs text-slate-400 font-medium">
          Quét mã QR mỗi bàn để gọi món nhanh chóng — không cần tải ứng dụng.
        </p>
      </div>
    </div>
  );
}

/* ==========================================================================
   CÁC COMPONENT CON ĐÃ ĐƯỢC CẬP NHẬT THEO FLOW
   ========================================================================== */

interface MobileHeaderProps {
  menuTabs: any[];
  activeTab: string;
  setActiveTab: (id: string) => void;
  onBack: () => void;
  onBackToWelcome: () => void;
  tableNumber: number | null;
  activeOrder: any;
  restaurantName?: string;
  restaurantAddress?: string;
}

function MobileHeader({
  menuTabs,
  activeTab,
  setActiveTab,
  onBack,
  onBackToWelcome,
  tableNumber,
  activeOrder,
  restaurantName,
  restaurantAddress,
}: MobileHeaderProps) {
  return (
    <div className="flex flex-col gap-4 mb-6 sticky top-0 bg-white/95 backdrop-blur-md z-40 py-2 border-b border-slate-100 lg:border-none lg:static lg:bg-transparent lg:py-0">
      <div className={`flex items-center  ${tableNumber ? 'justify-between' : 'justify-between'}`}>
        <div className="flex items-center gap-2 min-w-0">
          {tableNumber && (
            <button
              onClick={onBackToWelcome}
              aria-label="Trở về màn chào khách"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-cerulean-blue-600 hover:text-cerulean-blue-700 transition-colors shrink-0 border border-slate-200 rounded-sm p-2 bg-white shadow-sm active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Trang chủ</span>
            </button>
          )}
          {tableNumber && restaurantName && (
            <div className="min-w-0">
              <p className="text-xs font-black text-gray-900 truncate leading-tight">
                {restaurantName}
              </p>
              {restaurantAddress && (
                <p className="text-[10px] text-slate-400 font-medium truncate leading-tight">
                  {restaurantAddress}
                </p>
              )}
            </div>
          )}
          {!tableNumber && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-gray-900 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-0.5 transition-transform" />
              <span>Thực đơn chính</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {activeOrder && (
            <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 font-bold rounded">
              ● Đang phục vụ
            </span>
          )}
          {tableNumber !== null && (
            <div className="text-xs font-black text-gray-900">
              Bàn số:{' '}
              <span className="text-cerulean-blue-600 font-mono text-sm">{tableNumber}</span>
            </div>
          )}
        </div>
      </div>

      <div className="block lg:hidden w-full overflow-x-auto pb-1 no-scrollbar flex items-center gap-2">
        {menuTabs.map((cat) => (
          <button
            key={cat._id}
            onClick={() => setActiveTab(cat._id)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-[11px] font-bold tracking-tight transition-all duration-150 border ${
              activeTab === cat._id
                ? 'bg-cerulean-blue-50 border-cerulean-blue-200 text-cerulean-blue-700 shadow-sm'
                : 'bg-gray-50 border-slate-100 text-slate-500'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function SidebarMenu({ menuTabs, activeTab, setActiveTab }: any) {
  return (
    <aside className="space-y-1 hidden lg:block sticky top-24">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-3 mb-2">
        Phân loại món
      </p>
      {menuTabs.map((cat: any) => (
        <button
          key={cat._id}
          onClick={() => setActiveTab(cat._id)}
          className={`w-full text-left px-4 py-2.5 rounded-full text-xs font-bold tracking-tight transition-all duration-150 ${
            activeTab === cat._id
              ? 'bg-cerulean-blue-50 border border-cerulean-blue-100 text-cerulean-blue-700 shadow-[0_2px_8px_rgba(26,113,246,0.04)]'
              : 'text-slate-500 hover:bg-slate-50 hover:text-gray-900'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </aside>
  );
}

function FoodRow({ food, cartItem, onAddToCart, onQuantityChange, onOpenDetail }: any) {
  const soldOut = food?.isAvailable === false;

  return (
    <div
      onClick={onOpenDetail}
      className="bg-white rounded-xl border border-slate-100 p-3 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:border-slate-200 transition-all flex gap-3.5 cursor-pointer active:bg-slate-50/60 relative"
    >
      {/* Ảnh món nằm bên TRÁI */}
      <div className="relative flex-shrink-0 w-20 h-20 lg:w-24 lg:h-24 rounded-lg overflow-hidden bg-gray-50 border border-slate-100 self-center">
        <img
          src={
            food?.imageUrl && food.imageUrl.length > 0
              ? food.imageUrl[0].url
              : 'https://placehold.co/400x300/f8f9fc/a3a8bf?text=No+Image'
          }
          alt={food.name}
          className={`w-full h-full text-[10px] object-cover ${soldOut ? 'grayscale opacity-60' : ''}`}
        />
        {soldOut && (
          <div className="absolute inset-x-0 bottom-0 bg-gray-950/80 text-white text-[9px] font-bold text-center py-1">
            Đã bán hết
          </div>
        )}
      </div>

      {/* Thông tin món nằm bên PHẢI */}
      <div className="flex-1 min-w-0 space-y-1 pt-0.5 pr-10">
        <div className="space-y-0.5">
          <span className="text-[8px] font-extrabold text-cerulean-blue-600 uppercase tracking-wider bg-cerulean-blue-50 px-1 py-0.5 rounded">
            {extractId(food.category, 'name')}
          </span>
          <h3 className="font-extrabold text-xs lg:text-sm text-gray-900 tracking-tight leading-snug truncate pt-0.5">
            {food.name}
          </h3>
        </div>
        <p className="text-xs font-black text-gray-950">{food.price.toLocaleString('vi-VN')} đ</p>
        <p className="text-[10px] text-slate-400 font-light leading-relaxed line-clamp-2">
          {food.description}
        </p>
      </div>

      {/* Nút add/stepper nằm ở góc dưới bên PHẢI của card (không nằm trên ảnh) */}
      <div className="absolute bottom-3 right-3 flex-shrink-0">
        {soldOut ? null : !cartItem ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(food);
            }}
            aria-label={`Thêm món ${food.name}`}
            className="flex items-center justify-center w-6 h-6 rounded-full bg-cerulean-blue-600 text-white shadow-lg shadow-cerulean-blue-200 transition-all hover:bg-cerulean-blue-700 active:scale-90"
          >
            <Plus className="w-4 h-4" />
          </button>
        ) : (
          <div className="bg-white border border-slate-200 text-gray-800 font-bold text-xs rounded-full shadow-lg flex items-center justify-between p-0.5 gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuantityChange(food._id, -1);
              }}
              aria-label={`Giảm số lượng ${food.name}`}
              className="flex items-center justify-center w-6 h-6 rounded-lg text-slate-400 hover:bg-slate-100 active:scale-90 transition-all"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-black text-[10px] text-cerulean-blue-600 w-4 text-center select-none">
              {cartItem.quantity}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuantityChange(food._id, 1);
              }}
              aria-label={`Tăng số lượng ${food.name}`}
              className="flex items-center justify-center w-6 h-6 rounded-lg text-slate-400 hover:bg-slate-100 active:scale-90 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface OrderSummaryProps {
  cartItems: any[];
  subtotal: number;
  onQuantityChange: (id: string, delta: number) => void;
  onCheckout: () => void;
  tableNumber: Number | null;
  isInsideDrawer?: boolean;
  activeOrder?: any;
}

function OrderSummary({
  cartItems,
  subtotal,
  onQuantityChange,
  onCheckout,
  tableNumber,
  isInsideDrawer = false,
  activeOrder,
}: OrderSummaryProps) {
  return (
    <aside
      className={`bg-white flex flex-col h-full ${isInsideDrawer ? 'p-3 shadow-none border-none' : 'p-5 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] rounded-2xl'}`}
    >
      {/* HEADER GIỎ HÀNG — ẩn khi ở trong drawer để drawer tự có header với nút back */}
      {!isInsideDrawer && (
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm font-black tracking-tight text-gray-900">
            <ShoppingBag className="w-4 h-4 text-gray-900" />
            <span>
              {activeOrder
                ? 'Gọi thêm món mới'
                : tableNumber
                  ? `Giỏ hàng Bàn ${tableNumber}`
                  : 'Giỏ hàng giao tận nơi'}
            </span>
          </div>
          <span className="text-[11px] font-bold text-cerulean-blue-700 bg-cerulean-blue-50 px-2.5 py-1 rounded-md">
            {cartItems?.reduce((acc, item) => acc + (item?.quantity || 0), 0)} món chọn thêm
          </span>
        </div>
      )}

      {/* DANH SÁCH MÓN ĂN - CHỈ CHO PHÉP SCROLL Ở ĐÂY */}
      <div className="flex-1 overflow-y-auto pr-1 no-scrollbar space-y-3 min-h-0">
        {cartItems?.length > 0 ? (
          cartItems?.map((item) => (
            <div
              key={item.food._id}
              className="p-3 bg-slate-50/60 rounded-xl border border-slate-100/60 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-[9px] font-black text-cerulean-blue-600/80 uppercase tracking-wide">
                    {extractId(item.food.category, 'name') || 'Món ăn'}
                  </p>
                  <h4 className="text-xs font-bold text-gray-900 leading-tight truncate">
                    {item.food.name}
                  </h4>
                </div>
                <p className="text-xs font-black text-gray-900 text-right flex-shrink-0">
                  {(item.food.price * (item.quantity || 0)).toLocaleString('vi-VN')} đ
                </p>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-100/40">
                <span className="text-[10px] text-slate-400 font-medium">Số lượng đặt:</span>
                <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 rounded-lg p-1 shadow-sm">
                  <button
                    onClick={() => onQuantityChange(item.food._id, -1)}
                    aria-label={`Giảm số lượng ${item.food.name}`}
                    className="flex items-center justify-center w-5 h-5 rounded-full text-slate-400 hover:bg-slate-100 active:scale-90 transition-all"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-xs text-gray-800 w-5 text-center">
                    {item.quantity || 0}
                  </span>
                  <button
                    onClick={() => onQuantityChange(item.food._id, 1)}
                    aria-label={`Tăng số lượng ${item.food.name}`}
                    className="flex items-center justify-center w-5 h-5 rounded-full text-slate-400 hover:bg-slate-100 active:scale-90 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-xs text-slate-400 italic">
            Giỏ hàng đang trống.
            <br />
            Vui lòng chọn món ăn phía bên trái!
          </div>
        )}
      </div>

      {/* PHẦN TỔNG TIỀN VÀ NÚT ĐẶT HÀNG */}
      <div className="pt-4 border-t border-slate-100 flex-shrink-0 bg-white space-y-3 mt-auto">
        <div className="flex justify-between items-baseline">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">
            Tạm tính đợt này
          </span>
          <p className="text-xl font-black text-cerulean-blue-700 tracking-tighter">
            {subtotal.toLocaleString('vi-VN')} đ
          </p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-light">
          <Info className="w-3 h-3 text-slate-300" />
          <span>
            {tableNumber
              ? 'Món ăn sẽ được chuyển thẳng tới quầy bếp phục vụ'
              : 'Giá chưa bao gồm phí ship'}
          </span>
        </div>

        <button
          onClick={onCheckout}
          disabled={cartItems?.length === 0}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-cerulean-blue-600 hover:bg-cerulean-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white font-black text-xs py-3.5 tracking-wider uppercase transition-all shadow-md active:scale-[0.99]"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>
            {activeOrder
              ? 'Gửi món gọi thêm vào bếp'
              : tableNumber
                ? `Xác nhận gửi đơn Bàn ${tableNumber}`
                : 'Tiến hành đặt giao hàng'}
          </span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}

// COMPONENT ĐỘC LẬP: THEO DÕI TRẠNG THÁI MÓN ĂN VÀ GỌI THANH TOÁN
interface ActiveOrderStatusProps {
  activeOrder: any;
  tableNumber: any;
  onPaymentRequest: () => void;
}

function ActiveOrderStatus({ activeOrder, tableNumber, onPaymentRequest }: ActiveOrderStatusProps) {
  if (!activeOrder) return null;

  // Đưa các Icon vào trong object STATUS để dễ quản lý và hiển thị động
  const STATUS: Record<string, { text: string; color: string; icon: React.ReactNode }> = {
    pending: {
      text: 'Chờ xác nhận',
      color: 'text-gray-500 bg-gray-50 border-gray-200',
      icon: <Clock className="w-3 h-3" />,
    },
    preparing: {
      text: 'Đang chế biến',
      color: 'text-amber-600 bg-amber-50 border-amber-100',
      icon: <span className="w-1 h-1 rounded-full bg-amber-500 animate-ping mr-0.5" />,
    },
    served: {
      text: 'Đã phục vụ',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
  };

  return (
    <div className="bg-white flex flex-col h-full p-3">
      {/* Header trạng thái */}

      {/* Danh sách các món ăn đã order trong bếp - Chỉ scroll ở đây */}
      <div className="flex-1 overflow-y-auto pr-1 no-scrollbar space-y-3 min-h-0 pb-2">
        {mergeOrderItems(activeOrder.items || []).map((item: any, index: number) => {
          // Lấy cấu hình trạng thái hiện tại dựa vào item.status từ backend gửi về
          // Nếu không khớp trạng thái nào, mặc định hiển thị theo 'pending'
          const currentStatus = STATUS[item.status] || STATUS.pending;

          return (
            <div
              key={index}
              className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-gray-900 truncate">{item?.nameSnapshot}</h4>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Số lượng đặt:{''}
                  <span className="text-gray-900 font-mono font-bold">{item.quantity}</span>
                </p>
              </div>

              {/* Trạng thái ra món động theo object STATUS */}
              <div className="flex-shrink-0">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-md border ${currentStatus.color}`}
                >
                  {currentStatus.icon}
                  {currentStatus.text}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Phần thanh toán cố định bên dưới */}
      <div className="pt-4 border-t border-slate-100 flex-shrink-0 bg-white space-y-3 mt-auto">
        <div className="flex justify-between items-baseline">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">
            Tổng hóa đơn hiện tại
          </span>
          <p className="text-xl font-black text-gray-900 tracking-tighter">
            {(activeOrder.totalAmount || 0).toLocaleString('vi-VN')} đ
          </p>
        </div>

        <button
          onClick={onPaymentRequest}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3.5 tracking-wider uppercase transition-all shadow-md active:scale-[0.99]"
        >
          <Receipt className="w-4 h-4" />
          <span>Yêu cầu thanh toán tại bàn</span>
        </button>
      </div>
    </div>
  );
}

// COMPONENT DRAWER CHI TIẾT MÓN ĂN — BOTTOM SHEET
interface ItemDetailSheetProps {
  food: IMenuItem;
  cartItem?: any;
  onClose: () => void;
  onConfirmAdd: (food: IMenuItem, qty: number) => void;
}

function ItemDetailSheet({ food, cartItem, onClose, onConfirmAdd }: ItemDetailSheetProps) {
  const soldOut = food?.isAvailable === false;

  // Số lượng mặc định là 1 khi mở chi tiết (để luôn tăng/giảm được)
  const [qty, setQty] = useState<number>(cartItem?.quantity || 1);

  // MOCK: danh sách option (topping) — chuẩn bị cho tính năng option của món
  const mockOptions = [
    { id: 'opt-1', name: 'Thêm trứng ốp la', price: 5000 },
    { id: 'opt-2', name: 'Thêm phô mai', price: 8000 },
    { id: 'opt-3', name: 'Thêm hành phi', price: 3000 },
  ];
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const toggleOption = (id: string) => {
    setSelectedOptions((prev) =>
      prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id],
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header drawer: nút back + tiêu đề */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 shrink-0">
        <button
          onClick={onClose}
          aria-label="Đóng chi tiết món"
          className="flex items-center justify-center w-8 h-8 rounded-sm bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-90 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-black text-gray-900">Chi tiết món</span>
      </div>

      {/* Nội dung chi tiết */}
      <div className="flex-1 overflow-y-auto min-h-0 no-scrollbar">
        {/* Ảnh lớn — object-contain để ảnh nằm trọn trong khung, không bị cắt */}
        <div className="relative w-full aspect-[16/9] bg-slate-50">
          <img
            src={
              food?.imageUrl && food.imageUrl.length > 0
                ? food.imageUrl[0].url
                : 'https://placehold.co/800x450/f8f9fc/a3a8bf?text=No+Image'
            }
            alt={food.name}
            className={`w-full h-full object-contain ${soldOut ? 'grayscale opacity-60' : ''}`}
          />
          {soldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-950/40">
              <span className="bg-gray-950/80 text-white text-xs font-black px-3 py-1.5 rounded-full">
                Đã bán hết
              </span>
            </div>
          )}
        </div>

        <div className="px-5 py-5 space-y-4">
          <div className="space-y-1.5">
            <h2 className="text-lg font-black text-gray-900 tracking-tight leading-snug">
              {food.name}
            </h2>
          </div>

          {food.description && (
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Mô tả
              </p>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                {food.description}
              </p>
            </div>
          )}

          {/* MOCK: Lựa chọn thêm (topping/option) — chuẩn bị cho phần option của món */}
          {!soldOut && (
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Lựa chọn thêm
              </p>
              <div className="space-y-2">
                {mockOptions.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center justify-between gap-3 p-3 bg-slate-50/60 rounded-xl border border-slate-100/60 cursor-pointer select-none active:bg-slate-100/60"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedOptions.includes(opt.id)}
                        onChange={() => toggleOption(opt.id)}
                        className="accent-cerulean-blue-600 w-4 h-4 shrink-0"
                      />
                      <span className="text-xs font-bold text-gray-900 truncate">{opt.name}</span>
                    </span>
                    <span className="text-[10px] font-black text-cerulean-blue-600 shrink-0">
                      +{opt.price.toLocaleString('vi-VN')} đ
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer cố định: nút tăng/giảm ngang hàng với nút thêm giỏ, giá nằm trong nút thêm giỏ */}
      <div className="px-4 py-4 border-t border-slate-100 flex-shrink-0 bg-white">
        {soldOut ? (
          <div className="w-full text-center text-xs font-black text-slate-400 py-3.5 bg-slate-50 rounded-xl uppercase tracking-wider">
            Món này hiện đã bán hết
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            {/* Nút tăng/giảm số lượng (state local, mặc định 1) */}
            <div className="flex items-center gap-3 p-2 bg-slate-50/70 rounded-xl border border-slate-100 shrink-0">
              <button
                onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                disabled={qty <= 1}
                className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-500 text-slate-500 disabled:opacity-40 active:scale-90 transition-all"
                aria-label={`Giảm số lượng ${food.name}`}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-gray-900 w-6 text-center select-none font-black text-sm">
                {qty}
              </span>
              <button
                onClick={() => setQty((prev) => prev + 1)}
                className="flex items-center justify-center w-9 h-9 rounded-lg bg-cerulean-blue-100 border border-cerulean-600 text-slate-500 active:scale-90 transition-all"
                aria-label={`Tăng số lượng ${food.name}`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Nút thêm vào giỏ — giá nằm bên dưới chữ */}
            <button
              onClick={() => onConfirmAdd(food, qty)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 rounded-xl bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white font-black text-xs py-3 tracking-wide uppercase transition-all shadow-md active:scale-[0.99]"
            >
              <span className="flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4" />
                Thêm vào giỏ
              </span>
              <span className="text-[10px] font-bold text-cerulean-blue-100 normal-case">
                {(food.price * qty).toLocaleString('vi-VN')} đ
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
