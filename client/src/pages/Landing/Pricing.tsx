import { Link } from 'react-router-dom';
import { Check, Sparkles, Building2, Store, ArrowRight } from 'lucide-react';

const PLANS = [
  {
    icon: Store,
    name: 'Khởi đầu',
    price: '220.000đ',
    period: '/tháng',
    desc: 'Cho cửa hàng, nhà hàng tiêu chuẩn — tất cả nghiệp vụ bán hàng cần thiết.',
    cta: 'Dùng thử miễn phí',
    highlight: false,
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
    price: '299.000đ',
    period: '/tháng',
    desc: 'Cho nhà hàng phát triển — thêm kho và chăm sóc khách hàng thân thiết.',
    cta: 'Dùng thử miễn phí',
    highlight: true,
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
    price: 'Liên hệ',
    period: '',
    desc: 'Cho chuỗi nhà hàng, nhượng quyền — giải pháp may đo theo quy mô.',
    cta: 'Liên hệ tư vấn',
    highlight: false,
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

export default function PricingPage() {
  return (
    <div className="pb-20">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-slate-100">
        <div className="pointer-events-none absolute -top-32 right-0 h-[400px] w-[400px] rounded-full bg-cerulean-blue-50 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cerulean-blue-200 bg-cerulean-blue-50 px-3 py-1 text-xs font-semibold text-cerulean-blue-700">
            <Sparkles className="w-3.5 h-3.5" />
            Bảng giá minh bạch
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.08] text-gray-900">
            Chọn gói phù hợp với quy mô nhà hàng của bạn
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 leading-relaxed">
            Chi phí tính minh bạch, cam kết không phát sinh phí ẩn. Tất cả gói đều được dùng thử miễn
            phí 30 ngày.
          </p>
        </div>
      </section>

      {/* PLANS */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-6">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`relative flex flex-col rounded-2xl border p-8 transition-all duration-200 ${
                  p.highlight
                    ? 'border-cerulean-blue-600 bg-gradient-to-br from-cerulean-blue-600 to-cerulean-blue-800 text-white shadow-2xl lg:-translate-y-3'
                    : 'border-slate-200 bg-white hover:shadow-[0_12px_40px_rgba(30,64,175,0.08)]'
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-xs font-bold text-cerulean-blue-700 shadow">
                    Phổ biến nhất
                  </span>
                )}
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      p.highlight ? 'bg-white/15 text-white' : 'bg-cerulean-blue-50 text-cerulean-blue-600'
                    }`}
                  >
                    <p.icon className="w-5 h-5" />
                  </span>
                  <h2 className={`text-xl font-bold tracking-tight ${p.highlight ? 'text-white' : 'text-gray-900'}`}>
                    {p.name}
                  </h2>
                </div>
                <p className={`mt-4 text-sm leading-relaxed ${p.highlight ? 'text-cerulean-blue-100' : 'text-slate-500'}`}>
                  {p.desc}
                </p>
                <div className="mt-6 flex items-end gap-1">
                  <span className={`text-4xl font-extrabold ${p.highlight ? 'text-white' : 'text-gray-900'}`}>
                    {p.price}
                  </span>
                  <span className={`pb-1 text-sm ${p.highlight ? 'text-cerulean-blue-200' : 'text-slate-400'}`}>
                    {p.period}
                  </span>
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                          p.highlight ? 'bg-white/15 text-white' : 'bg-emerald-100 text-emerald-600'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                      </span>
                      <span className={p.highlight ? 'text-white' : 'text-slate-600'}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/contact"
                  className={`mt-8 inline-flex items-center justify-center gap-2 rounded-xl h-11 font-semibold transition ${
                    p.highlight
                      ? 'bg-white text-cerulean-blue-700 hover:bg-cerulean-blue-50'
                      : 'bg-cerulean-blue-600 text-white hover:bg-cerulean-blue-700'
                  }`}
                >
                  {p.cta}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-10 text-center text-sm text-slate-500">
            Cần gói riêng cho chuỗi lớn?{' '}
            <Link to="/contact" className="font-semibold text-cerulean-blue-600 hover:underline">
              Liên hệ tư vấn 1-1
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
