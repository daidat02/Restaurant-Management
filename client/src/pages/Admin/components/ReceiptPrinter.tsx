import { useRef, type ReactNode } from 'react';
import { useReactToPrint } from 'react-to-print';
import { extractId, formatVND } from '@/utils/helpers';
import { mergeOrderItems } from '@/utils/orderItems';
import { useAuth } from '@/hooks/use-auth';
import type { IOrder } from '@/types/order.type';

/* ============================================================
   ReceiptPrinter — xử lý IN HÓA ĐƠN dùng chung (80mm)
   - Tách khỏi FormPayment: render template in ẩn từ order,
     expose hàm print qua render-prop để nơi dùng tự bố trí nút.
   - Cách dùng:
       <ReceiptPrinter order={order}>
         {(handlePrint) => <button onClick={handlePrint}>In hóa đơn</button>}
       </ReceiptPrinter>
   ============================================================ */

interface ReceiptPrinterProps {
  order: IOrder | null;
  children: (handlePrint: () => void) => ReactNode;
}

export default function ReceiptPrinter({ order, children }: ReceiptPrinterProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Hoa_Don_${order?.orderId || order?._id || 'Moi'}`,
  });

  const items = (order?.items || []).filter((it) => it.status !== 'deleted');
  const mergedItems = mergeOrderItems(items);
  const subtotal = items.reduce((s, it) => s + (it.priceSnapshot || 0) * it.quantity, 0);
  const tableNumber =
    order?.table && typeof order.table === 'object' ? order.table?.tableNumber : null;
  const customerName =
    order?.deliveryInfo?.name ||
    (typeof order?.customer === 'object' ? order?.customer?.name : null) ||
    'Khách lẻ';

  return (
    <>
      {/* Component in ẩn: không hiển thị trên UI */}
      <div className="hidden">
        <div ref={receiptRef}>
          <div className="w-[80mm] p-4 bg-white text-black font-sans text-xs">
            <div className="text-center mb-3">
              <h2 className="text-sm font-extrabold uppercase">Phiếu Tạm Tính</h2>
            </div>

            <div className="border-t border-b border-dashed border-gray-400 py-2 my-2">
              <p>Mã HĐ: {order?.orderId || extractId(order?._id, '_id').slice(-6).toUpperCase()}</p>
              {tableNumber && <p>Bàn: {tableNumber}</p>}
              <p>Khách: {customerName}</p>
              <p>Thu ngân: {user?.name || 'Nhân viên'}</p>
              <p>Giờ in: {new Date().toLocaleString('vi-VN')}</p>
            </div>

            <table className="w-full text-xs my-2">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left pb-1 font-semibold">Tên Món</th>
                  <th className="text-center pb-1 font-semibold">SL</th>
                  <th className="text-right pb-1 font-semibold">T.Tiền</th>
                </tr>
              </thead>
              <tbody>
                {mergedItems.map((item, idx) => (
                  <tr key={item._id || idx}>
                    <td className="py-1 break-words pr-1">
                      <p>{item.nameSnapshot}</p>
                      {item.toppings && item.toppings.length > 0 && (
                        <p className="text-[10px] text-gray-500">
                          + {item.toppings.map((t) => t.name).join(', ')}
                        </p>
                      )}
                      {item.note && <p className="text-[10px] text-gray-500">({item.note})</p>}
                    </td>
                    <td className="text-center align-top py-1">{item.quantity}</td>
                    <td className="text-right align-top py-1">
                      {(item.quantity * item.priceSnapshot).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))}
                {mergedItems.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-2 text-center text-gray-400">
                      Chưa có món nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="border-t border-dashed border-gray-400 pt-2 flex justify-between font-bold text-sm">
              <span>TỔNG CỘNG:</span>
              <span>{formatVND(order?.totalAmount || subtotal)}</span>
            </div>

            <div className="text-center mt-3 text-[10px] italic text-gray-500">
              <p>Cảm ơn Quý Khách!</p>
              <p>Powered by NhàHàng OS</p>
            </div>
          </div>
        </div>
      </div>
      {children(handlePrint)}
    </>
  );
}
