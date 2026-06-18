import { MapPin, Phone, Truck, User } from "lucide-react";

interface DeliveryFormProps {
  info: { name: string; phone: string; address: string }
  setInfo: React.Dispatch<React.SetStateAction<{ name: string; phone: string; address: string }>>
}

export function DeliveryForm({ info, setInfo }: DeliveryFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm lg:text-base font-black text-gray-950 tracking-tight uppercase flex items-center gap-2">
          <Truck className="w-4 h-4 text-orange-500" />
          Thông tin giao hàng
        </h2>
        <p className="text-xs text-gray-400 font-medium">Vui lòng nhập chính xác để tài xế liên hệ</p>
      </div>

      <div className="bg-gray-50/40 border border-gray-100 rounded-2xl p-5 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
              <User className="w-3 h-3" /> Tên người nhận
            </label>
            <input 
              type="text" 
              placeholder="Ví dụ: Nguyễn Văn A"
              value={info.name}
              onChange={(e) => setInfo(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-medium transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
              <Phone className="w-3 h-3" /> Số điện thoại
            </label>
            <input 
              type="tel" 
              placeholder="Ví dụ: 0901234567"
              value={info.phone}
              onChange={(e) => setInfo(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono font-medium transition-all"
            />
          </div>
        </div>
        
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Địa chỉ nhận hàng cụ thể
          </label>
          <input 
            type="text" 
            placeholder="Số nhà, tên đường, tòa nhà, số tầng (nếu có)..."
            value={info.address}
            onChange={(e) => setInfo(prev => ({ ...prev, address: e.target.value }))}
            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-medium transition-all"
          />
        </div>
      </div>
    </div>
  )
}
