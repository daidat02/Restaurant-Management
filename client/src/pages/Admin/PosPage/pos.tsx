import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PanelLeft, Plus, Search, UtensilsCrossed } from 'lucide-react';
import { useMenu } from '@/hooks/use-menu';
import type { IMenuItem } from '@/types/category.type';
import type { Image } from '@/types/image.type';
import { useTable } from '@/hooks/use-table';
import type { ITable } from '@/types/table.type';
import type { IOrder, IOrderItem } from '@/types/order.type';
import { useOrder } from '@/hooks/use-order';
import { useActiveRestaurantId } from '@/hooks/use-active-restaurant';
import { useAuth } from '@/hooks/use-auth';
import { PaymentModal } from '../components/PaymentModal';
import PosItemOptionsModal from '../components/PosItemOptionsModal';
import PosBill from '../components/PosBill';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from '@/components/ui/drawer';

// ==========================================
// COMPONENT ITEM CARD
// ==========================================
interface ItemCardProps {
  item: IMenuItem;
  inCartCount?: number;
  onClick: (item: IMenuItem) => void;
}

export const ItemCard = ({ item, inCartCount = 0, onClick }: ItemCardProps) => {
  const defaultImage = 'https://placehold.co/400x300/f8f9fc/a3a8bf?text=No+Image';

  let displayImg = defaultImage;
  if (item.imageUrl && item.imageUrl.length > 0) {
    const firstImage = item.imageUrl[0];
    displayImg =
      typeof firstImage === 'string' ? firstImage : (firstImage as Image).url || defaultImage;
  }

  return (
    <div
      onClick={() => item.isAvailable && onClick(item)}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all duration-200 ${
        item.isAvailable
          ? 'cursor-pointer hover:-translate-y-0.5 hover:border-cerulean-blue-300 hover:shadow-md active:scale-95'
          : 'cursor-not-allowed opacity-60'
      }`}
    >
      <div className="relative h-20 w-full shrink-0 overflow-hidden bg-gray-50 sm:h-24">
        <img
          src={displayImg}
          alt={item.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = defaultImage;
          }}
        />
        {!item.isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
            <span className="rounded-full bg-rose-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
              Hết món
            </span>
          </div>
        )}
      </div>

      {/* Badge số lượng đã chọn */}
      {inCartCount > 0 && (
        <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-cerulean-blue-600 px-1.5 text-xs font-bold text-white shadow">
          {inCartCount}
        </span>
      )}

      <div className="flex flex-1 flex-col p-2.5">
        <h3 className="line-clamp-2 text-xs font-semibold leading-tight text-gray-900" title={item.name}>
          {item.name}
        </h3>
        <div className="mt-auto flex items-center justify-between pt-1.5">
          <span className="text-sm font-extrabold text-cerulean-blue-700">
            {item.price.toLocaleString('vi-VN')}đ
          </span>
          {item.isAvailable && (
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cerulean-blue-50 text-cerulean-blue-600 transition-colors group-hover:bg-cerulean-blue-500 group-hover:text-white">
              <Plus className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// HEADER POS (toàn màn hình, không sidebar)
// ==========================================
const PosHeader = ({
  tableNumber,
  onBack,
}: {
  tableNumber?: number | null;
  onBack: () => void;
}) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = now.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm">
      {/* Trái: thương hiệu + tiêu đề */}
      <div className="flex items-center gap-2.5 rounded-xl px-2 py-1">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cerulean-blue-600 text-white">
          <UtensilsCrossed className="h-4 w-4" />
        </span>
        <span className="hidden text-sm font-extrabold tracking-tight text-gray-900 sm:block">
          NhàHàng OS
        </span>
      </div>
      <div className="hidden h-5 w-px bg-slate-200 sm:block" />
      <div className="hidden items-center gap-2 text-sm sm:flex">
        <span className="font-semibold text-gray-900">POS Bán Hàng</span>
        {tableNumber ? (
          <span className="rounded-full bg-cerulean-blue-50 px-2 py-0.5 text-[11px] font-semibold text-cerulean-blue-700">
            Bàn {tableNumber}
          </span>
        ) : null}
      </div>

      {/* Phải: đồng hồ + máy in + nút quay về admin */}
      <div className="ml-auto flex items-center gap-2">
        <span className="hidden rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 tabular-nums md:block">
          {timeStr}
        </span>
        <span className="rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
          <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Kết nối máy in
        </span>
        <button
          onClick={onBack}
          title="Về bảng điều khiển"
          className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-cerulean-blue-600"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};

// ==========================================
// TRANG POS
// ==========================================
export default function POS() {
  const activeRestaurantId = useActiveRestaurantId();
  const { user } = useAuth();
  const { categories, fetchCategories, fetchAllItems, items } = useMenu();
  const { fetchTableById } = useTable();
  const { fetchOrderById, currentOrder } = useOrder();

  // 1. Đọc Params từ URL
  const [searchParams, setSearchParams] = useSearchParams();
  const tableIdFromUrl = searchParams.get('tableId');
  const orderIdFromUrl = searchParams.get('orderId');

  const [order, setOrder] = useState<IOrder | null>(currentOrder);
  const [orderItems, setOrderItems] = useState<IOrderItem[]>(
    (order?.items || []).filter((i) => i.status !== 'deleted'),
  );
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState<ITable | null>(null);
  const [orderIdSelected, setOrderIdSelected] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  // Món đang mở modal chọn option (món có optionGroups phải chọn đủ trước khi thêm)
  const [optionItem, setOptionItem] = useState<IMenuItem | null>(null);

  // STATE: Quản lý ẩn/hiện giỏ hàng trên Mobile
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const navigate = useNavigate();

  // Nút "Về bảng điều khiển": điều hướng theo role về trang quản lý của user.
  // Không dùng navigate(-1) vì staff vào POS qua redirect /staff -> POS nên back dễ bị kẹt loop.
  const handleBack = () => {
    const home = user?.role === 'staff' ? '/staff/orders' : '/manager/tables';
    navigate(home);
  };

  // FETCH DATA BAN ĐẦU
  useEffect(() => {
    fetchCategories(activeRestaurantId);
    fetchAllItems(activeRestaurantId);

    if (tableIdFromUrl) {
      const getTableInfo = async () => {
        const tableData = await fetchTableById(tableIdFromUrl);
        if (tableData) {
          setSelectedTable(tableData);
        }
      };
      getTableInfo();
    }

    if (orderIdFromUrl) {
      const getOrderDetail = async () => {
        await fetchOrderById(orderIdFromUrl);
      };
      getOrderDetail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableIdFromUrl, orderIdFromUrl]);

  // LỌC DANH MỤC + TÌM KIẾM
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (
      items?.filter((item) => {
        const okCat =
          activeCategory === 'all' ||
          (() => {
            const itemCategoryId =
              typeof item.category === 'object' ? (item.category as any)._id : item.category;
            return itemCategoryId === activeCategory;
          })();
        const okSearch = !q || item.name.toLowerCase().includes(q);
        return okCat && okSearch;
      }) || []
    );
  }, [items, activeCategory, searchQuery]);

  // MAP SỐ LƯỢNG MÓN ĐANG CHỌN TRONG GIỎ (để hiện badge trên thẻ)
  const cartCounts = useMemo(() => {
    const m: Record<string, number> = {};
    orderItems.forEach((it) => {
      const id =
        typeof it.menuItem === 'object' ? (it.menuItem as any)._id : it.menuItem;
      if (id) m[id] = (m[id] || 0) + it.quantity;
    });
    return m;
  }, [orderItems]);

  // ==========================================
  // LOGIC XỬ LÝ GIỎ HÀNG
  // ==========================================
  // Thêm món vào giỏ — toppings (từ modal option) tính thẳng vào giá dòng, khớp cách server snapshot.
  const addItemToCart = (
    selectedItem: IMenuItem,
    toppings: { name: string; price: number }[] = [],
  ) => {
    setOrderItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex((item) => {
        const itemId =
          typeof item.menuItem === 'object' ? (item.menuItem as any)._id : item.menuItem;
        return itemId === selectedItem._id;
      });

      if (toppings.length === 0 && existingItemIndex >= 0) {
        const updatedItems = [...prevItems];
        const currentItem = updatedItems[existingItemIndex];
        updatedItems[existingItemIndex] = {
          ...currentItem,
          quantity: currentItem.quantity + 1,
        };
        return updatedItems;
      }

      const toppingsPrice = toppings.reduce((sum, t) => sum + t.price, 0);
      const newItem = {
        // Mỗi dòng cần định danh riêng: cùng món nhưng khác topping phải là dòng độc lập
        lineId:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        menuItem: selectedItem._id as string,
        nameSnapshot: selectedItem.name,
        priceSnapshot: selectedItem.price + toppingsPrice,
        quantity: 1,
        ...(toppings.length > 0 ? { toppings } : {}),
      } as IOrderItem;

      return [...prevItems, newItem];
    });
  };

  const handleAddItem = (selectedItem: IMenuItem) => {
    // Món có nhóm lựa chọn → bắt buộc mở modal chọn option rồi hẳn thêm vào giỏ
    const hasOptions = (selectedItem.optionGroups || []).some(
      (group) => (group.choices?.length ?? 0) > 0,
    );
    if (hasOptions) {
      setOptionItem(selectedItem);
      return;
    }
    addItemToCart(selectedItem);
  };

  const handleUpdateQuantity = (lineId: string | number, delta: number) => {
    setOrderItems((prev) =>
      prev.map((item) => {
        if (item.lineId === lineId) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      }),
    );
  };

  const handleRemoveItem = (lineId: string | number) => {
    setOrderItems((prev) => prev.filter((item) => item.lineId !== lineId));
  };

  useEffect(() => {
    if (currentOrder && orderIdFromUrl) {
      // Giữ thông tin đơn cũ (mã đơn/bàn) nhưng GIỎ HÀNG TRỐNG —
      // khi gọi thêm món, chỉ gửi món mới lên bếp, không kèm món đã order.
      setOrder(currentOrder);
      setOrderItems([]);
    } else if (!orderIdFromUrl) {
      setOrderItems([]);
    }
  }, [currentOrder, orderIdFromUrl]);

  // TÍNH TOÁN TỔNG SỐ LƯỢNG & TIỀN CHO NÚT MOBILE
  const totalMobileQuantity = orderItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalMobilePrice = orderItems.reduce(
    (acc, item) => acc + (item.priceSnapshot || 0) * item.quantity,
    0,
  );

  // Thông tin bàn cho header/bill
  const tableNumber =
    currentOrder?.table && typeof currentOrder.table === 'object'
      ? (currentOrder.table as ITable).tableNumber
      : selectedTable?.tableNumber;

  const handleTriggerPayment = async (orderId: string | null) => {
    if (!orderId) return;
    const params = new URLSearchParams(searchParams);
    params.set('orderId', orderId as string);
    setSearchParams(params, { replace: true });

    setOrderIdSelected(orderId);
    setIsMobileCartOpen(false); // Đóng bottom sheet khi mở modal thanh toán

    const result = await fetchOrderById(orderId as string);
    if (result) {
      setOrder(result);
      setOrderItems([]);
    }
    setIsPaymentModalOpen(true);
  };
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f8f9fc] supports-[height:100dvh]:h-dvh">
      <PosHeader tableNumber={tableNumber} onBack={handleBack} />

      {/* BODY: menu + giỏ hàng */}
      <div className="flex flex-1 min-h-0">
        {/* BÊN TRÁI: DANH SÁCH MÓN ĂN */}
        <main className="flex min-w-0 flex-1 flex-col">
          {/* Tabs danh mục */}
          <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setActiveCategory('all')}
              className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                activeCategory === 'all'
                  ? 'bg-cerulean-blue-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              Tất cả ({items?.length || 0})
            </button>
            {categories?.map((cat) => (
              <button
                key={cat._id}
                onClick={() => setActiveCategory(cat._id)}
                className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                  activeCategory === cat._id
                    ? 'bg-cerulean-blue-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                {cat.name} ({cat.foodCount || 0})
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative border-b border-slate-200 bg-white px-4 py-3">
            <Search className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm nhanh món..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-sm outline-none transition focus:border-cerulean-blue-500 focus:bg-white focus:ring-2 focus:ring-cerulean-blue-100"
            />
          </div>

          {/* Lưới món */}
          <div className="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto p-4 pb-28 sm:grid-cols-3 lg:pb-4 xl:grid-cols-4 2xl:grid-cols-5">
            {filteredItems.map((item) => (
              <ItemCard
                key={item._id}
                item={item}
                inCartCount={cartCounts[item._id] || 0}
                onClick={handleAddItem}
              />
            ))}

            {filteredItems.length === 0 && (
              <div className="col-span-full py-12 text-center text-sm font-medium text-gray-400">
                Không có món ăn nào trong danh mục này.
              </div>
            )}
          </div>
        </main>

        {/* BÊN PHẢI: GIỎ HÀNG (Desktop) */}
        <aside className="hidden w-[380px] shrink-0 flex-col border-l border-slate-200 bg-white lg:flex">
          <div className="flex-1 overflow-hidden">
            <PosBill
              order={order || undefined}
              orderItems={orderItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onClearOrder={() => setOrderItems([])}
              tableInfo={
                currentOrder?.table && typeof currentOrder.table === 'object'
                  ? (currentOrder.table as ITable)
                  : selectedTable || undefined
              }
              onTriggerPayment={handleTriggerPayment}
            />
          </div>
        </aside>
      </div>

      {/* Thanh nổi giỏ hàng MOBILE */}
      {totalMobileQuantity > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-30 lg:hidden">
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="flex w-full items-center justify-between rounded-2xl bg-cerulean-blue-600 p-4 font-semibold text-white shadow-xl transition-transform active:scale-95"
          >
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-white/20 px-3 py-1 text-sm">
                {totalMobileQuantity} món
              </div>
              <span>Xem giỏ hàng</span>
            </div>
            <span className="text-lg font-bold">{totalMobilePrice.toLocaleString('vi-VN')}đ</span>
          </button>
        </div>
      )}

      {/* Drawer giỏ hàng MOBILE: full màn hình */}
      <Drawer open={isMobileCartOpen} onOpenChange={(o) => (o ? null : setIsMobileCartOpen(false))}>
        <DrawerContent className="mx-auto h-screen! max-h-screen! rounded-t-none! border-t-0! mt-0! lg:hidden supports-[height:100dvh]:h-[100dvh]! supports-[height:100dvh]:max-h-[100dvh]!">
          {/* Title ẩn cho accessibility; số món nằm cùng hàng với bàn/mã đơn trong PosBill */}
          <DrawerTitle className="sr-only">Giỏ hàng</DrawerTitle>

          <div className="min-h-0 flex-1 overflow-hidden">
            <PosBill
              order={order || undefined}
              orderItems={orderItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onClearOrder={() => setOrderItems([])}
              tableInfo={
                currentOrder?.table && typeof currentOrder.table === 'object'
                  ? (currentOrder.table as ITable)
                  : selectedTable || undefined
              }
              onTriggerPayment={handleTriggerPayment}
            />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Modal chọn option cho món có optionGroups — chọn xong mới thêm vào giỏ */}
      {optionItem && (
        <PosItemOptionsModal
          key={optionItem._id}
          open
          item={optionItem}
          onOpenChange={(o) => {
            if (!o) setOptionItem(null);
          }}
          onConfirm={(item, toppings) => {
            addItemToCart(item, toppings);
            setOptionItem(null);
          }}
        />
      )}

      {/* Modal thanh toán */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        orderId={orderIdSelected}
        onOpen={() => setIsPaymentModalOpen(true)}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setOrderIdSelected(null);
        }}
        onPaymentSucess={() => {
          handleBack();
        }}
      />
    </div>
  );
}
