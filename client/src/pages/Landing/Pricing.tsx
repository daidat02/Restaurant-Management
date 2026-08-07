import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Check,
  Minus,
  Sparkles,
  Building2,
  Store,
  ArrowRight,
  Gift,
  CalendarClock,
  Clock,
  Flame,
  ChevronDown,
} from 'lucide-react';

const PLANS = [
  {
    icon: Store,
    name: 'Khởi đầu',
    monthly: '220.000đ',
    yearly: '2.200.000đ',
    period: '/tháng',
    yearlyPeriod: '/năm',
    desc: 'Cho cửa hàng, nhà hàng tiêu chuẩn — tất cả nghiệp vụ bán hàng cần thiết.',
    badge: null,
    highlight: false,
    cta: 'Dùng thử miễn phí',
    features: [
      'Gọi món bằng QR tại bàn',
      'POS thu ngân không giới hạn thiết bị',
      'Quản lý menu số & bếp số hoá (KDS)',
      'Đặt bàn online',
      'Báo cáo doanh thu cơ bản',
      'Hỗ trợ nhiều chi nhánh',
    ],
  },
  {
    icon: Building2,
    name: 'Nâng cao',
    monthly: '299.000đ',
    yearly: '2.990.000đ',
    period: '/tháng',
    yearlyPeriod: '/năm',
    desc: 'Cho nhà hàng phát triển — thêm kho và chăm sóc khách hàng thân thiết.',
    badge: 'PHỔ BIẾN NHẤT',
    highlight: true,
    cta: 'Dùng thử miễn phí',
    features: [
      'Mọi tính năng gói Khởi đầu',
      'Tích điểm thành viên theo SĐT',
      'Quản lý kho định lượng nguyên liệu',
      'Tách/gộp hoá đơn, chốt ca minh bạch',
      'Báo cáo lãi lỗ chi tiết',
      'Phân quyền chủ — quản lý — nhân viên',
    ],
  },
  {
    icon: Sparkles,
    name: 'Phát triển PRO',
    monthly: 'Liên hệ',
    yearly: 'Liên hệ',
    period: '',
    yearlyPeriod: '',
    desc: 'Cho chuỗi nhà hàng, nhượng quyền — giải pháp may đo theo quy mô.',
    badge: null,
    highlight: false,
    cta: 'Liên hệ tư vấn',
    features: [
      'Mọi tính năng gói Nâng cao',
      'Quản lý chuỗi đa chi nhánh',
      'Luân chuyển kho liên chi nhánh',
      'Báo cáo tổng hợp Real-time',
      'E-Menu và bảng giá riêng từng điểm bán',
      'Triển khai & đào tạo 1-1',
    ],
  },
];

/** So sánh chi tiết — dấu tích/không có */
const COMPARISON: { label: string; values: (boolean | string)[] }[] = [
  { label: 'Số chi nhánh', values: ['2', '10', 'Không giới hạn'] },
  { label: 'Gọi món QR tại bàn', values: [true, true, true] },
  { label: 'POS thu ngân', values: [true, true, true] },
  { label: 'Menu số & KDS', values: [true, true, true] },
  { label: 'Đặt bàn online', values: [true, true, true] },
  { label: 'Tích điểm thành viên', values: [false, true, true] },
  { label: 'Quản lý kho nguyên liệu', values: [false, true, true] },
  { label: 'Báo cáo lãi lỗ chi tiết', values: [false, true, true] },
  { label: 'Luân chuyển kho liên chi nhánh', values: [false, false, true] },
  { label: 'E-Menu riêng từng điểm bán', values: [false, false, true] },
  { label: 'Triển khai & đào tạo 1-1', values: [false, false, true] },
];

const PAYMENT_FAQS = [
  {
    q: 'Tôi thanh toán bằng cách nào?',
    a: 'Bạn thanh toán qua PayOS (chuyển khoản/QR) hoặc VNPAY. Ngay khi đối soát xong, gói dịch vụ được kích hoạt tự động trên tài khoản.',
  },
  {
    q: 'Dữ liệu nhà hàng của tôi có an toàn không?',
    a: 'Mỗi nhà hàng (tenant) chạy trên dữ liệu tách biệt, được phân quyền nghiêm ngặt. Bạn có thể xuất toàn bộ sản phẩm, đơn hàng và khách hàng bất cứ lúc nào — không khoá chân bạn.',
  },
  {
    q: 'Nếu tôi muốn ngừng dùng thì sao?',
    a: 'Bạn có thể huỷ gia hạn bất cứ lúc nào, tài khoản vẫn chạy hết chu kỳ đã thanh toán rồi tự chuyển về gói miễn phí. Không có phí phạt, không ràng buộc hợp đồng.',
  },
  {
    q: 'NhàHàng OS khác gì các nền tảng khác?',
    a: 'Chúng tôi tập trung vào ba thứ: giao diện tiếng Việt trọn vẹn, đồng bộ thời gian thực giữa POS – bếp – khách hàng, và chi phí minh bạch từ tên miền, thanh toán tới hỗ trợ.',
  },
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

function OfferBanner() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-cerulean-blue-100 bg-gradient-to-br from-cerulean-blue-50 via-white to-cerulean-blue-50 p-8 lg:p-10">
      <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-cerulean-blue-100/60 blur-3xl" />
      <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cerulean-blue-600 text-white shadow-lg shadow-cerulean-blue-200">
            <Gift className="h-6 w-6" />
          </span>
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-cerulean-blue-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
              <Flame className="h-3 w-3" />
              ƯU ĐÃI RA MẮT
            </span>
            <h3 className="mt-2 text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
              Dùng thử miễn phí 30 ngày gói Nâng cao
            </h3>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-500">
              Nhà hàng đầu tiên được trải nghiệm toàn bộ tính năng — tích điểm, quản lý kho, chốt ca —
              không cần thẻ tín dụng.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-center">
            <p className="text-2xl font-extrabold text-cerulean-blue-700">30</p>
            <p className="text-[11px] font-medium text-slate-400">ngày miễn phí</p>
          </div>
          <div className="h-10 w-px bg-slate-200" />
          <div className="text-center">
            <p className="text-2xl font-extrabold text-cerulean-blue-700">0đ</p>
            <p className="text-[11px] font-medium text-slate-400">không cần thẻ</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');

  return (
    <div className="overflow-x-hidden pb-20">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-slate-100">
        <div className="pointer-events-none absolute -top-32 right-0 h-[400px] w-[400px] rounded-full bg-cerulean-blue-50 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-32 h-[300px] w-[300px] rounded-full bg-slate-50 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="inline-flex items-center gap-1.5 rounded-full border border-cerulean-blue-200 bg-cerulean-blue-50 px-3 py-1 text-xs font-semibold text-cerulean-blue-700"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Bảng giá minh bạch
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            className="mx-auto mt-4 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight text-gray-900 sm:text-5xl"
          >
            Chọn gói vừa với quy mô nhà hàng của bạn
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.16 }}
            className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-600"
          >
            Bắt đầu miễn phí trọn đời, nâng cấp bất cứ lúc nào. Không phí ẩn, không ràng buộc hợp
            đồng.
          </motion.p>
        </div>
      </section>

      {/* PLANS */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <OfferBanner />

          {/* Toggle tháng/năm */}
          <div className="mt-12 flex flex-col items-center gap-3">
            <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setBilling('monthly')}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  billing === 'monthly' ? 'bg-white text-cerulean-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Theo tháng
              </button>
              <button
                type="button"
                onClick={() => setBilling('yearly')}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  billing === 'yearly' ? 'bg-white text-cerulean-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Theo năm
              </button>
            </div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
              <CalendarClock className="h-4 w-4" />
              Thanh toán theo năm được tặng 2 tháng sử dụng
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {PLANS.map((p, i) => {
              const price = billing === 'monthly' ? p.monthly : p.yearly;
              const period = billing === 'monthly' ? p.period : p.yearlyPeriod;
              return (
                <motion.div
                  key={p.name}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.12 }}
                  className={`relative flex flex-col rounded-2xl border p-8 transition-all duration-300 hover:-translate-y-1 ${
                    p.highlight
                      ? 'border-cerulean-blue-600 bg-gradient-to-br from-cerulean-blue-600 to-cerulean-blue-800 text-white shadow-2xl lg:-translate-y-3 lg:hover:-translate-y-4'
                      : 'border-slate-200 bg-white hover:shadow-[0_16px_40px_rgba(30,64,175,0.08)]'
                  }`}
                >
                  {p.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-bold text-cerulean-blue-700 shadow">
                      {p.badge}
                    </span>
                  )}

                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        p.highlight ? 'bg-white/15 text-white' : 'bg-cerulean-blue-50 text-cerulean-blue-600'
                      }`}
                    >
                      <p.icon className="h-5 w-5" />
                    </span>
                    <h2 className={`text-xl font-bold tracking-tight ${p.highlight ? 'text-white' : 'text-gray-900'}`}>
                      {p.name}
                    </h2>
                  </div>

                  <p className={`mt-4 text-sm leading-relaxed ${p.highlight ? 'text-cerulean-blue-100' : 'text-slate-500'}`}>
                    {p.desc}
                  </p>

                  <div className="mt-6 flex flex-wrap items-end gap-x-2 gap-y-1">
                    <span className={`text-4xl font-extrabold tracking-tight ${p.highlight ? 'text-white' : 'text-gray-900'}`}>
                      {price}
                    </span>
                    {period && (
                      <span className={`pb-1 text-sm ${p.highlight ? 'text-cerulean-blue-200' : 'text-slate-400'}`}>
                        {period}
                      </span>
                    )}
                  </div>
                  {p.highlight && (
                    <p className="mt-1 text-xs font-medium text-emerald-200">Tiết kiệm 17% so với trả tháng</p>
                  )}

                  <ul className="mt-6 flex-1 space-y-3">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                            p.highlight ? 'bg-white/15 text-white' : 'bg-emerald-100 text-emerald-600'
                          }`}
                        >
                          <Check className="h-3 w-3" />
                        </span>
                        <span className={p.highlight ? 'text-white' : 'text-slate-600'}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/contact"
                    className={`mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-xl font-semibold transition ${
                      p.highlight
                        ? 'bg-white text-cerulean-blue-700 hover:bg-cerulean-blue-50'
                        : 'bg-cerulean-blue-600 text-white hover:bg-cerulean-blue-700'
                    }`}
                  >
                    {p.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <p className="mt-10 text-center text-sm text-slate-500">
            Cần gói riêng cho chuỗi lớn?{' '}
            <Link to="/contact" className="font-semibold text-cerulean-blue-600 hover:underline">
              Liên hệ tư vấn 1-1
            </Link>
          </p>
        </div>
      </section>

      {/* SO SÁNH CHI TIẾT */}
      <section className="border-y border-slate-100 bg-slate-50/60 py-16 lg:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-cerulean-blue-600">
                So sánh chi tiết
              </span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Tính năng theo từng gói
              </h2>
              <p className="mt-3 leading-relaxed text-slate-500">
                Nâng cấp khi nhà hàng lớn lên — mọi dữ liệu và cấu hình được giữ nguyên.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(30,64,175,0.06)]">
              {/* Header */}
              <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] items-center border-b border-slate-100 bg-slate-50/60 px-4 py-4 sm:px-6">
                <p className="text-sm font-semibold text-gray-900">Tính năng</p>
                {PLANS.map((p) => (
                  <p
                    key={p.name}
                    className={`text-center text-sm font-bold ${
                      p.highlight ? 'text-cerulean-blue-600' : 'text-gray-900'
                    }`}
                  >
                    {p.name}
                  </p>
                ))}
              </div>
              {COMPARISON.map((row, i) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-[1.4fr_1fr_1fr_1fr] items-center px-4 py-3 sm:px-6 ${
                    i % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                  }`}
                >
                  <p className="text-sm text-slate-600">{row.label}</p>
                  {row.values.map((v, j) => (
                    <div key={j} className="flex justify-center">
                      {typeof v === 'boolean' ? (
                        v ? (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-300">
                            <Minus className="h-3.5 w-3.5" />
                          </span>
                        )
                      ) : (
                        <span className="text-sm font-semibold text-gray-900">{v}</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ THANH TOÁN */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mb-10 text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-cerulean-blue-600">
                Câu hỏi về thanh toán
              </span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Chưa tìm thấy câu trả lời?
              </h2>
              <p className="mt-3 leading-relaxed text-slate-500">
                <Link to="/contact" className="font-semibold text-cerulean-blue-600 hover:underline">
                  Nhắn cho đội ngũ hỗ trợ
                </Link>
                , chúng tôi phản hồi trong 24 giờ.
              </p>
            </div>
          </Reveal>

          <div className="space-y-3">
            {PAYMENT_FAQS.map((f, i) => (
              <Reveal key={f.q} delay={i * 0.06}>
                <FaqItem q={f.q} a={f.a} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA CUỐI */}
      <section>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cerulean-blue-600 to-cerulean-blue-800 px-8 py-12 text-center text-white shadow-xl lg:px-14 lg:py-14">
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <Clock className="mx-auto h-9 w-9 text-cerulean-blue-100" />
              <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
                Bắt đầu miễn phí — nâng cấp khi nhà hàng lớn lên
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-cerulean-blue-100">
                Tạo tài khoản, mở bán chi nhánh đầu tiên trong 5 phút và nhận đơn ngay hôm nay.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/contact"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-7 font-bold text-cerulean-blue-700 transition hover:bg-cerulean-blue-50"
                >
                  Bắt đầu miễn phí
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/guide"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-white/30 px-7 font-semibold text-white transition hover:bg-white/10"
                >
                  Xem hướng dẫn triển khai
                </Link>
              </div>
              <p className="mt-5 text-xs text-cerulean-blue-100">
                Không cần thẻ tín dụng · Huỷ bất cứ lúc nào
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-colors hover:border-cerulean-blue-200">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-gray-900 sm:text-base">{q}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? 'rotate-180 text-cerulean-blue-600' : ''
          }`}
        />
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-sm leading-relaxed text-slate-500">{a}</p>
        </div>
      )}
    </div>
  );
}
