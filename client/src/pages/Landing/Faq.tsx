import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, MessageCircle, Sparkles } from 'lucide-react';

const FAQS = [
  {
    q: 'Hệ thống hoạt động trên những thiết bị nào?',
    a: 'NhàHàng OS hoạt động trên trình duyệt ở mọi thiết bị: điện thoại thông minh (iOS/Android), máy tính bảng, PC/Laptop và máy POS tính tiền. Khách quét QR mở menu trực tiếp trên điện thoại không cần tải app.',
  },
  {
    q: 'Mất mạng thì có bán hàng được không?',
    a: 'Có. Khi mất mạng bạn vẫn có thể order và bán hàng bình thường. Ngay khi mạng trở lại, toàn bộ dữ liệu doanh thu tự động đồng bộ lên Cloud mà không làm gián đoạn quy trình phục vụ.',
  },
  {
    q: 'Điểm thành viên tích và sử dụng thế nào?',
    a: 'Khách được nhận diện bằng số điện thoại. Hệ thống tự động cộng điểm khi thanh toán và trừ điểm khi khách dùng ưu đãi trên các đơn sau — cả tại bàn lẫn qua POS. Mỗi nhà hàng quản lý điểm riêng tách biệt.',
  },
  {
    q: 'Có hỗ trợ hóa đơn điện tử (HĐĐT) không?',
    a: 'Đang phát triển. Hệ thống được thiết kế để tích hợp các nhà cung cấp HĐĐT nhằm tự động xuất và truyền nhận dữ liệu bán hàng, giúp cơ sở tuân thủ đúng pháp luật.',
  },
  {
    q: 'Dữ liệu của tôi có an toàn không?',
    a: 'Toàn bộ dữ liệu được mã hóa và lưu trữ trên Cloud tiêu chuẩn quốc tế, giúp tránh mất dữ liệu do hỏng ổ cứng hay virus. Bạn có thể đăng nhập trên thiết bị mới mà không mất xót dữ liệu.',
  },
  {
    q: 'Hỗ trợ kỹ thuật khi nào?',
    a: 'Đội ngũ hỗ trợ luôn túc trực các ngày trong tuần, kể cả Thứ 7, Chủ Nhật và Lễ Tết. Bạn có thể yêu cầu hỗ trợ từ xa qua liên hệ hỗ trợ trên trang.',
  },
  {
    q: 'Có thể dùng thử trước khi trả phí không?',
    a: 'Có. Tất cả gói đều được dùng thử miễn phí 30 ngày với đầy đủ tính năng. Chúng tôi sẽ đồng hành thiết lập dữ liệu mẫu phù hợp với mô hình kinh doanh của bạn.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
      >
        <h3 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900">{q}</h3>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cerulean-blue-50 text-cerulean-blue-600 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <ChevronDown className="w-5 h-5" />
        </span>
      </button>
      {open && (
        <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export default function FaqPage() {
  return (
    <div className="pb-20">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-slate-100">
        <div className="pointer-events-none absolute -top-32 left-0 h-[400px] w-[400px] rounded-full bg-cerulean-blue-50 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cerulean-blue-200 bg-cerulean-blue-50 px-3 py-1 text-xs font-semibold text-cerulean-blue-700">
            <MessageCircle className="w-3.5 h-3.5" />
            Câu hỏi thường gặp
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.08] text-gray-900">
            Những thắc mắc phổ biến
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 leading-relaxed">
            Chưa tìm được câu trả lời? Đội ngũ chuyên gia của chúng tôi luôn sẵn sàng hỗ trợ bạn.
          </p>
        </div>
      </section>

      {/* FAQ LIST */}
      <section className="py-16 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          {FAQS.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-cerulean-blue-200 bg-cerulean-blue-50 p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cerulean-blue-600 text-white">
                <Sparkles className="w-6 h-6" />
              </span>
              <div>
                <p className="font-bold text-gray-900">Vẫn còn thắc mắc?</p>
                <p className="text-sm text-slate-600">Đội ngũ hỗ trợ trả lời nhanh chóng.</p>
              </div>
            </div>
            <Link
              to="/contact"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-cerulean-blue-600 px-6 font-semibold text-white hover:bg-cerulean-blue-700 transition"
            >
              Liên hệ hỗ trợ
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}