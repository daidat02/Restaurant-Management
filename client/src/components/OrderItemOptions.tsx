interface OrderItemOptionsProps {
  toppings?: { name: string; price: number }[];
  note?: string;
  className?: string;
}

// Hiển thị các lựa chọn thêm (topping) và ghi chú của một món — dùng chung
// cho KDS, bill, hóa đơn in, chi tiết đơn và màn khách xem đơn.
export default function OrderItemOptions({
  toppings,
  note,
  className = '',
}: OrderItemOptionsProps) {
  if ((!toppings || toppings.length === 0) && !note) return null;

  return (
    <div className={`space-y-0.5 mt-0.5 ${className}`}>
      {(toppings || []).map((topping) => (
        <p key={topping.name} className="text-[9px] font-medium text-slate-400 truncate">
          + {topping.name}
        </p>
      ))}
      {note && (
        <p className="text-[9px] font-medium text-slate-400 truncate">
          Ghi chú: {note}
        </p>
      )}
    </div>
  );
}
