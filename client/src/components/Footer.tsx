import React from 'react'
import { MapPin, Phone, Mail, Clock, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function FooterCustomer() {
  const navigate = useNavigate()
  
  return (
    <footer className="w-full bg-[#1a1a1a] text-gray-400 text-sm mt-auto border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-6 md:px-16 py-12 grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* CỘT 1: THÔNG TIN QUÁN (CHIẾM 5 CỘT) */}
        <div className="md:col-span-5 space-y-4">
          <h3 className="text-xl font-black text-white tracking-tight">
            Quán <span className="text-orange-500">NhamNhi</span>
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed max-w-sm">
            Hội tụ tinh hoa mồi bén, lẩu ngọt nướng thơm ngon chuẩn vị mộc mạc cho cuộc vui thăng hoa. Cam kết thực phẩm sạch 100% trong ngày.
          </p>
          <div className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-950/40 px-3 py-2 rounded-xl border border-emerald-900/30 w-fit">
            <ShieldCheck className="w-4 h-4" />
            <span>Đã chứng nhận An Toàn Thực Phẩm</span>
          </div>
        </div>

        {/* CỘT 2: LIÊN KẾT NHANH (CHIẾM 3 CỘT) */}
        <div className="md:col-span-3 space-y-3">
          <h4 className="text-white font-bold uppercase tracking-wider text-xs">Khám Phá</h4>
          <ul className="space-y-2 text-xs">
            <li><button onClick={() => navigate('/')} className="hover:text-white transition-colors">Trang chủ</button></li>
            <li><button onClick={() => navigate('/menu')} className="hover:text-white transition-colors">Thực đơn lẩu nướng</button></li>
            <li><button onClick={() => navigate('/orders')} className="hover:text-white transition-colors">Theo dõi đơn hàng</button></li>
          </ul>
        </div>

        {/* CỘT 3: LIÊN HỆ & GIỜ MỞ CỬA (CHIẾM 4 CỘT) */}
        <div className="md:col-span-4 space-y-3 text-xs">
          <h4 className="text-white font-bold uppercase tracking-wider text-xs">Liên Hệ Đặt BÀN</h4>
          <ul className="space-y-2.5">
            <li className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
              <span>123 Đường Nhậu Lai Rai, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <span className="font-semibold text-gray-200">Hotline: 1900 xxxx (08:00 - 23:00)</span>
            </li>
            <li className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <span>Giờ đón khách: 10:00 AM - 11:30 PM (Cả tuần)</span>
            </li>
          </ul>
        </div>

      </div>

      {/* BẢN QUYỀN CUỐI TRANG */}
      <div className="w-full border-t border-gray-900 bg-[#141414] py-4 text-center text-xs text-gray-600">
        <p>© {new Date().getFullYear()} Quán NhamNhi. Tất cả các quyền được bảo lưu. Phát triển bởi datnd02.</p>
      </div>
    </footer>
  )
}  