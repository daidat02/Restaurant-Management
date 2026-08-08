import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { motion, useInView, animate } from 'motion/react';
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
  Sparkles,
  Radio,
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
    num: '01',
    icon: QrCode,
    title: 'Khách quét QR tại bàn',
    desc: 'Mỗi bàn có mã riêng, menu mở ngay trên trình duyệt điện thoại, không cần cài đặt.',
  },
  {
    num: '02',
    icon: Zap,
    title: 'Gọi món & bếp nhận ngay',
    desc: 'Đơn chạy thẳng vào POS và màn hình bếp, nhân viên chỉ cần xác nhận để bắt tay chế biến.',
  },
  {
    num: '03',
    icon: Star,
    title: 'Thanh toán & tích điểm',
    desc: 'Thanh toán tại bàn hoặc quầy, điểm thành viên cộng theo số điện thoại.',
  },
];

const STATS = [
  { value: '12+', label: 'nhà hàng đang vận hành thực tế' },
  { value: '5 phút', label: 'để mở bán một chi nhánh mới' },
  { value: '-32%', label: 'thời gian chờ gọi món' },
  { value: '+18%', label: 'giá trị hoá đơn trung bình' },
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

const LIVE_ORDERS = [
  { table: 'Bàn 07', items: 'Lẩu Thái Hải Sản · 2', total: '412.000₫', tag: 'vừa đặt' },
  { table: 'Bàn 05', items: 'Gỏi cuốn · 3', total: '120.000₫', tag: 'đang chế biến' },
  { table: 'Bàn 12', items: 'Gà nướng · 5', total: '835.000₫', tag: 'chờ xác nhận' },
];

const TESTIMONIALS = [
  {
    quote:
      'Từ khi dùng gọi món QR, nhân viên tập trung phục vụ thay vì chạy ghi order. Bếp nhận đơn ngay, khách quen được tặng điểm tự động.',
    name: 'Chị Thu Hà',
    role: 'Chủ chuỗi 3 nhà hàng, TP.HCM',
    result: '+32% doanh thu',
  },
  {
    quote:
      'Mở chi nhánh mới chỉ mất một buổi tối. Nhập menu, tạo bàn, in QR là bán được ngay hôm sau.',
    name: 'Anh Minh Đức',
    role: 'Chủ quán lẩu, Hà Nội',
    result: 'Mở bán trong 5 phút',
  },
  {
    quote:
      'KDS giúp bếp hết cảnh chạy giấy. Món nào trễ hiện đỏ rõ ràng, khách không còn phàn nàn chờ lâu.',
    name: 'Anh Quốc Bảo',
    role: 'Quản lý nhà hàng hải sản, Đà Nẵng',
    result: '-40% phàn nàn chờ món',
  },
];

function CountUp({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const match = value.match(/^([+-]?[\d.,]+)(.*)$/);
    if (!match) return;
    const sign = match[1].startsWith('-') ? '-' : '';
    const isPlus = match[1].startsWith('+');
    const numStr = match[1].replace(/[+-]/, '');
    const target = parseFloat(numStr.replace(',', '.'));
    const suffix = match[2];
    const decimals = numStr.includes('.') ? 1 : 0;
    const controls = animate(0, target, {
      duration: 1.6,
      ease: 'easeOut',
      onUpdate: (v) => {
        if (ref.current) {
          const prefix = sign ? '-' : isPlus ? '+' : '';
          ref.current.textContent = prefix + v.toFixed(decimals).replace('.', ',') + suffix;
        }
      },
    });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}

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

function DashboardMock() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-[28px] bg-gradient-to-tr from-cerulean-blue-100 via-cerulean-blue-50 to-transparent opacity-70 blur-lg" />
      {/* Browser frame */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(30,64,175,0.15)]">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="hidden items-center gap-1.5 rounded-md bg-white px-3 py-1 text-[11px] font-medium text-slate-400 sm:flex">
            <Lock className="h-3 w-3" /> nhahang.os/quan-ly
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

/** Mini mockup cho các màn hình làm việc — tham khảo "kho giao diện" của Uweb */
function ScreenCard({ name, desc, children }: { name: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-cerulean-blue-200 hover:shadow-[0_16px_40px_rgba(30,64,175,0.1)]">
      <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/60 p-3">{children}</div>
      <h3 className="mt-4 text-base font-bold tracking-tight text-gray-900">{name}</h3>
      <p className="mt-1 text-sm text-slate-500">{desc}</p>
    </div>
  );
}

/** Mockup POS thu ngân mini */
function MockPOS() {
  const tables = [
    { n: 'B01', s: 'trống' },
    { n: 'B02', s: 'đang dùng' },
    { n: 'B03', s: 'đang dùng' },
    { n: 'B04', s: 'trống' },
    { n: 'B05', s: 'đang dùng' },
    { n: 'B06', s: 'đã đặt' },
  ];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between pb-1">
        <p className="text-[10px] font-bold text-slate-600">Sơ đồ bàn</p>
        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
          Đang mở ca
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {tables.map((t) => (
          <div
            key={t.n}
            className={`flex flex-col items-center rounded-lg py-1.5 ${
              t.s === 'trống'
                ? 'bg-slate-100 text-slate-500'
                : t.s === 'đã đặt'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-cerulean-blue-600 text-white'
            }`}
          >
            <span className="text-[10px] font-bold">{t.n}</span>
            <span className="text-[8px] opacity-80">{t.s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Mockup KDS (bếp) mini */
function MockKDS() {
  const dishes = [
    { name: 'Lẩu Thái', qty: 2, time: '2 phút' },
    { name: 'Gà nướng', qty: 1, time: '5 phút' },
    { name: 'Cá lăng', qty: 1, time: '8 phút' },
  ];
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold text-slate-600">Màn hình bếp · KDS</p>
      {dishes.map((d) => (
        <div
          key={d.name}
          className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-2 py-1.5"
        >
          <div>
            <p className="text-[10px] font-bold text-slate-700">
              {d.name} × {d.qty}
            </p>
            <p className="text-[8px] text-emerald-600">{d.time}</p>
          </div>
          <span className="rounded bg-cerulean-blue-50 px-1.5 py-0.5 text-[8px] font-semibold text-cerulean-blue-700">
            Chế biến
          </span>
        </div>
      ))}
    </div>
  );
}

/** Mockup menu số mini */
function MockMenu() {
  const items = [
    { name: 'Lẩu Thái Hải Sản', price: '420K' },
    { name: 'Gà nướng mật ong', price: '280K' },
    { name: 'Cá lăng nướng', price: '540K' },
    { name: 'Gỏi cuốn tôm', price: '90K' },
  ];
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold text-slate-600">Menu số · cập nhật realtime</p>
      {items.map((it) => (
        <div key={it.name} className="flex items-center justify-between rounded-lg bg-white px-2 py-1.5 border border-slate-100">
          <span className="text-[10px] font-medium text-slate-700">{it.name}</span>
          <span className="text-[9px] font-bold text-cerulean-blue-600">{it.price}</span>
        </div>
      ))}
    </div>
  );
}

/** Mockup báo cáo mini */
function MockReport() {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold text-slate-600">Doanh thu theo ngày</p>
      <div className="flex h-24 items-end gap-1.5">
        {[35, 55, 40, 70, 60, 85, 100].map((h, i) => (
          <div key={i} className="flex-1 rounded-t-md bg-cerulean-blue-600/80 transition-all group-hover:bg-cerulean-blue-600" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="flex justify-between text-[8px] text-slate-400">
        <span>T2</span>
        <span>T3</span>
        <span>T4</span>
        <span>T5</span>
        <span>T6</span>
        <span>T7</span>
        <span>CN</span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { openAuth } = useOutletContext<LandingAuthContext>();

  return (
    <div className="w-full min-h-screen overflow-x-hidden">
      <main id="top">
        {/* ===== HERO ===== */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-32 right-0 h-[480px] w-[480px] rounded-full bg-cerulean-blue-50 blur-3xl" />
          <div className="pointer-events-none absolute -left-32 top-40 h-[360px] w-[360px] rounded-full bg-slate-50 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8 lg:pb-24 lg:pt-20">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              {/* Cột trái — text */}
              <div className="space-y-6">
                <motion.span
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-cerulean-blue-200 bg-cerulean-blue-50 px-3 py-1 text-xs font-semibold text-cerulean-blue-700"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Nền tảng quản lý nhà hàng cho Việt Nam
                </motion.span>
                <motion.h1
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
                  className="text-4xl font-extrabold leading-[1.08] tracking-tight text-gray-900 sm:text-5xl lg:text-[54px]"
                >
                  Vận hành nhà hàng của bạn{' '}
                  <span className="bg-gradient-to-r from-cerulean-blue-600 to-cerulean-blue-400 bg-clip-text text-transparent">
                    trên một nền tảng
                  </span>{' '}
                  duy nhất
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.16 }}
                  className="text-lg leading-relaxed text-slate-600"
                >
                  Menu số, gọi món bằng QR tại bàn, đặt bàn online, POS thu ngân, bếp số hoá và tích
                  điểm thành viên theo số điện thoại — đồng bộ cho mọi chi nhánh.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.24 }}
                  className="flex flex-wrap items-center gap-3"
                >
                  <Button
                    onClick={() => openAuth('owner')}
                    className="h-11 bg-cerulean-blue-600 px-6 font-semibold text-white hover:bg-cerulean-blue-700"
                  >
                    Dùng thử miễn phí 30 ngày
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => openAuth('login')}
                    variant="outline"
                    className="h-11 border-slate-200 bg-white px-6 font-semibold text-slate-700"
                  >
                    Đăng nhập
                  </Button>
                </motion.div>
                <motion.ul
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.32 }}
                  className="space-y-2.5"
                >
                  {[
                    'Không cần cài đặt, không phí thiết bị',
                    'Đồng bộ thời gian thực mọi chi nhánh',
                    'Phân quyền chủ — quản lý — nhân viên',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-slate-600">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <Check className="h-3 w-3" />
                      </span>
                      {item}
                    </li>
                  ))}
                </motion.ul>
              </div>

              {/* Cột phải — mock dashboard */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              >
                <DashboardMock />
              </motion.div>
            </div>
          </div>
        </section>

        {/* ===== SOCIAL PROOF / STATS ===== */}
        <section className="border-y border-slate-100 bg-slate-50/60 py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
                {STATS.map((s) => (
                  <div key={s.label} className="text-center">
                    <CountUp
                      value={s.value}
                      className="text-3xl font-extrabold text-cerulean-blue-700 sm:text-4xl"
                    />
                    <p className="mt-1 text-sm text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===== CÁCH HOẠT ĐỘNG ===== */}
        <section className="py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="mx-auto mb-14 max-w-2xl text-center">
                <span className="text-xs font-bold uppercase tracking-widest text-cerulean-blue-600">
                  Cách hoạt động
                </span>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  Ba bước, không cần đào tạo phức tạp
                </h2>
                <p className="mt-4 leading-relaxed text-slate-500">
                  Không cài đặt, không hợp đồng, không cần kỹ thuật viên. Bạn chỉ cần biết mình bán
                  món gì.
                </p>
              </div>
            </Reveal>
            <div className="grid gap-6 sm:grid-cols-3">
              {STEPS.map((s, i) => (
                <motion.div
                  key={s.num}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.12 }}
                  className="relative rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-cerulean-blue-200 hover:shadow-[0_12px_40px_rgba(30,64,175,0.08)]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cerulean-blue-600 text-white shadow-lg shadow-cerulean-blue-200">
                      <s.icon className="h-7 w-7" />
                    </div>
                    <span className="text-4xl font-extrabold tracking-tight text-slate-100">
                      {s.num}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight text-gray-900">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== MÀN HÌNH LÀM VIỆC (kho giao diện) ===== */}
        <section className="border-y border-slate-100 bg-slate-50/60 py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="mx-auto mb-14 max-w-2xl text-center">
                <span className="text-xs font-bold uppercase tracking-widest text-cerulean-blue-600">
                  Kho màn hình
                </span>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  Mọi vai trò có màn hình làm việc riêng
                </h2>
                <p className="mt-4 leading-relaxed text-slate-500">
                  Từ thu ngân tới bếp, từ quản lý tới khách hàng — mỗi người thấy đúng việc của mình.
                </p>
              </div>
            </Reveal>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { name: 'POS thu ngân', desc: 'Sơ đồ bàn, tách/gộp hoá đơn, chốt ca.', el: <MockPOS /> },
                { name: 'Bếp số hoá KDS', desc: 'Phiếu chế biến theo trạm, ưu tiên món trễ.', el: <MockKDS /> },
                { name: 'Menu số', desc: 'Giá, ảnh, món hết hàng đồng bộ realtime.', el: <MockMenu /> },
                { name: 'Báo cáo doanh thu', desc: 'Thống kê theo ngày, chi nhánh, món bán chạy.', el: <MockReport /> },
              ].map((card, i) => (
                <motion.div
                  key={card.name}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: (i % 4) * 0.1 }}
                >
                  <ScreenCard name={card.name} desc={card.desc}>
                    {card.el}
                  </ScreenCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== TÍNH NĂNG ===== */}
        <section className="py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="mx-auto mb-14 max-w-2xl text-center">
                <span className="text-xs font-bold uppercase tracking-widest text-cerulean-blue-600">
                  Tính năng chính
                </span>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  Mọi khâu từ tiếp khách đến bếp và thu ngân đều nằm trong cùng một hệ thống
                </h2>
                <p className="mt-4 leading-relaxed text-slate-500">
                  Mọi thao tác đều được chuẩn hoá, chống thất thoát và minh bạch dòng tiền.
                </p>
              </div>
            </Reveal>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: (i % 3) * 0.1 }}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-cerulean-blue-200 hover:shadow-[0_12px_40px_rgba(30,64,175,0.08)]"
                >
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-cerulean-blue-50 text-cerulean-blue-600 transition-colors group-hover:bg-cerulean-blue-600 group-hover:text-white">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-gray-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== ĐỒNG BỘ THỜI GIAN THỰC (chat AI của Uweb) ===== */}
        <section className="border-y border-slate-100 bg-slate-50/60 py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <Reveal>
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cerulean-blue-200 bg-cerulean-blue-50 px-3 py-1 text-xs font-semibold text-cerulean-blue-700">
                    <Radio className="h-3.5 w-3.5" />
                    Đồng bộ thời gian thực
                  </span>
                  <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                    Đơn hàng từ bàn chạy thẳng về quầy và bếp
                  </h2>
                  <p className="mt-4 leading-relaxed text-slate-500">
                    Mọi sự kiện — gọi món, đặt bàn, thanh toán, cập nhật menu — được đẩy tức thì tới
                    đúng người cần xử lý. Khách không phải gọi, nhân viên không phải chạy.
                  </p>
                  <ul className="mt-6 space-y-3">
                    {ROLES.map((r) => (
                      <li key={r} className="flex items-start gap-3 text-sm text-slate-600">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cerulean-blue-50 text-cerulean-blue-600">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                <div className="absolute -inset-4 rounded-[28px] bg-gradient-to-bl from-emerald-100 via-cerulean-blue-50 to-transparent opacity-70 blur-lg" />
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(30,64,175,0.1)]">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      </span>
                      <p className="text-sm font-bold text-gray-900">Đơn mới tại bàn</p>
                    </div>
                    <span className="text-xs font-medium text-slate-400">Trực tuyến</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {LIVE_ORDERS.map((o, i) => (
                      <motion.div
                        key={o.table}
                        initial={{ opacity: 0, x: 24 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.15 }}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cerulean-blue-600 text-white">
                            <Store className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="text-sm font-bold text-gray-900">
                              {o.table} · {o.items}
                            </p>
                            <p className="text-xs text-slate-400">{o.total}</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-cerulean-blue-700 ring-1 ring-cerulean-blue-100">
                          {o.tag}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ===== TESTIMONIAL ===== */}
        <section className="py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="mx-auto mb-14 max-w-2xl text-center">
                <span className="text-xs font-bold uppercase tracking-widest text-cerulean-blue-600">
                  Khách hàng
                </span>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  Chủ nhà hàng Việt nói gì về NhàHàng OS
                </h2>
              </div>
            </Reveal>
            <div className="grid gap-5 md:grid-cols-3">
              {TESTIMONIALS.map((t, i) => (
                <motion.figure
                  key={t.name}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.12 }}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-cerulean-blue-200 hover:shadow-[0_16px_40px_rgba(30,64,175,0.08)]"
                >
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star key={idx} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-slate-600">
                    "{t.quote}"
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cerulean-blue-600 font-bold text-white">
                      {t.name.charAt(0)}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                      <p className="text-xs text-slate-400">{t.role}</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      {t.result}
                    </span>
                  </figcaption>
                </motion.figure>
              ))}
            </div>
          </div>
        </section>

        {/* ===== ĐĂNG NHẬP NỘI BỘ ===== */}
        <section id="dang-nhap" className="border-t border-slate-100 py-20 lg:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-start gap-12 lg:grid-cols-2">
              <Reveal>
                <div>
                  <span className="inline-flex items-center gap-2 rounded-lg bg-cerulean-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-cerulean-blue-700">
                    <Store className="h-4 w-4" />
                    Dành cho đội ngũ nhà hàng
                  </span>
                  <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
                    Đăng nhập nội bộ nhà hàng
                  </h2>
                  <p className="mt-3 leading-relaxed text-slate-500">
                    Tài khoản chủ nhà hàng, quản lý và nhân viên đăng nhập tại đây. Hệ thống sẽ đưa bạn
                    đến đúng khu vực làm việc theo vai trò.
                  </p>
                  <div className="mt-8 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                      <ShieldCheck className="h-5 w-5 text-cerulean-blue-600" />
                      <p className="mt-2 text-sm font-semibold text-gray-900">Bảo mật phân quyền</p>
                      <p className="text-xs text-slate-500">Log thao tác chi tiết</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                      <TrendingUp className="h-5 w-5 text-cerulean-blue-600" />
                      <p className="mt-2 text-sm font-semibold text-gray-900">Báo cáo real-time</p>
                      <p className="text-xs text-slate-500">Hơn 120 nhà hàng đang vận hành</p>
                    </div>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(30,64,175,0.06)] lg:p-8">
                  <div className="flex flex-col items-center text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cerulean-blue-50 text-cerulean-blue-600">
                      <Lock className="h-7 w-7" />
                    </span>
                    <h3 className="mt-4 text-xl font-bold tracking-tight text-gray-900">
                      Bắt đầu ngay
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                      Đăng nhập để vào khu vực làm việc của bạn, hoặc đăng ký chủ nhà hàng để dùng thử
                      miễn phí 30 ngày.
                    </p>
                    <div className="mt-6 w-full space-y-3">
                      <Button
                        onClick={() => openAuth('login')}
                        className="h-11 w-full bg-cerulean-blue-600 font-semibold text-white hover:bg-cerulean-blue-700"
                      >
                        <LogIn className="h-4 w-4" />
                        Đăng nhập
                      </Button>
                      <Button
                        onClick={() => openAuth('owner')}
                        variant="outline"
                        className="h-11 w-full border-slate-200 bg-white font-semibold text-slate-700"
                      >
                        Đăng ký chủ nhà hàng
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ===== CTA CUỐI (như Uweb) ===== */}
        <section className="pb-20 lg:pb-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cerulean-blue-600 to-cerulean-blue-800 px-8 py-12 text-center text-white shadow-xl lg:px-14 lg:py-16">
                <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                <Sparkles className="mx-auto h-10 w-10 text-cerulean-blue-100" />
                <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
                  Sẵn sàng đưa nhà hàng của bạn lên vận hành số?
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-cerulean-blue-100">
                  Tạo tài khoản miễn phí, mở bán chi nhánh đầu tiên trong 5 phút và bắt đầu nhận đơn
                  ngay hôm nay.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    onClick={() => openAuth('owner')}
                    className="h-12 bg-white px-7 font-bold text-cerulean-blue-700 hover:bg-cerulean-blue-50"
                  >
                    Bắt đầu miễn phí
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Link
                    to="/pricing"
                    className="inline-flex h-12 items-center justify-center rounded-xl border border-white/30 px-7 font-semibold text-white transition hover:bg-white/10"
                  >
                    Xem bảng giá
                  </Link>
                </div>
                <p className="mt-5 text-xs text-cerulean-blue-100">
                  Không cần thẻ tín dụng · Huỷ bất cứ lúc nào
                </p>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
    </div>
  );
}
