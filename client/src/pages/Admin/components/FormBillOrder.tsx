import type { ITable } from '@/types/table.type';
import { SquarePen, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useOrder } from '@/hooks/use-order';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import type { IOrder, IOrderItem } from '@/types/order.type';
import { extractId } from '@/utils/helpers';

const OrderHeader = ({
  tableNumber,
  orderId,
}: {
  tableNumber?: number | null;
  orderId?: string | null;
}) => {
  return (
    <div className="flex flex-col gap-0 px-6 py-4 border-b border-gray-100 shrink-0 bg-white">
      <button className="w-full h-7 rounded-sm bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white font-semibold text-[12px] flex items-center justify-between px-5 shadow-md shadow-purple-100 transition-all">
        {tableNumber && <span>Bàn số {tableNumber || '...'}</span>}
        {orderId && <span>#{orderId}</span>}
        {!tableNumber && !orderId && <span className="text-center w-full">Đơn Hàng Mang Về</span>}
      </button>
    </div>
  );
};

interface OrderItemComponentProps {
  item: IOrderItem;
  onIncrease: (id: string | number) => void;
  onDecrease: (id: string | number) => void;
  onRemove: (id: string | number) => void;
  isPos?: boolean;
}

const OrderItem = ({ item, onIncrease, onDecrease, onRemove, isPos }: OrderItemComponentProps) => {
  const id = extractId(item.menuItem); // Sửa lại dùng extractId cho an toàn
  const name = item.nameSnapshot;
  const price = item.priceSnapshot;
  const quantity = item.quantity;

  const totalAmount = price * quantity;

  return (
    <div className="flex items-center gap-2 py-2 border-b border-gray-50 border-dashed group">
      <div className="flex-[2.5] flex flex-col">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-800 line-clamp-1">{name}</span>
          {isPos && (
            <button className="text-gray-300 hover:text-cerulean-blue-600 group-hover:opacity-100 transition-opacity">
              <SquarePen size={12} />
            </button>
          )}
        </div>
        <span className="text-[10px] font-bold mt-0.5">
          Thành tiền: {totalAmount.toLocaleString()}đ
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center overflow-hidden">
          {isPos ? (
            <>
              <button
                className="w-5 h-5 flex items-center rounded-sm m-1 hover:bg-cerulean-blue-200 justify-center text-[10px]"
                onClick={() => onDecrease(id)}
              >
                -
              </button>
              <span className="w-5 h-5 flex items-center justify-center bg-cerulean-blue-500 rounded-md text-white text-[10px]">
                {quantity}
              </span>
              <button
                className="w-5 h-5 flex items-center rounded-sm m-1 hover:bg-cerulean-blue-200 justify-center text-[10px]"
                onClick={() => onIncrease(id)}
              >
                +
              </button>
            </>
          ) : (
            <span className="text-[12px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
              x{quantity}
            </span>
          )}
        </div>
      </div>

      <div className="flex-[1.2] flex items-center justify-end gap-2">
        <span className="text-[10px] text-gray-800">{price.toLocaleString()}đ</span>
        <div className="flex items-center gap-1.5">
          {isPos && (
            <button
              onClick={() => onRemove(id)}
              className="text-gray-300 hover:text-red-500 transition-opacity"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const OrderSummary = ({
  subTotal,
  notes,
  setNotes,
  onCancel,
  onPayment,
  onSave,
  isPOS,
  onAddItem,
}: {
  subTotal: number;
  discount: number;
  totalPayment: number;
  notes: string;
  setNotes: (v: string) => void;
  onCancel?: () => void;
  onPayment?: () => void;
  onSave?: () => void;
  isPOS?: boolean;
  onAddItem?: () => void;
}) => {
  return (
    <div className="bg-[#f4f6fa] p-6 flex flex-col gap-3 shrink-0 border-t border-gray-100">
      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Thêm ghi chú cho bếp (Tùy chọn)..."
        className="w-full bg-transparent border-b border-gray-200 pb-2 text-[10px] outline-none text-gray-600 placeholder:text-gray-400 mb-2 focus:border-cerulean-blue-400 transition-colors"
      />
      <div className="space-y-2">
        <div className="flex justify-between items-center text-[10px] text-gray-500">
          <span>Tạm tính</span>
          <span className="text-gray-800">{subTotal.toLocaleString()}đ</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-4">
        <button
          onClick={onCancel}
          className="h-9 bg-white border border-gray-200 rounded-xl text-gray-700 font-bold text-[10px] shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
        >
          Hủy
        </button>

        {isPOS ? (
          <button
            onClick={onSave}
            className="h-9 bg-white border border-gray-200 rounded-xl text-gray-700 font-bold text-[10px] shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
          >
            Lưu
          </button>
        ) : (
          <button
            onClick={onAddItem}
            className="h-9 bg-white border border-gray-200 rounded-xl text-gray-700 font-bold text-[10px] shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
          >
            Thêm Món
          </button>
        )}

        <button
          onClick={onPayment}
          className="h-9 col-span-2 bg-cerulean-blue-500 border border-cerulean-blue-600 rounded-xl text-white font-bold text-[10px] shadow-sm hover:bg-cerulean-blue-600 active:scale-95 transition-all"
        >
          Thanh toán
        </button>
      </div>
    </div>
  );
};

interface FormBillOrderProps {
  order?: IOrder;
  orderItems: IOrderItem[];
  tableInfo?: ITable;
  restaurantId?: string;
  onUpdateQuantity?: (id: string | number, delta: number) => void;
  onRemoveItem?: (id: string | number) => void;
  onClearOrder: () => void;
  onTriggerPayment?: (orderId: string | null) => void;
  pos?: boolean;
}

const FormBillOrder = ({
  order,
  orderItems,
  tableInfo,
  onUpdateQuantity,
  onRemoveItem,
  onClearOrder,
  onTriggerPayment,
  pos,
}: FormBillOrderProps) => {
  // 1. Thêm hàm updateOrder vào đây
  const { addOrder, addItemToOrder } = useOrder();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notes, setNotes] = useState<string>('');
  const subTotal = orderItems.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0);
  const discount = 0;
  const totalPayment = Math.max(0, subTotal - discount);
  const totalItemsCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleRedirectToPOS = () => {
    let url = '/manager/orders/pos';
    const queryParams = new URLSearchParams();

    const actualOrderId = extractId(order, '_id') || extractId(tableInfo?.currentOrder, '_id');

    if (actualOrderId) {
      queryParams.append('orderId', actualOrderId);
    } else if (tableInfo && tableInfo._id) {
      queryParams.append('tableId', tableInfo._id as string);
    }

    const queryString = queryParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    navigate(url);
  };

  const handleAddOrder = async (isPaid: boolean = false) => {
    if (orderItems.length === 0) {
      toast.error('Vui lòng thêm ít nhất 1 món để lưu đơn!', { position: 'top-right' });
      return;
    }

    const resId = extractId(user?.restaurant);
    let existingOrderId = extractId(order, '_id') || extractId(tableInfo?.currentOrder, '_id');

    try {
      if (existingOrderId) {
        // 1. ĐÃ CÓ ĐƠN HÀNG
        const newItemsOnly = orderItems
          .filter((item: any) => !item._id)
          .map((item) => ({
            menuItem: extractId(item.menuItem),
            quantity: item.quantity,
            priceSnapshot: item.priceSnapshot,
            nameSnapshot: item.nameSnapshot,
          }));

        if (newItemsOnly.length > 0) {
          // Thêm món mới vào đơn cũ
          await addItemToOrder({ orderId: existingOrderId, items: newItemsOnly });
        } else if (!isPaid) {
          toast.info('Không có món mới nào để thêm vào bill.');
          if (pos) navigate(-1);
          return;
        }
      } else {
        // 2. CHƯA CÓ ĐƠN HÀNG -> TẠO MỚI
        const formattedItems = orderItems.map((item) => ({
          menuItem: extractId(item.menuItem),
          quantity: item.quantity,
          priceSnapshot: item.priceSnapshot,
          nameSnapshot: item.nameSnapshot,
        }));

        const createPayload: any = {
          restaurant: resId,
          table: extractId(tableInfo) || undefined,
          orderType: tableInfo ? 'dine-in' : 'to-go',
          status: 'pending',
          paymentStatus: isPaid ? 'waiting_paid' : 'unpaid',
          totalAmount: totalPayment,
          itemsCount: totalItemsCount,
          notes: notes,
          items: formattedItems,
          staff: user?._id,
        };

        const result = await addOrder(createPayload);
        existingOrderId = extractId(result, '_id');
      }

      // 3. XỬ LÝ KẾT QUẢ
      if (isPaid && existingOrderId) {
        if (onTriggerPayment) {
          onTriggerPayment(existingOrderId);
        }
      } else {
        // NẾU CHỈ LƯU ĐƠN
        toast.success(existingOrderId ? 'Thêm món thành công!' : 'Đã lưu đơn cho bếp!');
        setNotes('');
        onClearOrder?.();
        if (pos) navigate(-1);
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi xử lý đơn hàng!');
      console.error(error);
    }
  };
  return (
    <div className="flex flex-col w-full h-full bg-white border-l border-gray-100 shadow-2xl relative z-10 min-w-[320px]">
      {/* Sửa lại cách lấy orderId hiển thị trên Header cho an toàn */}
      <OrderHeader
        tableNumber={tableInfo?.tableNumber ?? null}
        orderId={order?.orderId || extractId(tableInfo?.currentOrder, 'orderId')}
      />

      <div className="flex-1 overflow-y-auto px-6 flex flex-col [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-track]:bg-transparent">
        <div className="flex items-center text-[10px] gap-2 text-gray-400 uppercase tracking-wider pb-3 border-b border-gray-100 sticky top-0 bg-white z-10 pt-2">
          <span className="flex-[2.5]">MÓN</span>
          <span className="flex-1 text-center">SL</span>
          <span className="flex-[1.2] text-right">GIÁ</span>
        </div>

        <div className="flex flex-col">
          {orderItems.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-xs italic">Chưa có món nào</div>
          ) : (
            orderItems.map((item) => {
              const itemId = extractId(item.menuItem);

              return (
                <OrderItem
                  key={itemId}
                  item={item}
                  onIncrease={() => onUpdateQuantity?.(itemId, 1)}
                  onDecrease={() => onUpdateQuantity?.(itemId, -1)}
                  onRemove={() => onRemoveItem?.(itemId)}
                  isPos={pos}
                />
              );
            })
          )}
        </div>
      </div>

      <OrderSummary
        subTotal={subTotal}
        discount={discount}
        totalPayment={totalPayment}
        notes={notes}
        setNotes={setNotes}
        onCancel={() => {
          onClearOrder?.();
          setNotes('');
          if (pos) navigate(-1); // Hủy ở màn POS cũng quay lại trang trước
        }}
        onSave={() => handleAddOrder(false)}
        onPayment={() => handleAddOrder(true)}
        isPOS={pos}
        onAddItem={handleRedirectToPOS}
      />
    </div>
  );
};

export default FormBillOrder;
