import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronDown, MessageCircle, Sparkles, Compass, Headset, ArrowRight } from 'lucide-react';

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

const EXPLORE = [
  { label: 'Bảng giá', to: '/pricing' },
  { label: 'Hướng dẫn triển khai', to: '/guide' },
  { label: 'Dùng thử miễn phí', to: '/contact' },
  { label: 'Liên hệ hỗ trợ', to: '/contact' },
];

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-colors hover:border-cerulean-blue-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
      >
        <span className="text-base font-semibold tracking-tight text-gray-900 sm:text-lg">{q}</span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${
            open
              ? 'rotate-180 bg-cerulean-blue-600 text-white'
              : 'bg-cerulean-blue-50 text-cerulean-blue-600'
          }`}
        >
          <ChevronDown className="h-5 w-5" />
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 sm:px-6">
          <p className="text-sm leading-relaxed text-slate-500">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function FaqPage() {
  return (
    <div className="overflow-x-hidden pb-20">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-slate-100">
        <div className="pointer-events-none absolute -top-32 left-0 h-[400px] w-[400px] rounded-full bg-cerulean-blue-50 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-32 h-[300px] w-[300px] rounded-full bg-slate-50 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="inline-flex items-center gap-1.5 rounded-full border border-cerulean-blue-200 bg-cerulean-blue-50 px-3 py-1 text-xs font-semibold text-cerulean-blue-700"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Câu hỏi thường gặp
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            className="mx-auto mt-4 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight text-gray-900 sm:text-5xl"
          >
            Những thắc mắc phổ biến
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.16 }}
            className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-600"
          >
            Chưa tìm được câu trả lời? Đội ngũ chuyên gia của chúng tôi luôn sẵn sàng hỗ trợ bạn.
          </motion.p>
        </div>
      </section>

      {/* FAQ LIST */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {FAQS.map((f, i) => (
              <Reveal key={f.q} delay={i * 0.05}>
                <FaqItem q={f.q} a={f.a} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* KHÁM PHÁ THEO NHU CẦU */}
      <section className="border-y border-slate-100 bg-slate-50/60 py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mb-8 text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-cerulean-blue-600">
                Khám phá thêm
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Khám phá theo nhu cầu của bạn
              </h2>
              <p className="mt-3 leading-relaxed text-slate-500">
                Nếu câu hỏi của bạn thuộc một trong các chủ đề dưới đây, hãy ghé thẳng trang phù hợp.
              </p>
            </div>
          </Reveal>
          <div className="flex flex-wrap justify-center gap-3">
            {EXPLORE.map((e, i) => (
              <motion.div
                key={e.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
              >
                <Link
                  to={e.to}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-cerulean-blue-200 hover:text-cerulean-blue-700 hover:shadow-[0_8px_24px_rgba(30,64,175,0.1)]"
                >
                  <Compass className="h-4 w-4" />
                  {e.label}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cerulean-blue-600 to-cerulean-blue-800 px-8 py-12 text-center text-white shadow-xl lg:px-14 lg:py-14">
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <Headset className="mx-auto h-10 w-10 text-cerulean-blue-100" />
              <h2 className="mx-auto mt-4 max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">
                Vẫn còn thắc mắc?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-cerulean-blue-100">
                Đội ngũ hỗ trợ trả lời nhanh chóng, kể cả cuối tuần và Lễ Tết.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/contact"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-7 font-bold text-cerulean-blue-700 transition hover:bg-cerulean-blue-50"
                >
                  Liên hệ hỗ trợ
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-white/30 px-7 font-semibold text-white transition hover:bg-white/10"
                >
                  Xem bảng giá
                </Link>
              </div>
              <p className="mt-5 text-xs text-cerulean-blue-100">
                <Sparkles className="mr-1 inline h-3 w-3" />
                Dùng thử miễn phí 30 ngày, không cần thẻ tín dụng
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
