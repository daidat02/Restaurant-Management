import { useEffect, useState } from 'react';
import { Clock, CheckCircle2, User, Home, Bike } from 'lucide-react';
export interface MockKitchenItem {
  name: string;
  quantity: number;
  note?: string;
  isDone?: boolean; // Thêm trạng thái hoàn thành riêng của bếp
}

export interface MockKitchenOrder {
  _id: string;
  tableNumber: string | number;
  orderType: 'dine-in' | 'delivery' | 'to-go';
  createdAt: string;
  items: MockKitchenItem[];
}

export const MOCK_KITCHEN_ORDERS: MockKitchenOrder[] = [
  {
    _id: "ORD-001",
    tableNumber: "Bàn số 5",
    orderType: "dine-in",
    createdAt: new Date(Date.now() - 3 * 60000).toISOString(), // Cách đây 3 phút
    items: [
      { name: "Phở Bò Tái Lăn", quantity: 2, note: "Ít hành, bánh phở mềm" },
      { name: "Quẩy Giòn", quantity: 4 },
      { name: "Trà Đá", quantity: 2 }
    ]
  },
  {
    _id: "ORD-002",
    tableNumber: "GrabFood #482",
    orderType: "delivery",
    createdAt: new Date(Date.now() - 12 * 60000).toISOString(), // Cách đây 12 phút (Cảnh báo Cam)
    items: [
      { name: "Cơm Tấm Sườn Bì Chả", quantity: 1, note: "Xin thêm nước mắm ngọt" },
      { name: "Canh Khổ Qua Nhồi Thịt", quantity: 1 },
      { name: "Sữa Đậu Nành", quantity: 1 }
    ]
  },
  {
    _id: "ORD-003",
    tableNumber: "Khách mang về",
    orderType: "to-go",
    createdAt: new Date(Date.now() - 22 * 60000).toISOString(), // Cách đây 22 phút (Báo động Đỏ - Trễ!)
    items: [
      { name: "Bún Chả Hà Nội", quantity: 3, note: "Nước chấm để ấm" },
      { name: "Nem Cua Bể", quantity: 2 }
    ]
  },
  {
    _id: "ORD-004",
    tableNumber: "Bàn số 12",
    orderType: "dine-in",
    createdAt: new Date(Date.now() - 1 * 60000).toISOString(), // Cách đây 1 phút
    items: [
      { name: "Lẩu Thái Hải Sản (Size L)", quantity: 1, note: "Cay vừa" },
      { name: "Đĩa Bò Mỹ Thêm", quantity: 2 },
      { name: "Mì Gói", quantity: 4 }
    ]
  },
  {
    _id: "ORD-004",
    tableNumber: "Bàn số 12",
    orderType: "dine-in",
    createdAt: new Date(Date.now() - 1 * 60000).toISOString(), // Cách đây 1 phút
    items: [
      { name: "Lẩu Thái Hải Sản (Size L)", quantity: 1, note: "Cay vừa" },
      { name: "Đĩa Bò Mỹ Thêm", quantity: 2 },
      { name: "Mì Gói", quantity: 4 }
    ]
  },
  {
    _id: "ORD-004",
    tableNumber: "Bàn số 12",
    orderType: "dine-in",
    createdAt: new Date(Date.now() - 1 * 60000).toISOString(), // Cách đây 1 phút
    items: [
      { name: "Lẩu Thái Hải Sản (Size L)", quantity: 1, note: "Cay vừa" },
      { name: "Đĩa Bò Mỹ Thêm", quantity: 2 },
      { name: "Mì Gói", quantity: 4 }
    ]
  },
  {
    _id: "ORD-004",
    tableNumber: "Bàn số 12",
    orderType: "dine-in",
    createdAt: new Date(Date.now() - 1 * 60000).toISOString(), // Cách đây 1 phút
    items: [
      { name: "Lẩu Thái Hải Sản (Size L)", quantity: 1, note: "Cay vừa" },
      { name: "Đĩa Bò Mỹ Thêm", quantity: 2 },
      { name: "Mì Gói", quantity: 4 }
    ]
  },
  {
    _id: "ORD-004",
    tableNumber: "Bàn số 12",
    orderType: "dine-in",
    createdAt: new Date(Date.now() - 1 * 60000).toISOString(), // Cách đây 1 phút
    items: [
      { name: "Lẩu Thái Hải Sản (Size L)", quantity: 1, note: "Cay vừa" },
      { name: "Đĩa Bò Mỹ Thêm", quantity: 2 },
      { name: "Mì Gói", quantity: 4 }
    ]
  },
  {
    _id: "ORD-004",
    tableNumber: "Bàn số 12",
    orderType: "dine-in",
    createdAt: new Date(Date.now() - 1 * 60000).toISOString(), // Cách đây 1 phút
    items: [
      { name: "Lẩu Thái Hải Sản (Size L)", quantity: 1, note: "Cay vừa" },
      { name: "Đĩa Bò Mỹ Thêm", quantity: 2 },
      { name: "Mì Gói", quantity: 4 }
    ]
  },
  {
    _id: "ORD-004",
    tableNumber: "Bàn số 12",
    orderType: "dine-in",
    createdAt: new Date(Date.now() - 1 * 60000).toISOString(), // Cách đây 1 phút
    items: [
      { name: "Lẩu Thái Hải Sản (Size L)", quantity: 1, note: "Cay vừa" },
      { name: "Đĩa Bò Mỹ Thêm", quantity: 2 },
      { name: "Mì Gói", quantity: 4 }
    ]
  },
  {
    _id: "ORD-004",
    tableNumber: "Bàn số 12",
    orderType: "dine-in",
    createdAt: new Date(Date.now() - 1 * 60000).toISOString(), // Cách đây 1 phút
    items: [
      { name: "Lẩu Thái Hải Sản (Size L)", quantity: 1, note: "Cay vừa" },
      { name: "Đĩa Bò Mỹ Thêm", quantity: 2 },
      { name: "Mì Gói", quantity: 4 }
    ]
  }
];


interface KitchenOrderCardProps {
  order: MockKitchenOrder;
  onCompleteOrder: (orderId: string) => void;
}

export function KitchenOrderCard({ order, onCompleteOrder }: KitchenOrderCardProps) {
  const [minutesElapsed, setMinutesElapsed] = useState(0);
  const [items, setItems] = useState(order.items.map(item => ({ ...item, isDone: false })));

  useEffect(() => {
    const calculateTime = () => {
      const createdTime = new Date(order.createdAt).getTime();
      const diffMs = Date.now() - createdTime;
      setMinutesElapsed(Math.floor(diffMs / 60000));
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  let timerBg = "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (minutesElapsed >= 10 && minutesElapsed < 20) {
    timerBg = "bg-amber-50 text-amber-700 border-amber-200 animate-pulse";
  } else if (minutesElapsed >= 20) {
    timerBg = "bg-rose-50 text-rose-700 border-rose-200 animate-pulse font-bold";
  }

  const typeConfigs = {
    'dine-in': { label: order.tableNumber, icon: <User className="h-3 w-3" />, color: "bg-blue-600 text-white" },
    'to-go': { label: "Mang Về", icon: <Home className="h-3 w-3" />, color: "bg-purple-600 text-white" },
    'delivery': { label: order.tableNumber, icon: <Bike className="h-3 w-3" />, color: "bg-orange-500 text-white" }
  };
  const currentType = typeConfigs[order.orderType];

  const toggleItemDone = (index: number) => {
    setItems(prev => prev.map((item, idx) => idx === index ? { ...item, isDone: !item.isDone } : item));
  };

  const isAllItemsDone = items.every(item => item.isDone);

  return (
    // THAY ĐỔI: Chiều cao tối ưu [340px], nền trắng tinh, viền xám nhạt mỏng
    <div className={`flex flex-col h-[340px] bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden transition-all ${isAllItemsDone ? 'ring-2 ring-emerald-500 border-transparent' : ''}`}>
      
      {/* CARD HEADER (Thu nhỏ font chữ & icon) */}
      <div className="p-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          {/* THY ĐỔI: Chuyển sang chữ siêu nhỏ text-[11px] */}
          <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 ${currentType.color}`}>
            {currentType.icon}
            {currentType.label}
          </span>
        </div>
        
        {/* THAY ĐỔI: Cỡ chữ nhỏ text-[10px] */}
        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[10px] font-medium ${timerBg}`}>
          <Clock className="h-2.5 w-2.5" />
          <span>{minutesElapsed} ph</span>
        </div>
      </div>

      {/* CARD BODY: DANH SÁCH MÓN (Tối ưu khoảng cách và cỡ chữ) */}
      <div className="flex-1 p-2 overflow-y-auto divide-y divide-gray-100 bg-white">
        {items.map((item, idx) => (
          <div 
            key={idx} 
            onClick={() => toggleItemDone(idx)}
            className={`py-1.5 flex items-start gap-1.5 cursor-pointer select-none transition-all ${item.isDone ? 'opacity-30' : ''}`}
          >
            {/* THAY ĐỔI: Badge số lượng nhỏ gọn hơn text-xs h-5 */}
            <span className={`inline-flex items-center justify-center min-w-[18px] h-5 px-1 rounded text-xs font-extrabold ${item.isDone ? 'bg-gray-100 text-gray-400 line-through' : 'bg-gray-800 text-white'}`}>
              {item.quantity}
            </span>

            <div className="flex-1 min-w-0">
              {/* THAY ĐỔI: Chữ món ăn thu nhỏ xuống text-xs */}
              <p className={`text-xs font-bold text-gray-700 leading-tight ${item.isDone ? 'line-through text-gray-400' : ''}`}>
                {item.name}
              </p>
              {item.note && !item.isDone && (
                // THAY ĐỔI: Chữ lưu ý siêu nhỏ text-[10px] bớt chiếm diện tích
                <span className="inline-block mt-0.5 text-[10px] font-medium text-amber-700 bg-amber-50 px-1 rounded border border-amber-100">
                  ⚠️ {item.note}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CARD FOOTER */}
      <div className="p-2 bg-white border-t border-gray-200 shrink-0">
        <button
          onClick={() => onCompleteOrder(order._id)}
          // THAY ĐỔI: Chiều cao nút nhỏ lại py-2, cỡ chữ text-[11px]
          className={`w-full py-2 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
            isAllItemsDone 
              ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          HOÀN THÀNH ĐƠN
        </button>
      </div>
    </div>
  );
}