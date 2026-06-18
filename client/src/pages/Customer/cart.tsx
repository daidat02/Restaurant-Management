import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
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
} from 'lucide-react';
import { useMenu } from '@/hooks/use-menu';
import { extractId } from '@/utils/helpers';
import { addToCart, updateQuantity, clearCart } from '@/redux/slices/cartSlice';
import type { IMenuItem } from '@/types/category.type';
import { useAppSelector } from '@/hooks/redux-hook';
import { useTable } from '@/hooks/use-table';
import SideDrawer from '@/components/SideDrawer';
import { useAuth } from '@/hooks/use-auth';
import { useOrder } from '@/hooks/use-order';
import type { IOrder } from '@/types/order.type';

interface LayoutContextType {
  openLoginModal: () => void;
}

export default function CartPage() {
  const context = useOutletContext<LayoutContextType>() || {};
  const openLoginModal =
    context.openLoginModal || (() => console.log('Không tìm thấy Login Modal'));
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { categories, items, fetchCategories, fetchTopBestSellers, fetchItemsByCat } = useMenu();
  const { currentOrder, addOrder, addItemToOrder, fetchOrderByTableId, startListeningOrderSocket } =
    useOrder();
  const { currentTable, fetchTableById } = useTable();
  const [activeTab, setActiveTab] = useState<string>('all');

  // Quản lý 2 Drawer riêng biệt cho Mobile
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);
  const [isStatusDrawerOpen, setIsStatusDrawerOpen] = useState<boolean>(false);

  // Đơn hàng thực tế đã gửi xuống nhà bếp thành công
  const [activeOrder, setActiveOrder] = useState<any>(currentOrder || null);

  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('tableId');

  const { isAuthenticated, user } = useAuth();

  //redux
  const { restaurantSelected } = useAppSelector((state) => state.restaurant);
  const { cartItems } = useAppSelector((state) => state.cart);

  const subtotal = (cartItems || []).reduce(
    (acc, item) => acc + item.food?.price * item.quantity,
    0,
  );
  const totalItemsCount = (cartItems || []).reduce((acc, item) => acc + (item?.quantity || 0), 0);

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
    console.log(food);
    dispatch(addToCart({ food }));
  };

  const handleQuantityChange = (id: string, delta: number) => {
    dispatch(updateQuantity({ id, delta }));
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
        console.log(activeOrder);
        await addItemToOrder(dineInOrderPayload);
        fetchActiveOrder(tableId);
      } else {
        const createPayload: IOrder = {
          table: tableId as any,
          restaurant: extractId(currentTable?.restaurant) as any,
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

  // Khách bấm nút gọi thanh toán tại bàn
  const handlePaymentRequest = async () => {
    if (!tableId) return;
    const confirmPayment = window.confirm('Bạn có muốn gửi yêu cầu thanh toán tới nhân viên?');
    if (confirmPayment) {
      console.log('API CALL: POST /api/orders/request-payment', { tableId });
      alert('Đã gửi yêu cầu thanh toán! Nhân viên sẽ mang hóa đơn tới bàn của bạn ngay.');
      setIsStatusDrawerOpen(false);
    }
  };

  const menuTabs = [{ _id: 'all', name: 'Gợi Ý Cho Bạn' }, ...(categories || [])];

  useEffect(() => {
    if (restaurantSelected && !tableId) {
      fetchCategories(restaurantSelected || '');
    }
    if (tableId) {
      const fetchDataToScanQR = async () => {
        const table = await fetchTableById(tableId);
        await fetchActiveOrder(tableId);
        await fetchCategories(extractId(table?.restaurant));
        fetchTopBestSellers(extractId(table?.restaurant));
      };
      fetchDataToScanQR();
    }
  }, [fetchCategories, fetchTableById, tableId]);

  useEffect(() => {
    if (activeTab && activeTab === 'all' && !tableId) {
      if (restaurantSelected) {
        fetchTopBestSellers(restaurantSelected || '');
      }
    } else {
      fetchItemsByCat(activeTab);
    }
  }, [activeTab, fetchItemsByCat, fetchTopBestSellers]);

  return (
    <div className="w-full min-h-screen bg-white pb-24 pt-4 text-gray-800 antialiased font-sans relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-16">
        {/* THANH ĐIỀU HƯỚNG TRÊN CÙNG (MOBILE HEADER) */}
        <MobileHeader
          menuTabs={menuTabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onBack={() => navigate(-1)}
          tableNumber={currentTable?.tableNumber || null}
          activeOrder={activeOrder}
        />

        {/* LAYOUT CHIA CHUẨN KÍCH THƯỚC 3 CỘT */}
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_340px] gap-8 items-start">
          {/* CỘT 1: SIDEBAR DANH MỤC TRÁI */}
          <SidebarMenu menuTabs={menuTabs} activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* CỘT 2: KHU VỰC THỰC ĐƠN TRUNG TÂM */}
          <main className="space-y-4">
            <div className="pb-2 border-b border-gray-100 flex items-baseline justify-between lg:mt-0 mt-2">
              <h2 className="text-sm lg:text-lg font-black text-gray-950 tracking-tight">
                {menuTabs.find((c) => c._id === activeTab)?.name}
              </h2>
              <span className="text-[10px] font-medium text-gray-400 font-mono">
                {items.length} món sẵn có
              </span>
            </div>

            <div className="space-y-3.5">
              {items?.map((food) => (
                <FoodRow
                  key={food._id}
                  food={food}
                  cartItem={cartItems?.find((i) => i.food._id === food._id)}
                  onAddToCart={handleAddToCart}
                  onQuantityChange={handleQuantityChange}
                />
              ))}
            </div>
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
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-400 uppercase">
                    Trạng thái bàn ăn
                  </span>
                  <button
                    onClick={() => setIsStatusDrawerOpen(true)}
                    className="text-xs font-bold text-orange-600 hover:underline"
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
            className="flex-1 flex items-center justify-center gap-1.5 bg-gray-950 text-white rounded-xl p-4 shadow-xl font-bold text-xs uppercase active:scale-95 transition-all"
          >
            <Clock className="w-4 h-4 text-orange-400" />
            <span>Món Đã Gọi</span>
          </button>
        )}

        {/* Nút Xem giỏ hàng tạm thời */}
        {totalItemsCount > 0 && (
          <button
            onClick={() => setIsCartDrawerOpen(true)}
            /* Thay flex-[2] thành flex-1 nếu đã có activeOrder để 2 nút bằng chằn chặn nhau */
            className={`flex flex-items-center justify-between bg-orange-500 text-white rounded-xl p-4 shadow-xl font-bold active:scale-95 transition-all ${
              activeOrder ? 'flex-1 justify-center gap-1.5' : 'flex-[2]'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="bg-orange-600 text-[11px] px-2 py-0.5 rounded-md text-white font-mono">
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

      {/* SIDE DRAWER 1: GIỎ HÀNG THÊM MÓN TRÊN MOBILE */}
      <SideDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        className="!w-[85vw] !max-w-[440px] overflow-hidden"
        isHeaderless={true}
      >
        <div className="h-full mt-[10%] p-3 flex flex-col justify-between overflow-hidden">
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
      </SideDrawer>

      {/* SIDE DRAWER 2: TRẠNG THÁI ĐƠN HÀNG/MÓN ĂN & THANH TOÁN TRÊN MOBILE */}
      <SideDrawer
        isOpen={isStatusDrawerOpen}
        onClose={() => setIsStatusDrawerOpen(false)}
        className="!w-[85vw] !max-w-[440px] overflow-hidden"
        isHeaderless={true}
      >
        <div className="h-[95vh] mt-[10%] p-3 flex flex-col justify-between overflow-hidden">
          <ActiveOrderStatus
            activeOrder={currentOrder}
            tableNumber={currentTable?.tableNumber || tableId}
            onPaymentRequest={handlePaymentRequest}
          />
        </div>
      </SideDrawer>
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
  tableNumber: number | null;
  activeOrder: any;
}

function MobileHeader({
  menuTabs,
  activeTab,
  setActiveTab,
  onBack,
  tableNumber,
  activeOrder,
}: MobileHeaderProps) {
  return (
    <div className="flex flex-col gap-4 mb-6 sticky top-0 bg-white/95 backdrop-blur-md z-40 py-2 border-b border-gray-100 lg:border-none lg:static lg:bg-transparent lg:py-0">
      <div className={`flex items-center  ${tableNumber ? 'justify-end' : 'justify-between'}`}>
        {!tableNumber && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-0.5 transition-transform" />
            <span>Thực đơn chính</span>
          </button>
        )}
        <div className="flex items-center gap-2">
          {activeOrder && (
            <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 font-bold rounded">
              ● Đang phục vụ
            </span>
          )}
          {tableNumber !== null && (
            <div className="text-xs font-black text-gray-900">
              Bàn số: <span className="text-orange-500 font-mono text-sm">{tableNumber}</span>
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
                ? 'bg-orange-50 border-orange-200 text-orange-600 shadow-sm'
                : 'bg-gray-50 border-gray-100 text-gray-500'
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
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-3 mb-2">
        Phân loại món
      </p>
      {menuTabs.map((cat: any) => (
        <button
          key={cat._id}
          onClick={() => setActiveTab(cat._id)}
          className={`w-full text-left px-4 py-2.5 rounded-full text-xs font-bold tracking-tight transition-all duration-150 ${
            activeTab === cat._id
              ? 'bg-orange-50 border border-orange-100 text-orange-600 shadow-[0_2px_8px_rgba(234,88,12,0.02)]'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </aside>
  );
}

function FoodRow({ food, cartItem, onAddToCart, onQuantityChange }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:border-gray-200 transition-all flex gap-4 items-start">
      <div className="flex-1 space-y-1 min-w-0">
        <div className="space-y-0.5">
          <span className="text-[8px] font-extrabold text-orange-500 uppercase tracking-wider bg-orange-50 px-1 py-0.5 rounded">
            {extractId(food.category, 'name')}
          </span>
          <h3 className="font-extrabold text-xs lg:text-sm text-gray-900 tracking-tight leading-snug truncate pt-0.5">
            {food.name}
          </h3>
        </div>
        <p className="text-xs font-black text-gray-950">{food.price.toLocaleString('vi-VN')} đ</p>
        <p className="text-[10px] text-gray-400 font-light leading-relaxed line-clamp-2 pr-2">
          {food.description}
        </p>
      </div>

      <div className="relative flex-shrink-0 w-20 h-20 lg:w-24 lg:h-24 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 self-center">
        <img
          src={
            food?.imageUrl && food.imageUrl.length > 0
              ? food.imageUrl[0].url
              : 'https://placehold.co/400x300/f8f9fc/a3a8bf?text=No+Image'
          }
          alt={food.name}
          className="w-full h-full text-[10px] object-cover"
        />

        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[90%]">
          {!cartItem ? (
            <button
              onClick={() => onAddToCart(food)}
              className="w-full bg-white hover:bg-orange-500 hover:text-white border border-gray-200 text-emerald-600 font-black text-[9px] uppercase py-1 rounded-md shadow-md transition-all active:scale-95"
            >
              Add +
            </button>
          ) : (
            <div className="w-full bg-white border border-gray-200 text-gray-800 font-bold text-xs py-0.5 rounded-md shadow-md flex items-center justify-between px-1">
              <button
                onClick={() => onQuantityChange(food._id, -1)}
                className="p-0.5 hover:bg-gray-50 rounded text-gray-400"
              >
                <Minus className="w-2 h-2" />
              </button>
              <span className="font-black text-[9px] text-orange-600 w-3 text-center select-none">
                {cartItem.quantity}
              </span>
              <button
                onClick={() => onQuantityChange(food._id, 1)}
                className="p-0.5 hover:bg-gray-50 rounded text-gray-400"
              >
                <Plus className="w-2 h-2" />
              </button>
            </div>
          )}
        </div>
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
      className={`bg-white flex flex-col h-[95%] ${isInsideDrawer ? 'p-0 shadow-none border-none' : 'p-5 border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] rounded-2xl'}`}
    >
      {/* HEADER GIỎ HÀNG */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 flex-shrink-0">
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
        <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md">
          {cartItems?.reduce((acc, item) => acc + (item?.quantity || 0), 0)} món chọn thêm
        </span>
      </div>

      {/* DANH SÁCH MÓN ĂN - CHỈ CHO PHÉP SCROLL Ở ĐÂY */}
      <div className="flex-1 overflow-y-auto pr-1 no-scrollbar space-y-3 min-h-0">
        {cartItems?.length > 0 ? (
          cartItems?.map((item) => (
            <div
              key={item.food._id}
              className="p-3 bg-gray-50/50 rounded-xl border border-gray-100/60 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-[9px] font-black text-orange-500/80 uppercase tracking-wide">
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

              <div className="flex items-center justify-between pt-1 border-t border-gray-100/40">
                <span className="text-[10px] text-gray-400 font-medium">Số lượng đặt:</span>
                <div className="flex items-center gap-1.5 bg-white border border-gray-200/80 rounded-md p-0.5 shadow-sm">
                  <button
                    onClick={() => onQuantityChange(item.food._id, -1)}
                    className="p-1 text-gray-400"
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                  <span className="font-bold text-xs text-gray-800 w-5 text-center">
                    {item.quantity || 0}
                  </span>
                  <button
                    onClick={() => onQuantityChange(item.food._id, 1)}
                    className="p-1 text-gray-400"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-xs text-gray-400 italic">
            Giỏ hàng đang trống.
            <br />
            Vui lòng chọn món ăn phía bên trái!
          </div>
        )}
      </div>

      {/* PHẦN TỔNG TIỀN VÀ NÚT ĐẶT HÀNG */}
      <div className="pt-4 border-t border-gray-100 flex-shrink-0 bg-white space-y-3 mt-auto">
        <div className="flex justify-between items-baseline">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide">
            Tạm tính đợt này
          </span>
          <p className="text-xl font-black text-orange-600 tracking-tighter">
            {subtotal.toLocaleString('vi-VN')} đ
          </p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-light">
          <Info className="w-3 h-3 text-gray-300" />
          <span>
            {tableNumber
              ? 'Món ăn sẽ được chuyển thẳng tới quầy bếp phục vụ'
              : 'Giá chưa bao gồm phí ship'}
          </span>
        </div>

        <button
          onClick={onCheckout}
          disabled={cartItems?.length === 0}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:cursor-not-allowed text-white font-black text-xs py-3.5 tracking-wider uppercase transition-all shadow-md active:scale-[0.99]"
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
    <div className="bg-white flex flex-col h-full">
      {/* Header trạng thái */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2 text-sm font-black tracking-tight text-gray-900">
          <Clock className="w-4 h-4 text-orange-500" />
          <span>Danh sách món đã gọi - Bàn {tableNumber}</span>
        </div>
      </div>

      {/* Danh sách các món ăn đã order trong bếp - Chỉ scroll ở đây */}
      <div className="flex-1 overflow-y-auto pr-1 no-scrollbar space-y-3 min-h-0">
        {activeOrder.items?.map((item: any, index: number) => {
          // Lấy cấu hình trạng thái hiện tại dựa vào item.status từ backend gửi về
          // Nếu không khớp trạng thái nào, mặc định hiển thị theo 'pending'
          const currentStatus = STATUS[item.status] || STATUS.pending;

          return (
            <div
              key={index}
              className="p-3 bg-gray-50/70 rounded-xl border border-gray-100 flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-gray-900 truncate">{item?.nameSnapshot}</h4>
                <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                  Số lượng đặt:{' '}
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
      <div className="pt-4 border-t border-gray-100 flex-shrink-0 bg-white space-y-3 mt-auto">
        <div className="flex justify-between items-baseline">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide">
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
