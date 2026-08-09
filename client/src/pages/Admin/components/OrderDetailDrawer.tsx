import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Ban,
  Check,
  ChefHat,
  CircleCheck,
  Clock,
  LayoutGrid,
  Minus,
  Plus,
  Printer,
  ReceiptText,
  ShoppingBasket,
  SquarePen,
  Trash2,
  Users,
  Utensils,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSetting } from '@/hooks/use-setting';
import { useActiveRestaurantId } from '@/hooks/use-active-restaurant';
import SideDrawer from '@/components/SideDrawer';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import ReceiptPrinter from './ReceiptPrinter';
import { extractId, getTimeAgo } from '@/utils/helpers';
import { mergeOrderItems } from '@/utils/orderItems';
import type { IOrder, IOrderItem } from '@/types/order.type';
import type { ITable } from '@/types/table.type';

/* ============================================================
   OrderDetailDrawer — component dùng chung cho Tables + Orders
   - Mở chi tiết đơn khi nhấn vào bàn/đơn.
   - Mobile: bottom sheet (vaul); Desktop: slide-over phải.
   - Header: mã đơn + badge status + 2 action Sửa đơn / Đổi bàn
     (chỉ hiện khi có bàn — dine-in; cả hai đều GIẢ LẬP local).
   - Footer: Thêm món (→ POS) / In hóa đơn (ReceiptPrinter) /
     Thanh toán (mở PaymentModal).
   ============================================================ */

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  pending: { label: 'Chờ xử lý', cls: 'bg-slate-100 text-slate-500', icon: Clock },
  confirmed: { label: 'Đã xác nhận', cls: 'bg-sky-50 text-sky-700', icon: Check },
  preparing: { label: 'Đang chế biến', cls: 'bg-violet-50 text-violet-700', icon: ChefHat },
  served: { label: 'Đã phục vụ', cls: 'bg-emerald-50 text-emerald-700', icon: Utensils },
  delivered: { label: 'Đã giao hàng', cls: 'bg-teal-50 text-teal-700', icon: Utensils },
  paid: { label: 'Đã thanh toán', cls: 'bg-emerald-50 text-emerald-700', icon: CircleCheck },
  cancelled: { label: 'Đã hủy', cls: 'bg-red-50 text-red-600', icon: Ban },
};

const TYPE_LABELS: Record<string, string> = {
  'dine-in': 'Tại quán',
  delivery: 'Giao hàng',
  'to-go': 'Mua về',
};

interface OrderDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  order: IOrder | null;
  tables?: ITable[];
  onAddMore: (order: IOrder) => void;
  onPayment: (orderId: string) => void;
}

interface DraftItem {
  key: string;
  name: string;
  price: number;
  quantity: number;
  note?: string;
  removed?: boolean;
}

export default function OrderDetailDrawer({
  open,
  onClose,
  order,
  tables = [],
  onAddMore,
  onPayment,
}: OrderDetailDrawerProps) {
  const isMobile = useIsMobile();
  const activeRestaurantId = useActiveRestaurantId();
  const { currentSetting, fetchSettingById } = useSetting();

  // Lấy cấu hình phí phục vụ + VAT từ setting nhà hàng (giống FormPayment)
  useEffect(() => {
    if (activeRestaurantId) fetchSettingById(activeRestaurantId);
  }, [activeRestaurantId, fetchSettingById]);

  // GIẢ LẬP: trạng thái sửa đơn (tăng/giảm/xóa món) — local only
  const [isEditing, setIsEditing] = useState(false);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState<DraftItem[]>([]);

  // GIẢ LẬP: đổi bàn (chọn bàn khác, chưa gọi API)
  const [isMovingTable, setIsMovingTable] = useState(false);
  const [draftTableId, setDraftTableId] = useState('');

  const startEditing = () => {
    if (!order) return;
    const snapshot = (order.items || []).map((it) => ({
      key: it._id || extractId(it.menuItem),
      name: it.nameSnapshot,
      price: it.priceSnapshot,
      quantity: it.quantity,
      note: it.note,
      removed: false,
    }));
    setSavedSnapshot(snapshot);
    setDraftItems(snapshot);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraftItems(savedSnapshot);
    setIsEditing(false);
  };

  // GIẢ LẬP: trả món = giảm qty; qty về 0 thì đánh dấu removed
  const updateQty = (key: string, delta: number) => {
    setDraftItems((prev) =>
      prev.map((it) => {
        if (it.key !== key) return it;
        const q = it.quantity + delta;
        if (q < 1) return { ...it, removed: true };
        return { ...it, quantity: q, removed: false };
      }),
    );
  };

  const removeItem = (key: string) => {
    setDraftItems((prev) => prev.map((it) => (it.key === key ? { ...it, removed: true } : it)));
  };

  const activeDraftItems = draftItems.filter((it) => !it.removed);

  const subtotal = useMemo(() => {
    if (isEditing) {
      return activeDraftItems.reduce((s, it) => s + it.price * it.quantity, 0);
    }
    return (order?.items || []).reduce((s, it) => s + it.priceSnapshot * it.quantity, 0);
  }, [isEditing, activeDraftItems, order]);

  // TRUNG TÂM TÍNH THUẾ PHÍ (chuẩn F&B — giống FormPayment)
  const vatRate = currentSetting?.receiptConfig?.vat || 0;
  const serviceFeeRate = currentSetting?.receiptConfig?.serviceFee || 0;
  // Phí phục vụ tính trên tiền gốc hàng hóa
  const serviceFeeAmount = (subtotal * serviceFeeRate) / 100;
  // VAT tính trên tiền gốc cộng thêm phí phục vụ
  const amountBeforeVat = subtotal + serviceFeeAmount;
  const vatAmount = (amountBeforeVat * vatRate) / 100;
  const total = amountBeforeVat + vatAmount;

  const hasFees = serviceFeeRate > 0 || vatRate > 0;

  const statusCfg = STATUS_CONFIG[order?.status || 'pending'] || STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;
  const typeLabel = TYPE_LABELS[order?.orderType || 'dine-in'] || 'Tại quán';
  const isDineIn = order?.orderType === 'dine-in';
  const tableNumber =
    order?.table && typeof order.table === 'object' ? order.table?.tableNumber : null;
  const customerName =
    order?.deliveryInfo?.name ||
    (typeof order?.customer === 'object' ? order?.customer?.name : null) ||
    'Khách lẻ';
  const customerInitial = customerName.slice(0, 1).toUpperCase();
  const hasCustomer = customerName !== 'Khách lẻ';
  // Gộp các món trùng menuItem thành 1 dòng hiển thị (status theo item mới nhất) —
  // backend tạo OrderItem mới mỗi lần gọi thêm món, nên cần gộp lại cho khớp nghiệp vụ
  const mergedItems = useMemo(() => mergeOrderItems(order?.items || []), [order?.items]);
  const itemsCount = mergedItems.length;
  const money = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}₫`;

  const renderItemRow = (it: DraftItem | IOrderItem, isDraft: boolean) => {
    const key = isDraft
      ? (it as DraftItem).key
      : (it as IOrderItem)._id || extractId((it as IOrderItem).menuItem);
    const name = isDraft ? (it as DraftItem).name : (it as IOrderItem).nameSnapshot;
    const price = isDraft ? (it as DraftItem).price : (it as IOrderItem).priceSnapshot;
    const qty = it.quantity;
    const note = it.note;
    const itemStatus = !isDraft ? (it as IOrderItem).status : undefined;
    const isDone = itemStatus === 'served';

    return (
      <li
        key={key}
        className={`flex items-start gap-3 py-3 ${isDraft && (it as DraftItem).removed ? 'pointer-events-none opacity-40' : ''}`}
      >
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cerulean-blue-50 text-xs font-bold text-cerulean-blue-700">
          {qty}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-black">
            {name}
          </p>
          {note && <p className="mt-0.5 text-[11px] text-amber-600">{note}</p>}
          {(it as IOrderItem).toppings && (it as IOrderItem).toppings!.length > 0 && (
            <p className="mt-0.5 text-[11px] text-cerulean-blue-600">
              + {(it as IOrderItem).toppings!.map((t) => t.name).join(', ')}
            </p>
          )}
          {isDraft ? (
            <div className="mt-1.5 flex items-center gap-1.5">
              <button
                onClick={() => updateQty(key, -1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                aria-label="Giảm số lượng"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-6 text-center text-sm font-bold text-gray-900">{qty}</span>
              <button
                onClick={() => updateQty(key, 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-cerulean-blue-50 text-cerulean-blue-700 transition hover:bg-cerulean-blue-100"
                aria-label="Tăng số lượng"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => removeItem(key)}
                className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                aria-label="Trả món / Xóa"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            !isDraft &&
            itemStatus && (
              <span
                className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  isDone ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {isDone ? 'Đã phục vụ' : 'Chờ bếp'}
              </span>
            )
          )}
        </div>
        <span
          className={`text-sm font-bold ${isDraft && (it as DraftItem).removed ? 'text-slate-300 line-through' : 'text-gray-900'}`}
        >
          {money(price * qty)}
        </span>
      </li>
    );
  };

  const content = (
    <div className="flex h-full flex-col bg-white">
      {/* ===== HEADER ===== */}
      <div className="relative shrink-0 border-b border-slate-100 p-5">
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cerulean-blue-50 text-cerulean-blue-600">
            <ReceiptText className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-extrabold tracking-tight text-gray-900">
                #{order?.orderId || extractId(order?._id, '_id').slice(-6).toUpperCase()}
              </p>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                {typeLabel}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusCfg.cls}`}>
                <StatusIcon className="mr-1 inline h-3 w-3" />
                {statusCfg.label}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {order?.createdAt ? getTimeAgo(order.createdAt) : '--'}
              </span>
              {isDineIn && (
                <span className="flex items-center gap-1">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  {tableNumber ? `Bàn ${tableNumber}` : 'Bàn --'}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {customerName}
              </span>
              {/* Action Sửa đơn / Đổi bàn — desktop: cùng hàng meta (hàng 2) */}
              {isDineIn && order && !isMobile && (
                <span className="ml-auto flex items-center gap-1.5">
                  <button
                    onClick={isEditing ? cancelEditing : startEditing}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                      isEditing
                        ? 'bg-cerulean-blue-50 text-cerulean-blue-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <SquarePen className="h-3.5 w-3.5" />
                    {isEditing ? 'Hủy sửa' : 'Sửa đơn'}
                  </button>
                  <button
                    onClick={() => setIsMovingTable(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-200"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    Đổi bàn
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Sửa đơn / Đổi bàn — mobile: hàng riêng (hàng 3) */}
        {isDineIn && order && isMobile && (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={isEditing ? cancelEditing : startEditing}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                isEditing
                  ? 'bg-cerulean-blue-50 text-cerulean-blue-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <SquarePen className="h-3.5 w-3.5" />
              {isEditing ? 'Hủy sửa' : 'Sửa đơn'}
            </button>
            <button
              onClick={() => setIsMovingTable(true)}
              className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-200"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Đổi bàn
            </button>
          </div>
        )}
      </div>

      {/* ===== BODY ===== */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* Đổi bàn GIẢ LẬP */}
        {isMovingTable && (
          <div className="mb-4 rounded-2xl border border-cerulean-blue-200 bg-cerulean-blue-50/50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-cerulean-blue-700">
                Đổi bàn
              </p>
              <button
                onClick={() => setIsMovingTable(false)}
                className="rounded-md p-1 text-slate-400 transition hover:text-slate-600"
                aria-label="Đóng đổi bàn"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {tables
                .filter((t) => extractId(t) !== extractId(order?.table))
                .map((t) => {
                  const isSelected = draftTableId === extractId(t);
                  return (
                    <button
                      key={t._id}
                      onClick={() => setDraftTableId(extractId(t))}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition ${
                        isSelected
                          ? 'border-cerulean-blue-500 bg-white shadow-sm'
                          : 'border-slate-200 bg-white hover:border-cerulean-blue-200'
                      }`}
                    >
                      <span
                        className={`text-[11px] font-bold ${t.status === 'available' ? 'text-emerald-600' : 'text-slate-400'}`}
                      >
                        {t.tableNumber}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {t.status === 'available'
                          ? 'Trống'
                          : t.status === 'occupied'
                            ? 'Có khách'
                            : 'Đặt'}
                      </span>
                    </button>
                  );
                })}
              {tables.length === 0 && (
                <p className="col-span-4 text-center text-xs text-slate-400">
                  Không có bàn nào để chọn
                </p>
              )}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setIsMovingTable(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={() => setIsMovingTable(false)}
                disabled={!draftTableId}
                className="flex items-center gap-1 rounded-lg bg-cerulean-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cerulean-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                Xác nhận chuyển
              </button>
            </div>
            <p className="mt-2 text-[10px] text-slate-400">* Giả lập — chờ API đổi bàn</p>
          </div>
        )}

        {/* Khách hàng */}
        {hasCustomer && !isEditing && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-bold text-cerulean-blue-600 ring-1 ring-slate-200">
              {customerInitial}
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900">{customerName}</p>
              <p className="text-xs text-slate-400">Khách hàng</p>
            </div>
          </div>
        )}

        {/* Món đã gọi */}
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {isEditing ? 'Sửa đơn · giả lập' : 'Món đã gọi'}
          </h3>
          <span className="text-xs font-medium text-slate-400">
            {(isEditing ? activeDraftItems.length : itemsCount)} món
          </span>
        </div>
        <ul className="divide-y divide-slate-100">
          {isEditing
            ? activeDraftItems.map((it) => renderItemRow(it, true))
            : mergedItems.map((it) => renderItemRow(it, false))}
          {(isEditing ? activeDraftItems : mergedItems).length === 0 && (
            <li className="py-8 text-center text-slate-300">
              <ShoppingBasket className="mx-auto h-8 w-8" />
              <p className="mt-1 text-xs">Chưa có món nào</p>
            </li>
          )}
        </ul>

        {/* Ghi chú */}
        {order?.notes && !isEditing && (
          <div className="mt-4 rounded-xl bg-amber-50/70 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Ghi chú</p>
            <p className="mt-0.5 text-sm text-amber-800">{order.notes}</p>
          </div>
        )}

        {/* Tính tiền */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Tạm tính</span>
              <span className="font-semibold text-gray-900">{money(subtotal)}</span>
            </div>
            {serviceFeeRate > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Phí phục vụ ({serviceFeeRate}%)</span>
                <span className="font-semibold text-gray-900">+{money(serviceFeeAmount)}</span>
              </div>
            )}
            {vatRate > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">VAT ({vatRate}%)</span>
                <span className="font-semibold text-gray-900">+{money(vatAmount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-slate-200 pt-2">
              <span className="text-sm font-bold text-gray-900">Tổng cộng</span>
              <span className="text-xl font-extrabold text-cerulean-blue-700">{money(total)}</span>
            </div>
          </div>
          {hasFees && (
            <p className="mt-2 text-[10px] text-slate-400">
              Đã gồm phí phục vụ {serviceFeeRate}% và VAT {vatRate}%
            </p>
          )}
        </div>
      </div>

      {/* ===== FOOTER ===== */}
      <div className="shrink-0 border-t border-slate-100 p-4">
        {isEditing ? (
          <div className="flex gap-2">
            <button
              onClick={cancelEditing}
              className="h-11 flex-1 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              onClick={() => setIsEditing(false)}
              disabled={activeDraftItems.length === 0}
              className="h-11 flex-1 rounded-xl bg-cerulean-blue-600 text-sm font-bold text-white shadow-lg shadow-cerulean-blue-200 transition hover:bg-cerulean-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Lưu thay đổi
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => order && onAddMore(order)}
                disabled={!order}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 transition hover:border-cerulean-blue-200 hover:text-cerulean-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UtensilsCrossed className="h-4 w-4" />
                Thêm món
              </button>
              <ReceiptPrinter order={order}>
                {(handlePrint) => (
                  <button
                    onClick={handlePrint}
                    disabled={!order}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 transition hover:border-cerulean-blue-200 hover:text-cerulean-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Printer className="h-4 w-4" />
                    In hóa đơn
                  </button>
                )}
              </ReceiptPrinter>
            </div>
            <button
              onClick={() => order?._id && onPayment(order._id)}
              disabled={!order || order.status === 'paid' || order.status === 'cancelled'}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cerulean-blue-600 text-sm font-bold text-white shadow-lg shadow-cerulean-blue-200 transition hover:bg-cerulean-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CircleCheck className="h-5 w-5" />
              Thanh toán · {money(total)}
            </button>
          </>
        )}
      </div>
    </div>
  );

  if (!open || !order) return null;

  // Mobile: full screen (vaul)
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => (o ? null : onClose())}>
        <DrawerContent className="mx-auto h-[100dvh] w-full max-h-[100dvh]! rounded-none!">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Chi tiết đơn hàng</DrawerTitle>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: slide-over phải (nửa màn hình — override max-w-sm & w-3/4 mặc định của Sheet)
  return (
    <SideDrawer isOpen={open} onClose={onClose} title="Chi tiết đơn hàng" isHeaderless className="sm:!w-full sm:!max-w-xl">
      {content}
    </SideDrawer>
  );
}
