import type { ITable } from '@/types/table.type';
import { ChefHat, Minus, Plus, ShoppingBasket, Trash2, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useOrder } from '@/hooks/use-order';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useActiveRestaurantId } from '@/hooks/use-active-restaurant';
import { useNavigate } from 'react-router-dom';
import type { IOrder, IOrderItem } from '@/types/order.type';
import { extractId } from '@/utils/helpers';

// ==========================================
// TIỆN ÍCH HIỂN THỊ
// ==========================================
const fmt = (n: number) => `${n.toLocaleString('vi-VN')}đ`;

const TINTS = [
  'bg-rose-100 text-rose-600',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-orange-100 text-orange-700',
  'bg-lime-100 text-lime-700',
  'bg-pink-100 text-pink-700',
];
const tintFor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
};

// ==========================================
// HEADER GIỎ HÀNG: hiển thị thông tin đơn/bàn
// ==========================================
const PosBillHeader = ({
  tableNumber,
  orderId,
  onClear,
  itemCount,
}: {
  tableNumber?: number | null;
  orderId?: string | null;
  onClear: () => void;
  itemCount?: number;
}) => {
  // Quy tắc hiển thị:
  // - Có orderId + tableId -> hiện cả 2
  // - Chỉ có orderId -> hiện mã đơn
  // - Chỉ có tableId -> hiện bàn (đơn mới tại bàn)
  // - Không có gì -> "Đơn Hàng Mang Về"
  const showOrder = Boolean(orderId);
  const showTable = Boolean(tableNumber);

  return (
    <div className="border-b border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-gray-900">Đơn tại bàn</h2>
        <button
          onClick={onClear}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Xoá
        </button>
      </div>

      {/* Badge thông tin đơn/bàn + số món (số món chỉ hiện trên mobile, nằm cùng hàng với bàn/mã đơn) */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {showTable && (
          <span className="rounded-xl bg-cerulean-blue-50 px-3 py-1.5 text-xs font-bold text-cerulean-blue-700">
            Bàn số {tableNumber}
          </span>
        )}
        {showOrder && (
          <span className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500">
            #{orderId}
          </span>
        )}
        {!showTable && !showOrder && (
          <span className="flex-1 rounded-xl bg-slate-50 px-3 py-1.5 text-center text-xs font-bold text-slate-500">
            Đơn Hàng Mang Về
          </span>
        )}
        {typeof itemCount === 'number' && itemCount > 0 && (
          <span className="rounded-xl bg-cerulean-blue-50 px-3 py-1.5 text-xs font-bold text-cerulean-blue-700 lg:hidden">
            {itemCount} món
          </span>
        )}
      </div>
    </div>
  );
};

// ==========================================
// HÀNG MÓN TRONG GIỎ
// ==========================================
interface PosBillItemProps {
  item: IOrderItem;
  onIncrease: (id: string | number) => void;
  onDecrease: (id: string | number) => void;
  onRemove: (id: string | number) => void;
}

const PosBillItem = ({ item, onIncrease, onDecrease, onRemove }: PosBillItemProps) => {
  const id = extractId(item.menuItem);
  const { nameSnapshot, priceSnapshot, quantity, note } = item;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${tintFor(nameSnapshot || '?')}`}
      >
        {(nameSnapshot || '?').charAt(0).toUpperCase()}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-gray-900">{nameSnapshot}</p>
        {item.toppings && item.toppings.length > 0 && (
          <p className="text-[11px] text-cerulean-blue-600 truncate">
            + {item.toppings.map((t) => t.name).join(', ')}
          </p>
        )}
        <p className="text-[11px] text-slate-400">
          {fmt(priceSnapshot)}
          {note ? <span className="text-amber-600"> · {note}</span> : null}
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onDecrease(id)}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-90"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-7 text-center text-sm font-bold text-gray-900">{quantity}</span>
        <button
          onClick={() => onIncrease(id)}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-cerulean-blue-50 text-cerulean-blue-700 transition hover:bg-cerulean-blue-100 active:scale-90"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          onClick={() => onRemove(id)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// ==========================================
// TỔNG KẾT + HÀNH ĐỘNG
// ==========================================
const PosBillSummary = ({
  subTotal,
  notes,
  setNotes,
  onSendKitchen,
  onPayment,
}: {
  subTotal: number;
  notes: string;
  setNotes: (v: string) => void;
  onSendKitchen: () => void;
  onPayment: () => void;
}) => {
  const discount = 0;
  const total = Math.max(0, subTotal - discount);

  return (
    <div className="border-t border-slate-200 bg-white p-4">
      {/* Ghi chú cho bếp */}
      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Ghi chú cho bếp (ít cay, không hành...)"
        className="mb-3 h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm outline-none transition focus:border-cerulean-blue-500 focus:bg-white focus:ring-2 focus:ring-cerulean-blue-100"
      />

      {/* Tổng tiền */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">Tạm tính</span>
        <span className="font-semibold text-gray-900">{fmt(subTotal)}</span>
      </div>
      <div className="mt-1 flex items-center justify-between text-sm">
        <span className="text-slate-500">Giảm giá</span>
        <span className="font-semibold text-emerald-600">{discount > 0 ? `-${fmt(discount)}` : '-0đ'}</span>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-dashed border-slate-200 pt-2">
        <span className="text-sm font-bold text-gray-900">Tổng cộng</span>
        <span className="text-2xl font-extrabold text-cerulean-blue-700">{fmt(total)}</span>
      </div>

      {/* Hành động */}
      <button
        onClick={onSendKitchen}
        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 transition hover:border-cerulean-blue-300 hover:text-cerulean-blue-700 active:scale-[0.98]"
      >
        <ChefHat className="h-5 w-5" />
        Gửi bếp
      </button>
      <button
        onClick={onPayment}
        className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cerulean-blue-600 text-sm font-bold text-white shadow-lg shadow-cerulean-blue-200 transition hover:bg-cerulean-blue-700 active:scale-[0.98]"
      >
        <Wallet className="h-5 w-5" />
        Thanh toán
      </button>
    </div>
  );
};

// ==========================================
// COMPONENT CHÍNH
// ==========================================
interface PosBillProps {
  order?: IOrder;
  orderItems: IOrderItem[];
  tableInfo?: ITable;
  onUpdateQuantity?: (id: string | number, delta: number) => void;
  onRemoveItem?: (id: string | number) => void;
  onClearOrder: () => void;
  onTriggerPayment?: (orderId: string | null) => void;
}

const PosBill = ({
  order,
  orderItems,
  tableInfo,
  onUpdateQuantity,
  onRemoveItem,
  onClearOrder,
  onTriggerPayment,
}: PosBillProps) => {
  const { addOrder, addItemToOrder } = useOrder();
  const { user } = useAuth();
  const activeRestaurantId = useActiveRestaurantId();
  const navigate = useNavigate();

  const [notes, setNotes] = useState<string>('');
  const subTotal = orderItems.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0);
  const totalItemsCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleSaveOrder = async (isPaid: boolean = false) => {
    if (orderItems.length === 0) {
      toast.error('Vui lòng thêm ít nhất 1 món để lưu đơn!', { position: 'top-right' });
      return;
    }

    const resId = activeRestaurantId;
    let existingOrderId = extractId(order, '_id') || extractId(tableInfo?.currentOrder, '_id');

    try {
      if (existingOrderId) {
        // 1. ĐÃ CÓ ĐƠN HÀNG
        // Chỉ gửi món MỚI (không kèm _id): server luôn tạo OrderItem mới,
        // không cập nhật quantity item cũ — bếp nhận đúng từng món mới gọi.
        const itemsToSend = orderItems.map((item) => ({
          menuItem: extractId(item.menuItem),
          quantity: item.quantity,
          priceSnapshot: item.priceSnapshot,
          nameSnapshot: item.nameSnapshot,
        }));

        await addItemToOrder({ orderId: existingOrderId, items: itemsToSend });
      } else {
        // 2. CHƯA CÓ ĐƠN HÀNG -> TẠO MỚI
        const formattedItems = orderItems.map((item) => ({
          menuItem: extractId(item.menuItem),
          quantity: item.quantity,
          priceSnapshot: item.priceSnapshot,
          nameSnapshot: item.nameSnapshot,
        }));

        const createPayload = {
          restaurant: resId,
          table: (extractId(tableInfo) || undefined) as ITable | undefined,
          orderType: tableInfo ? 'dine-in' : 'to-go',
          status: 'pending',
          paymentStatus: isPaid ? 'waiting_paid' : 'unpaid',
          totalAmount: subTotal,
          itemsCount: totalItemsCount,
          notes: notes,
          items: formattedItems,
          staff: user?._id,
        } satisfies Partial<IOrder>;

        const result = await addOrder(createPayload);
        existingOrderId = extractId(result, '_id');
      }

      // 3. XỬ LÝ KẾT QUẢ
      if (isPaid && existingOrderId) {
        if (onTriggerPayment) {
          onTriggerPayment(existingOrderId);
        }
      } else {
        toast.success(existingOrderId ? 'Thêm món thành công!' : 'Đã gửi đơn cho bếp!', {
          position: 'top-right',
        });
        setNotes('');
        onClearOrder?.();
        const home = user?.role === 'staff' ? '/staff/orders' : '/manager/tables';
        navigate(home); // Về trang quản lý theo role (không dùng back vì staff vào POS qua redirect dễ kẹt loop)
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi xử lý đơn hàng!');
      console.error(error);
    }
  };

  const tableNumber = tableInfo?.tableNumber;
  const orderId = order?.orderId || extractId(tableInfo?.currentOrder, 'orderId') || undefined;

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <PosBillHeader tableNumber={tableNumber} orderId={orderId} onClear={onClearOrder} itemCount={totalItemsCount} />

      {/* Danh sách món */}
      <div className="flex-1 overflow-y-auto p-4">
        {orderItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-slate-300">
            <ShoppingBasket className="h-10 w-10" />
            <p className="mt-2 text-sm font-medium">Chưa có món nào</p>
            <p className="text-xs">Bấm vào món để thêm vào đơn</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {orderItems.map((item) => {
              const itemId = extractId(item.menuItem);
              return (
                <PosBillItem
                  key={itemId}
                  item={item}
                  onIncrease={() => onUpdateQuantity?.(itemId, 1)}
                  onDecrease={() => onUpdateQuantity?.(itemId, -1)}
                  onRemove={() => onRemoveItem?.(itemId)}
                />
              );
            })}
          </div>
        )}
      </div>

      <PosBillSummary
        subTotal={subTotal}
        notes={notes}
        setNotes={setNotes}
        onSendKitchen={() => handleSaveOrder(false)}
        onPayment={() => handleSaveOrder(true)}
      />
    </div>
  );
};

export default PosBill;
