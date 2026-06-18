import { useEffect, useState } from 'react';
import { CustomTabs } from '@/components/tabsCustom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMenu } from '@/hooks/use-menu';
import type { IMenuItem } from '@/types/category.type';
import { useTable } from '@/hooks/use-table';
import type { ITable } from '@/types/table.type';
import type { IOrder, IOrderItem } from '@/types/order.type';
import { useOrder } from '@/hooks/use-order';
import { useAuth } from '@/hooks/use-auth';
import { extractId } from '@/utils/helpers';
import { PaymentModal } from '../components/PaymentModal';
import FormBillOrder from '../components/FormBillOrder';

// ==========================================
// COMPONENT ITEM CARD
// ==========================================
interface ItemCardProps {
  item: IMenuItem;
  onClick: (item: IMenuItem) => void;
}

export const ItemCard = ({ item, onClick }: ItemCardProps) => {
  const defaultImage = 'https://placehold.co/400x300/f8f9fc/a3a8bf?text=No+Image';

  let displayImg = defaultImage;
  if (item.imageUrl && item.imageUrl.length > 0) {
    const firstImage = item.imageUrl[0];
    displayImg =
      typeof firstImage === 'string' ? firstImage : (firstImage as any).url || defaultImage;
  }

  return (
    <div
      onClick={() => item.isAvailable && onClick(item)}
      className={`group bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden transition-all duration-200 h-[180px] sm:h-[200px] ${
        item.isAvailable
          ? 'hover:border-cerulean-blue-300 cursor-pointer active:scale-95'
          : 'opacity-65 cursor-not-allowed'
      }`}
    >
      <div className="h-[100px] sm:h-[110px] w-full relative overflow-hidden bg-gray-50 shrink-0">
        <img
          src={displayImg}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = defaultImage;
          }}
        />
        {!item.isAvailable && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-rose-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
              Hết món
            </span>
          </div>
        )}
      </div>

      <div className="p-2 sm:p-3 flex flex-col flex-1 justify-between">
        <div className="flex flex-col">
          <h3 className="text-xs text-gray-800 line-clamp-2 leading-tight" title={item.name}>
            {item.name}
          </h3>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[12px] font-bold text-gray-700">
            {item.price.toLocaleString()}đ
          </span>
          {item.isAvailable && (
            <button className="w-6 h-6 rounded-md bg-cerulean-blue-50 text-cerulean-blue-600 flex items-center justify-center group-hover:bg-cerulean-blue-500 group-hover:text-white transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function POS() {
  const { user } = useAuth();
  const { categories, fetchCategories, fetchAllItems, items } = useMenu();
  const { fetchTableById } = useTable();
  const { fetchOrderById, currentOrder } = useOrder();

  // 1. Đọc Params từ URL
  const [searchParams, setSearchParams] = useSearchParams();
  const tableIdFromUrl = searchParams.get('tableId');
  const orderIdFromUrl = searchParams.get('orderId');

  const [order, setOrder] = useState<IOrder | null>(currentOrder);
  const [orderItems, setOrderItems] = useState<IOrderItem[]>(order?.items || []);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedTable, setSelectedTable] = useState<ITable | null>(null);
  const [orderIdSelected, setOrderIdSelected] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // STATE: Quản lý ẩn/hiện giỏ hàng trên Mobile
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const navigate = useNavigate();

  // FETCH DATA BAN ĐẦU
  useEffect(() => {
    fetchCategories(extractId(user?.restaurant));
    fetchAllItems(extractId(user?.restaurant));

    if (tableIdFromUrl) {
      const getTableInfo = async () => {
        const tableData = await fetchTableById(tableIdFromUrl);
        if (tableData) {
          setSelectedTable(tableData);
        }
      };
      getTableInfo();
    } else {
      setSelectedTable(null);
    }

    if (orderIdFromUrl) {
      const getOrderDetail = async () => {
        await fetchOrderById(orderIdFromUrl);
      };
      getOrderDetail();
    }
  }, [tableIdFromUrl, orderIdFromUrl]);

  // LỌC DANH MỤC
  const filteredItems =
    items?.filter((item) => {
      if (activeCategory === 'all') return true;
      const itemCategoryId =
        typeof item.category === 'object' ? (item.category as any)._id : item.category;
      return itemCategoryId === activeCategory;
    }) || [];

  // ==========================================
  // LOGIC XỬ LÝ GIỎ HÀNG
  // ==========================================
  const handleAddItem = (selectedItem: IMenuItem) => {
    setOrderItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex((item) => {
        const itemId =
          typeof item.menuItem === 'object' ? (item.menuItem as any)._id : item.menuItem;
        return itemId === selectedItem._id;
      });

      if (existingItemIndex >= 0) {
        const updatedItems = [...prevItems];
        const currentItem = updatedItems[existingItemIndex];
        updatedItems[existingItemIndex] = {
          ...currentItem,
          quantity: currentItem.quantity + 1,
        };
        return updatedItems;
      } else {
        const newItem = {
          menuItem: selectedItem._id as string,
          nameSnapshot: selectedItem.name,
          priceSnapshot: selectedItem.price,
          quantity: 1,
        } as IOrderItem;

        return [...prevItems, newItem];
      }
    });
  };

  const handleUpdateQuantity = (id: string | number, delta: number) => {
    setOrderItems((prev) =>
      prev.map((item) => {
        const itemId =
          typeof item.menuItem === 'object' ? (item.menuItem as any)._id : item.menuItem;
        if (itemId === id) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      }),
    );
  };

  const handleRemoveItem = (id: string | number) => {
    setOrderItems((prev) =>
      prev.filter((item) => {
        const itemId =
          typeof item.menuItem === 'object' ? (item.menuItem as any)._id : item.menuItem;
        return itemId !== id;
      }),
    );
  };

  useEffect(() => {
    if (currentOrder && currentOrder.items && orderIdFromUrl) {
      setOrder(currentOrder);
      setOrderItems(currentOrder.items);
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

  return (
    // Đổi flex-row thành lg:flex-row để tự động tách cột trên màn hình lớn
    <div className="flex flex-col lg:flex-row flex-1 h-full bg-[#f8f9fc] overflow-hidden relative">
      {/* BÊN TRÁI: DANH SÁCH MÓN ĂN */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        orderId={orderIdSelected}
        onOpen={() => setIsPaymentModalOpen(true)}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setOrderIdSelected(null);
        }}
        onPaymentSucess={() => {
          navigate(-1);
        }}
      />
      {/* Thêm padding dưới cùng trên mobile để không bị Nút giỏ hàng đè lên (pb-24) */}
      <div className="flex-1 lg:flex-[1.5] p-4 lg:p-6 pb-24 lg:pb-6 overflow-y-auto w-full">
        <CustomTabs
          tabs={[
            { id: 'all', label: 'Tất Cả', count: items?.length || 0 },
            ...(categories?.map((cat) => ({
              id: cat._id,
              label: cat.name,
              count: cat?.foodCount || 0,
            })) || []),
          ]}
          activeTab={activeCategory}
          onTabChange={(id) => setActiveCategory(id)}
        />

        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3 lg:gap-4">
          {filteredItems.map((item) => (
            <ItemCard key={item._id} item={item} onClick={handleAddItem} />
          ))}

          {filteredItems.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-400 text-sm font-medium">
              Không có món ăn nào trong danh mục này.
            </div>
          )}
        </div>
      </div>

      {totalMobileQuantity > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-30">
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="w-full bg-cerulean-blue-600 text-white p-4 rounded-2xl shadow-xl flex justify-between items-center font-semibold transition-transform active:scale-95"
          >
            <div className="flex items-center gap-2">
              <div className="bg-white/20 px-3 py-1 rounded-full text-sm">
                {totalMobileQuantity} món
              </div>
              <span>Xem giỏ hàng</span>
            </div>
            <span className="text-lg font-bold">{totalMobilePrice.toLocaleString()}đ</span>
          </button>
        </div>
      )}

      {/* ========================================= */}
      {/* BÊN PHẢI: CHI TIẾT ĐƠN HÀNG (BILL) */}
      {/* ========================================= */}

      {/* Lớp phủ màn hình tối khi mở Drawer trên Mobile */}
      {isMobileCartOpen && (
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileCartOpen(false)}
        />
      )}

      {/* Container của FormBill - Trở thành Drawer trượt trên Mobile */}
      <div
        className={`
          fixed inset-y-0 right-0 w-[85vw] sm:w-[400px] z-50 bg-white shadow-2xl transition-transform duration-300 flex flex-col
          lg:static lg:flex-1 lg:h-full lg:w-auto lg:min-w-[320px] lg:max-w-[450px] lg:translate-x-0 lg:border-l lg:border-gray-100 lg:shadow-2xl
          ${isMobileCartOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Nút đóng Drawer (Chỉ hiện trên Mobile) */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <h2 className="font-bold text-gray-800 text-lg">Giỏ hàng</h2>
          <button
            onClick={() => setIsMobileCartOpen(false)}
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

        <div className="flex-1 overflow-hidden relative">
          <FormBillOrder
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
            pos={true}
            onTriggerPayment={async (orderId) => {
              const params = new URLSearchParams(searchParams);
              params.set('orderId', orderId as string);
              setSearchParams(params, { replace: true });

              setOrderIdSelected(orderId);
              setIsMobileCartOpen(false); // Đóng drawer trên mobile khi mở modal thanh toán

              const result = await fetchOrderById(orderId as string);
              if (result) {
                setOrder(result);
                setOrderItems(result.items || []);
              }
              setIsPaymentModalOpen(true);
            }}
          />
        </div>
      </div>
    </div>
  );
}
