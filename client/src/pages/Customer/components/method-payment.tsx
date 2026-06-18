import { AlertTriangle, Check, CircleDollarSign, Copy, Info } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'E_WALLET';
type OrderType = 'dine-in' | 'delivery';


interface MethodSelectorProps {
  id: PaymentMethod
  title: string
  desc: string
  icon: React.ReactNode
  activeMethod: PaymentMethod
  setMethod: (id: PaymentMethod) => void
}

export function MethodSelector({ id, title, desc, icon, activeMethod, setMethod }: MethodSelectorProps) {
  const isSelected = activeMethod === id
  return (
    <button
      type="button"
      onClick={() => setMethod(id)}
      className={`text-left p-3.5 rounded-xl border transition-all flex gap-3.5 items-start bg-white shadow-[0_4px_20px_rgba(0,0,0,0.01)] ${
        isSelected ? 'border-orange-500 bg-orange-50/10 ring-1 ring-orange-500/30' : 'border-gray-100 hover:border-gray-200'
      }`}
    >
      <div className={`p-2 rounded-lg border flex-shrink-0 ${isSelected ? 'bg-orange-500 border-orange-600 text-white' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
        {icon}
      </div>
      <div className="space-y-0.5 min-w-0">
        <h3 className="font-extrabold text-xs text-gray-900 tracking-tight leading-snug">{title}</h3>
        <p className="text-[10px] text-gray-400 font-light leading-snug line-clamp-2">{desc}</p>
      </div>
    </button>
  )
}



const BANK_BIN_MAP: Record<string, string> = {
  "970422": "MB Bank (Ngân hàng Quân Đội)",
  "970436": "Vietcombank (VCB)",
  "970415": "VietinBank",
  "970407": "Techcombank",
  "970418": "BIDV",
  "970432": "VPBank",
}


interface MethodDetailsProps {
  paymentMethod: PaymentMethod
  orderType: OrderType
  bankInfo: any | null
}

export function PaymentMethodDetails({ paymentMethod, orderType, bankInfo }: MethodDetailsProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyText = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  // Khai báo an toàn các thuộc tính lấy từ object infoPayment của PayOS
  const payosDetails = bankInfo?.infoPayment;
  const bankDisplayName = BANK_BIN_MAP[payosDetails?.bin] || "Ngân hàng đối tác PayOS";

  return (
    <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
      
      {paymentMethod === 'BANK_TRANSFER' && (
        <>
          { bankInfo ? (
            <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-6 items-center animate-fadeIn">
              {/* VẼ QR CODE BẰNG SVG TỪ CHUỖI TEXT THÔ TRẢ VỀ */}
              <div className="flex flex-col items-center justify-center p-3.5 bg-white rounded-xl border border-gray-100 shadow-sm mx-auto md:mx-0">
                <QRCodeSVG
                  value={bankInfo?.qrCodeData || ""}
                  size={120} 
                  style={{ borderRadius: '4px' }} 
                  includeMargin={false}
                />
                <span className="text-[9px] font-black text-gray-400 mt-2.5 uppercase font-mono tracking-tight">Quét để thanh toán</span>
              </div>
              
              <div className="space-y-2.5 text-xs">
                <div className="bg-orange-50 border border-orange-100 p-2.5 rounded-xl flex gap-2 text-orange-700 leading-normal">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] font-medium">Hệ thống duyệt hóa đơn tự động ngay khi nhận được tín hiệu tiền ngân hàng.</p>
                </div>
                <div className="grid grid-cols-3 py-1 border-b border-gray-100">
                  <span className="text-gray-400 font-medium">Ngân hàng:</span>
                  <span className="col-span-2 font-black text-gray-900">{bankDisplayName}</span>
                </div>
                <div className="grid grid-cols-3 py-1 border-b border-gray-100 items-center">
                  <span className="text-gray-400 font-medium">Số tài khoản:</span>
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="font-mono font-black text-gray-900 text-sm tracking-wide">{payosDetails?.accountNumber}</span>
                    <button 
                      type="button"
                      onClick={() => handleCopyText(payosDetails?.accountNumber)}
                      className="p-1 bg-white border border-gray-200 rounded hover:bg-gray-50 text-gray-500 transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 py-1 border-b border-gray-100">
                  <span className="text-gray-400 font-medium">Chủ tài khoản:</span>
                  <span className="col-span-2 font-bold text-gray-800 uppercase tracking-tight">{payosDetails?.accountName}</span>
                </div>
                <div className="grid grid-cols-3 py-1">
                  <span className="text-gray-400 font-medium">Nội dung chuyển:</span>
                  <span className="col-span-2 font-mono font-black text-orange-600 uppercase tracking-tight">{payosDetails?.description}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-3 bg-white rounded-xl border border-dashed border-gray-200 p-4">
              <div className="w-10 h-10 bg-orange-50 text-orange-500 border border-orange-100 rounded-full flex items-center justify-center mx-auto">
                <Info className="w-5 h-5" />
              </div>
              <div className="max-w-xs mx-auto space-y-1.5">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-tight">Thông tin thanh toán</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Mã QR và thông tin tài khoản chuyển khoản sẽ hiển thị ngay sau khi bạn bấm nút "Xác nhận tạo thông tin" ở bên phải.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {paymentMethod === 'CASH' && (
        <div className="text-center py-6 space-y-3">
          <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <CircleDollarSign className="w-5 h-5" />
          </div>
          <div className="max-w-xs mx-auto space-y-1">
            <h4 className="text-xs font-black text-gray-900">
              {orderType === 'delivery' ? 'Thanh toán trực tiếp cho Shipper' : 'Nhân viên phục vụ tại bàn'}
            </h4>
            <p className="text-[11px] text-gray-400">
              {orderType === 'delivery' 
                ? 'Vui lòng chuẩn bị số tiền mặt tương ứng để thanh toán khi tài xế giao món ăn đến tay.' 
                : 'Yêu cầu thanh toán được gửi tới quầy thu ngân. Nhân viên sẽ mang hóa đơn tới kiểm đếm trực tiếp.'}
            </p>
          </div>
        </div>
      )}

    </div>
  )
}