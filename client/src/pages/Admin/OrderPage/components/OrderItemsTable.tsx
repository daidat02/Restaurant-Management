import { StatusTag } from '@/components/StatusTag';
import { DataTable, type ColumnDef } from '@/components/TableData';
import type { IOrderItem } from '@/types/order.type';
import { calcItemTotal, formatPrice } from './orderDetailHelpers';
import { mergeOrderItems } from '@/utils/orderItems';

const itemColumns: ColumnDef<IOrderItem>[] = [
  {
    header: 'TÊN MÓN',
    render: (item: IOrderItem) => (
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-800">{item.nameSnapshot}</span>
      </div>
    ),
  },
  {
    header: 'SL',
    render: (item: IOrderItem) => <span className="font-medium text-gray-900">{item.quantity}</span>,
  },
  {
    header: 'ĐƠN GIÁ',
    render: (item: IOrderItem) => (
      <span className="text-gray-600 text-sm">{formatPrice(item.priceSnapshot)}</span>
    ),
  },
  {
    header: 'TỔNG',
    render: (item: IOrderItem) => (
      <span className="font-semibold text-gray-900">{formatPrice(calcItemTotal(item))}</span>
    ),
  },
  {
    header: 'TRẠNG THÁI',
    className: 'text-right',
    render: (item: IOrderItem) => <StatusTag status={item?.status || 'pending'} />,
  },
];

interface OrderItemsTableProps {
  items: IOrderItem[];
  isLoading?: boolean;
}

export default function OrderItemsTable({ items, isLoading }: OrderItemsTableProps) {
  // Gộp các món trùng menuItem thành 1 dòng (tổng SL), status theo item mới nhất
  const merged = mergeOrderItems(items);
  return (
    <DataTable
      columns={itemColumns}
      data={merged}
      getRowKey={(item) => item._id as string}
      isLoading={isLoading}
    />
  );
}
