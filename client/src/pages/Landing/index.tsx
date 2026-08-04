import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { LandingAuthContext } from './LandingLayout';
import {
  QrCode,
  UtensilsCrossed,
  CalendarCheck,
  Banknote,
  ChefHat,
  Smartphone,
  ArrowRight,
  Check,
  Star,
  Zap,
  Layers,
  Users,
  TrendingUp,
  Clock,
  Store,
  ShieldCheck,
  BarChart3,
  Lock,
  LogIn,
} from 'lucide-react';

const FEATURES = [
  {
    icon: QrCode,
    title: 'Gọi món bằng QR tại bàn',
    desc: 'Khách quét mã trên bàn, xem menu và gửi món thẳng xuống bếp — không cần tải app.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Menu số linh hoạt',
    desc: 'Cập nhật giá, ảnh, món hết hàng theo thời gian thực cho từng chi nhánh.',
  },
  {
    icon: CalendarCheck,
    title: 'Đặt bàn online',
    desc: 'Nhận đặt chỗ 24/7, tự động xếp bàn và nhắc khách trước giờ đến.',
  },
  {
    icon: Banknote,
    title: 'POS thu ngân',
    desc: 'Tách/gộp hoá đơn, nhiều phương thức thanh toán, chốt ca minh bạch.',
  },
  {
    icon: ChefHat,
    title: 'Bếp số hoá (KDS)',
    desc: 'Phiếu chế biến hiển thị theo trạm, ưu tiên món trễ, giảm sai sót.',
  },
  {
    icon: Smartphone,
    title: 'Tích điểm theo SĐT',
    desc: 'Nhận diện khách quen bằng số điện thoại, tặng điểm và ưu đãi tự động.',
  },
];

const STEPS = [
  {
    icon: QrCode,
    title: '1. Khách quét QR',
    desc: 'Mỗi bàn có mã riêng, menu mở ngay trên trình duyệt điện thoại.',
  },
  {
    icon: Zap,
    title: '2. Gọi món',
    desc: 'Đơn chạy thẳng vào POS và màn hình bếp, nhân viên chỉ cần xác nhận.',
  },
  {
    icon: Star,
    title: '3. Thanh toán & tích điểm',
    desc: 'Thanh toán tại bàn hoặc quầy, điểm thành viên cộng theo số điện thoại.',
  },
];

const STATS = [
  { value: '-32%', label: 'thời gian chờ gọi món' },
  { value: '+18%', label: 'giá trị hoá đơn trung bình' },
  { value: '5 phút', label: 'để mở bán chi nhánh mới' },
  { value: '99,9%', label: 'thời gian hệ thống hoạt động' },
];

const ROLES = [
  'Chủ nhà hàng: quản trị chi nhánh, menu, báo cáo doanh thu.',
  'Quản lý: ca làm, đặt bàn, kho và khuyến mãi.',
  'Nhân viên: POS, phục vụ bàn và màn hình bếp.',
];

const ORDERS = [
  { table: 'Bàn 07', items: 'Lẩu Thái Hải Sản', qty: 2, total: '412.000₫', status: 'Đang phục vụ' },
  { table: 'Bàn 12', items: 'Gà nướng · 4 người', qty: 5, total: '835.000₫', status: 'Chờ xác nhận' },
  { table: 'Bàn 03', items: 'Cá lăng nướng', qty: 3, total: '540.000₫', status: 'Đã thanh toán' },
];

function DashboardMock() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-[28px] bg-gradient-to-tr from-cerulean-blue-100 via-cerulean-blue-50 to-transparent opacity-70 blur-lg" />
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(30,64,175,0.12)]">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-cerulean-blue-50 px-2 py-0.5 text-[11px] font-semibold text-cerulean-blue-700">
              POS đang mở ca
            </span>
            <span className="text-[11px] font-medium text-slate-400">Ca 1 · 08:30</span>
          </div>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="hidden w-12 shrink-0 flex-col items-center gap-4 border-r border-slate-100 bg-slate-50/60 py-4 sm:flex">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cerulean-blue-600 text-white">
              <UtensilsCrossed className="h-3.5 w-3.5" />
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400">
              <Layers className="h-3.5 w-3.5" />
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400">
              <BarChart3 className="h-3.5 w-3.5" />
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400">
              <Users className="h-3.5 w-3.5" />
            </span>
          </div>

          {/* Main */}
          <div className="flex-1 p-4">
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-xl bg-cerulean-blue-50 p-3">
                <p className="text-[11px] text-cerulean-blue-700">Doanh thu hôm nay</p>
                <p className="mt-1 text-base font-extrabold text-cerulean-blue-700">4,2tr₫</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] text-slate-500">Đơn đang phục vụ</p>
                <p className="mt-1 text-base font-extrabold text-slate-800">12</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] text-slate-500">Điểm đã tích</p>
                <p className="mt-1 text-base font-extrabold text-slate-800">3.280</p>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {ORDERS.map((o) => (
                <div
                  key={o.table}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <Clock className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[12px] font-bold text-slate-800">
                        {o.table} · {o.items}
                      </p>
                      <p className="text-[11px] text-slate-400">{o.qty} món</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-extrabold text-slate-800">{o.total}</p>
                    <p
                      className={`text-[10px] font-semibold ${
                        o.status === 'Đã thanh toán' ? 'text-emerald-600' : 'text-cerulean-blue-600'
                      }`}
                    >
                      {o.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { openAuth } = useOutletContext<LandingAuthContext>();
  return (
    <div className="w-full min-h-screen">
      <main id="top">
        {/* ===== HERO ===== */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-32 right-0 h-[480px] w-[480px] rounded-full bg-cerulean-blue-50 blur-3xl" />
          <div className="pointer-events-none absolute -left-32 top-40 h-[360px] w-[360px] rounded-full bg-slate-50 blur-3xl" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-20">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Cột trái — text */}
              <div className="space-y-6">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cerulean-blue-200 bg-cerulean-blue-50 px-3 py-1 text-xs font-semibold text-cerulean-blue-700">
                  <Zap className="w-3.5 h-3.5" />
                  Nền tảng quản lý nhà hàng cho Việt Nam
                </span>
                <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight leading-[1.08] text-gray-900">
                  Vận hành nhà hàng của bạn trên một nền tảng duy nhất
                </h1>
                <p className="text-lg text-slate-600 leading-relaxed">
                  Menu số, gọi món bằng QR tại bàn, đặt bàn online, POS thu ngân, bếp số hoá và tích
                  điểm thành viên theo số điện thoại — đồng bộ cho mọi chi nhánh.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={() => openAuth('owner')}
                    className="h-11 px-6 bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white font-semibold"
                  >
                    Dùng thử miễn phí
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => openAuth('login')}
                    variant="outline"
                    className="h-11 px-6 font-semibold border-slate-200 bg-white text-slate-700"
                  >
                    Đăng nhập
                  </Button>
                </div>
                <ul className="space-y-2.5">
                  {[
                    'Không cần cài đặt, không phí thiết bị',
                    'Đồng bộ thời gian thực mọi chi nhánh',
                    'Phân quyền chủ — quản lý — nhân viên',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-slate-600">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600">
                        <Check className="w-3 h-3" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cột phải — mock dashboard */}
              <div>
                <DashboardMock />
              </div>
            </div>
          </div>
        </section>

        {/* ===== SOCIAL PROOF / STATS ===== */}
        <section className="border-y border-slate-100 bg-slate-50/60 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {STATS.map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-3xl sm:text-4xl font-extrabold text-cerulean-blue-700">
                    {s.value}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FEATURES ===== */}
        <section className="py-20 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center mb-14">
              <span className="text-xs font-bold uppercase tracking-widest text-cerulean-blue-600">
                Tính năng chính
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-2 text-gray-900">
                Mọi khâu từ tiếp khách đến bếp và thu ngân đều nằm trong cùng một hệ thống
              </h2>
              <p className="mt-4 text-slate-500 leading-relaxed">
                PosApp-style: mọi thao tác đều được chuẩn hoá, chống thất thoát và minh bạch dòng tiền.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:border-cerulean-blue-200 hover:shadow-[0_12px_40px_rgba(30,64,175,0.08)] hover:-translate-y-0.5"
                >
                  <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-cerulean-blue-50 text-cerulean-blue-600 mb-4 transition-colors group-hover:bg-cerulean-blue-600 group-hover:text-white">
                    <f.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-gray-900">{f.title}</h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== CÁCH HOẠT ĐỘNG ===== */}
        <section className="bg-slate-50/60 border-y border-slate-100 py-20 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center mb-14">
              <span className="text-xs font-bold uppercase tracking-widest text-cerulean-blue-600">
                Cách hoạt động
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-2 text-gray-900">
                Ba bước, không cần đào tạo phức tạp
              </h2>
            </div>
            <div className="relative grid sm:grid-cols-3 gap-6">
              <div className="hidden sm:block absolute top-10 left-16 right-16 border-t-2 border-dashed border-cerulean-blue-200" />
              {STEPS.map((s, i) => (
                <div key={i} className="relative rounded-2xl border border-slate-200 bg-white p-6 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cerulean-blue-600 text-white shadow-lg shadow-cerulean-blue-200">
                    <s.icon className="w-7 h-7" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight text-gray-900">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== TESTIMONIAL ===== */}
        <section className="py-20 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-br from-cerulean-blue-600 to-cerulean-blue-800 p-10 lg:p-14 text-white shadow-xl">
              <div className="flex items-center gap-1 mb-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-white fill-white" />
                ))}
              </div>
              <blockquote>
                <p className="text-xl sm:text-2xl font-medium leading-relaxed">
                  "Từ khi dùng gọi món QR, nhân viên tập trung phục vụ thay vì chạy ghi order. Bếp
                  nhận đơn ngay, khách quen được tặng điểm tự động."
                </p>
                <footer className="mt-6 flex items-center gap-3">
                  <span className="flex items-center justify-center w-11 h-11 rounded-full bg-white/20 text-white font-bold">
                    T
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Chị Thu Hà</p>
                    <p className="text-xs text-cerulean-blue-100">Chủ chuỗi 3 nhà hàng, TP.HCM</p>
                  </div>
                </footer>
              </blockquote>
            </div>
          </div>
        </section>

        {/* ===== ĐĂNG NHẬP NỘI BỘ ===== */}
        <section id="dang-nhap" className="py-20 lg:py-24 border-t border-slate-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              <div>
                <span className="inline-flex items-center gap-2 rounded-lg bg-cerulean-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-cerulean-blue-700">
                  <Store className="w-4 h-4" />
                  Dành cho đội ngũ nhà hàng
                </span>
                <h2 className="text-3xl font-bold tracking-tight mt-4 text-gray-900">
                  Đăng nhập nội bộ nhà hàng
                </h2>
                <p className="mt-3 text-slate-500 leading-relaxed">
                  Tài khoản chủ nhà hàng, quản lý và nhân viên đăng nhập tại đây. Hệ thống sẽ đưa bạn
                  đến đúng khu vực làm việc theo vai trò.
                </p>
                <ul className="mt-6 space-y-4">
                  {ROLES.map((r) => (
                    <li key={r} className="flex items-start gap-3 text-sm text-slate-600">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cerulean-blue-50 text-cerulean-blue-600">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                      {r}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <ShieldCheck className="w-5 h-5 text-cerulean-blue-600" />
                    <p className="mt-2 text-sm font-semibold text-gray-900">Bảo mật phân quyền</p>
                    <p className="text-xs text-slate-500">Log thao tác chi tiết</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <TrendingUp className="w-5 h-5 text-cerulean-blue-600" />
                    <p className="mt-2 text-sm font-semibold text-gray-900">Báo cáo Real-time</p>
                    <p className="text-xs text-slate-500">Hơn 120 nhà hàng đang vận hành</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:p-8 shadow-[0_8px_30px_rgba(30,64,175,0.06)]">
                <div className="flex flex-col items-center text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cerulean-blue-50 text-cerulean-blue-600">
                    <Lock className="w-7 h-7" />
                  </span>
                  <h3 className="mt-4 text-xl font-bold tracking-tight text-gray-900">
                    Bắt đầu ngay
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                    Đăng nhập để vào khu vực làm việc của bạn, hoặc đăng ký chủ nhà hàng để dùng thử
                    miễn phí 30 ngày.
                  </p>
                  <div className="mt-6 w-full space-y-3">
                    <Button
                      onClick={() => openAuth('login')}
                      className="w-full h-11 bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white font-semibold"
                    >
                      <LogIn className="w-4 h-4" />
                      Đăng nhập
                    </Button>
                    <Button
                      onClick={() => openAuth('owner')}
                      variant="outline"
                      className="w-full h-11 font-semibold border-slate-200 bg-white text-slate-700"
                    >
                      Đăng ký chủ nhà hàng
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
