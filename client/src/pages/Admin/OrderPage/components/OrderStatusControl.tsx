import { useState } from 'react';
import { GitBranch } from 'lucide-react';
import type { IOrder } from '@/types/order.type';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialogCustom } from '@/components/AlertDialog';

interface OrderStatusControlProps {
  order: IOrder;
  onStatusChange: (id: string, status: string) => void;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chế biến',
  serving: 'Đang phục vụ',
  served: 'Đã phục vụ',
  delivered: 'Đã giao',
  completed: 'Hoàn thành',
  paid: 'Đã thanh toán',
  cancelled: 'Đã hủy',
};

/**
 * Flow trạng thái theo loại đơn:
 * - Ăn tại bàn / mang về: có "Đã phục vụ", KHÔNG có "Đã giao".
 * - Giao hàng: ngược lại — kết thúc ở "Đã giao", không có bước phục vụ.
 */
const FLOW_BY_ORDER_TYPE: Record<string, string[]> = {
  'dine-in': ['pending', 'confirmed', 'preparing', 'serving', 'served', 'completed'],
  'to-go': ['pending', 'confirmed', 'preparing', 'serving', 'served', 'completed'],
  delivery: ['pending', 'confirmed', 'preparing', 'delivered', 'completed'],
};

const TERMINAL_LABEL: Record<string, string> = {
  paid: 'Đã thanh toán',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const TERMINAL_STATUSES = Object.keys(TERMINAL_LABEL);
/** Hủy đơn chỉ cho phép khi bếp chưa nhận — trước khi vào "Đang chế biến". */
const CANCELLABLE_STATUSES = ['pending', 'confirmed'];

export default function OrderStatusControl({ order, onStatusChange }: OrderStatusControlProps) {
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const current = order.status || 'pending';
  const isTerminal = TERMINAL_STATUSES.includes(current);
  const flow =
    FLOW_BY_ORDER_TYPE[order.orderType || 'dine-in'] ?? FLOW_BY_ORDER_TYPE['dine-in'];

  // Data lệch loại đơn (vd dine-in đang 'delivered') → vẫn thêm làm option để thấy thực trạng.
  const options = flow.includes(current) ? flow : [...flow, current];
  const canCancel = !isTerminal && CANCELLABLE_STATUSES.includes(current);
  /** "Hoàn thành" chỉ đạt sau khi khách đã trả tiền (luồng thanh toán tự chốt status). */
  const isPaid = order.paymentStatus === 'paid';
  const canComplete = isPaid;

  const handleChange = (status: string) => {
    if (!order._id) return;
    // Hủy là hành động khó đảo ngược → bắt xác nhận trước khi gọi API
    if (status === 'cancelled') {
      setConfirmCancelOpen(true);
      return;
    }
    onStatusChange(order._id, status);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <GitBranch className="h-5 w-5 text-cerulean-blue-600" />
        <h3 className="text-sm font-bold text-gray-900">Cập nhật trạng thái</h3>
        {isTerminal && (
          <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
            {TERMINAL_LABEL[current]}
          </span>
        )}
      </div>

      <div className="px-5 py-4">
        <Select value={current} onValueChange={handleChange} disabled={isTerminal}>
          <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white text-sm font-medium focus:ring-1 focus:ring-cerulean-blue-500">
            <SelectValue placeholder="Chọn trạng thái" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-100 shadow-lg">
            {options.map((status) => (
              <SelectItem
                key={status}
                value={status}
                disabled={
                  (status === 'cancelled' && !canCancel) || (status === 'completed' && !canComplete)
                }
                className="rounded-lg text-sm"
              >
                {STATUS_LABEL[status] ?? status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!isTerminal && !canCancel && (
          <p className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Đơn đã vào chế biến nên không thể hủy.
          </p>
        )}

        {!isTerminal && !isPaid && options.includes('completed') && (
          <p className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Cần thanh toán trước khi chuyển sang Hoàn thành.
          </p>
        )}

        {isTerminal && (
          <p className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Đơn hàng đã kết thúc, không thể thay đổi trạng thái.
          </p>
        )}
      </div>

      <AlertDialogCustom
        open={confirmCancelOpen}
        onOpenChange={setConfirmCancelOpen}
        variant="danger"
        title="Hủy đơn hàng này?"
        description="Đơn hàng sẽ chuyển sang trạng thái Đã hủy. Thao tác này không thể hoàn tác."
        confirmText="Hủy đơn"
        onConfirm={() => {
          if (order._id) onStatusChange(order._id, 'cancelled');
        }}
      />
    </div>
  );
}
