import { useAuth } from "@/hooks/use-auth";
import type { IOrder } from "@/types/order.type";
import { getTimeAgo } from "@/utils/helpers";
import { Printer, SquarePen } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface OrderCardProps {
  order: IOrder;
  isSelected: boolean;
  onClick?: () => void;
  onOpenPayment?: (orderId: string| null) => void; 
  isPayment?: boolean; // Thêm prop để xác
}

export const OrderCard = ({ order, isSelected, onClick,onOpenPayment, isPayment = true }: OrderCardProps) => {
  const { user } = useAuth();
  const currentRole = user?.role || 'staff';
  const navigate = useNavigate()
  // Cấu hình màu sắc theo trạng thái Đơn Hàng
  const orderStyleConfig = {
    'pending': { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', label: 'Chờ xử lý' },
    'confirmed': { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200', label: 'Đã xác nhận' },
    'preparing': { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', label: 'Đang chế biến' },
    'served': { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', label: 'Đã lên món' },
    'delivered': { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', label: 'Đã giao hàng' },
    'paid': { bg: 'bg-cerulean-blue-50', text: 'text-cerulean-blue-600', border: 'border-cerulean-blue-200', label: 'Đã thanh toán' },
    'cancelled': { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', label: 'Đã hủy' }
  };

  const typeLabels = {
    'dine-in': 'Tại quán',
    'delivery': 'Giao hàng',
    'to-go': 'Mua về'
  };

  const currentStyle = orderStyleConfig[order?.status as "pending" | "confirmed" | "preparing" | "served" | "delivered" | "paid" | "cancelled"] || orderStyleConfig['pending'];
  const customerName = order.deliveryInfo?.name || (typeof order?.customer === 'object' ? order?.customer?.name : null) || "Khách lẻ";
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-sm flex flex-col hover:shadow-md transition-all cursor-pointer min-h-[140px] ${
        isSelected ? 'ring-2 ring-cerulean-blue-500 border-transparent' : 'border border-gray-200'
      }`}
    >
      <div className='p-4 flex flex-col flex-1 gap-3'>
        {/* Hàng 1: Mã Đơn & Loại đơn */}
        <div className='flex justify-between items-start'>
          <div className='flex flex-col'>
            <span className='text-cerulean-blue-600 text-xs'>#{order.orderId}</span>
            <span className='text-[10px] font-bold text-gray-400 uppercase mt-0.5'>{typeLabels[order.orderType as "dine-in" | "delivery" | "to-go" ]}</span>
          </div>
          {/* Thông tin Bàn (Chỉ hiện nếu ăn tại quán) */}
          {order.orderType === 'dine-in' && order.table && (
            <span className='bg-gray-100 text-gray-600 font-bold px-2 py-1 rounded text-xs'>
              Bàn {order.table.tableNumber}
            </span>
          )}
        </div>
        
        {/* Hàng 2: Thông tin Khách & Tổng tiền */}
        <div className='flex justify-between items-center mt-auto'>
          <div className='flex flex-col'>
            <span className='font-medium text-gray-500 text-xs line-clamp-1 max-w-[120px]'>{customerName}</span>
            <span className='text-[10px] text-gray-400'>{order.itemsCount} món</span>
          </div>
          <span className='text-[12px]'>{order?.totalAmount?.toLocaleString()}đ</span>
        </div>

        {/* Hàng 3: Cụm Nút Action (Chỉ hiện nếu chưa thanh toán/hủy) */}
        {order.status !== 'paid' && order.status !== 'cancelled' && (
          <div className='flex justify-between items-center h-8 mt-1 pt-3 border-t border-gray-50'>
              {isPayment && (  <div className='flex gap-2'>
              <button 
                onClick={()=>{onOpenPayment?.(order?._id || null)}}
              className='bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors'>
                Thanh toán
              </button>
            </div>)}

            <div className='flex gap-1.5'>
              <button 
              onClick={()=>{
                navigate(`/${currentRole}/orders/edit/${order._id}`, { 
                    state: { orderData: order } 
                });
              }}
              className='bg-[#f4f6fa] hover:bg-gray-200 p-1.5 rounded-lg text-gray-400 transition-colors' title="Chỉnh sửa đơn">
                <SquarePen size={16} />
              </button>
             
                  <button className='bg-[#f4f6fa] hover:bg-gray-200 p-1.5 rounded-lg text-gray-400 transition-colors' title="In bếp/Hóa đơn">
                    <Printer size={16} />
                  </button>
                
            </div>
          </div>
        )}
      </div>

      {/* Footer trạng thái */}
      <div className={`px-4 py-2 border-t flex justify-between items-center text-[11px] font-bold rounded-b-2xl ${currentStyle.bg} ${currentStyle.border} ${currentStyle.text}`}>
        <span>{currentStyle.label}</span>
        <div className='flex items-center gap-1 opacity-80'>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          {/* Có thể thay bằng format(order.createdAt, 'HH:mm') */}
          <span>{order.createdAt ? getTimeAgo(order.createdAt) : '-'}</span>
        </div>
      </div>
    </div>
  );
};
