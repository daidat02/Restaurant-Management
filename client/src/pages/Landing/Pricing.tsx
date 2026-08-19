import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
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
  Crown,
  Receipt,
  type LucideIcon,
} from 'lucide-react';

import { getPricing } from '@/api/subscription.api';
import type { IPlan, IPricingConfig } from '@/types/subscription.type';
import type { LandingAuthContext } from './LandingLayout';

const fmtVND = (n: number) => `${n.toLocaleString('vi-VN')}đ`;

/** Icon từng gói theo plan.key — API không trả icon nên map cứng + fallback. */
const PLAN_ICONS: Record<string, LucideIcon> = {
  free: Store,
  basic: Building2,
  pro: Sparkles,
  enterprise: Crown,
};

const getPlanIcon = (key?: string): LucideIcon => PLAN_ICONS[key ?? ''] ?? Receipt;

/** % tiết kiệm khi trả theo 12 tháng so với trả theo tháng. */
const annualSaving = (p: IPlan): number => {
  const monthly = p.cycles['1'] ?? 0;
  const yearly = p.cycles['12'] ?? 0;
  if (!monthly || !yearly) return 0;
  return Math.max(0, Math.round((1 - yearly / 12 / monthly) * 100));
};

/** So sánh chi tiết — hard-code như bản đầu (cột: Khởi đầu / Nâng cao / Phát triển PRO). */
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

/** Cột header của bảng so sánh — hard-code như bản đầu. */
const COMPARISON_COLUMNS: { name: string; highlight: boolean }[] = [
  { name: 'Khởi đầu', highlight: false },
  { name: 'Nâng cao', highlight: true },
  { name: 'Phát triển PRO', highlight: false },
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

function PlansGridSkeleton() {
  return (
    <div className="mt-10 grid gap-4 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-5 w-28 animate-pulse rounded-md bg-slate-100" />
          </div>
          <div className="mt-4 h-3 w-3/4 animate-pulse rounded-md bg-slate-100" />
          <div className="mt-6 h-9 w-32 animate-pulse rounded-lg bg-slate-100" />
          <div className="mt-6 space-y-3">
            {[0, 1, 2].map((j) => (
              <div key={j} className="h-4 animate-pulse rounded-md bg-slate-100" />
            ))}
          </div>
          <div className="mt-8 h-11 w-full animate-pulse rounded-xl bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export default function PricingPage() {
  const { openAuth } = useOutletContext<LandingAuthContext>();
  const [pricing, setPricing] = useState<IPricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');

  const loadPricing = useCallback(() => {
    getPricing()
      .then((config) => {
        setPricing(config);
        setError('');
      })
      .catch((err: unknown) => {
        const msg =
          err &&
          typeof err === 'object' &&
          'message' in err &&
          typeof (err as { message?: unknown }).message === 'string'
            ? (err as { message: string }).message
            : 'Không thể tải bảng giá. Vui lòng thử lại.';
        setError(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const retry = () => {
    setError('');
    setLoading(true);
    loadPricing();
  };

  useEffect(() => {
    loadPricing();
  }, [loadPricing]);

  const plans = pricing?.plans ?? [];
  const cycleKey = billing === 'monthly' ? '1' : '12';
  const cyclePeriod = billing === 'monthly' ? '/1 tháng' : '/12 tháng';
  const representativeSaving = plans.reduce((best, p) => Math.max(best, annualSaving(p)), 0);

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

          {/* Toggle chu kỳ */}
          <div className="mt-12 flex flex-col items-center gap-3">
            <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setBilling('monthly')}
                className={`cursor-pointer rounded-full px-5 py-2 text-sm font-semibold transition ${
                  billing === 'monthly'
                    ? 'bg-white text-cerulean-blue-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                1 tháng
              </button>
              <button
                type="button"
                onClick={() => setBilling('yearly')}
                className={`cursor-pointer rounded-full px-5 py-2 text-sm font-semibold transition ${
                  billing === 'yearly'
                    ? 'bg-white text-cerulean-blue-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                12 tháng
              </button>
            </div>
            {billing === 'yearly' && representativeSaving > 0 && (
              <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <CalendarClock className="h-4 w-4" />
                Thanh toán theo 12 tháng tiết kiệm {representativeSaving}% so với trả theo tháng
              </p>
            )}
          </div>

          {loading ? (
            <PlansGridSkeleton />
          ) : error ? (
            <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <p className="text-sm text-slate-500">{error}</p>
              <button
                type="button"
                onClick={retry}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-cerulean-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-cerulean-blue-700"
              >
                Thử lại
              </button>
            </div>
          ) : plans.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
              Chưa có gói dịch vụ nào được cấu hình.
            </div>
          ) : (
            <div className="mt-10 grid gap-4 lg:grid-cols-4">
              {plans.map((p, i) => {
                const highlight = p.isPopular;
                const price = p.cycles[cycleKey] ?? 0;
                const Icon = getPlanIcon(p.key);
                const saving = billing === 'yearly' ? annualSaving(p) : 0;
                return (
                  <motion.div
                    key={p.key}
                    initial={{ opacity: 0, y: 28 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.12 }}
                    className={`relative flex flex-col rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 ${
                      highlight
                        ? 'border-cerulean-blue-600 bg-gradient-to-br from-cerulean-blue-600 to-cerulean-blue-800 text-white shadow-2xl lg:-translate-y-2 lg:hover:-translate-y-3'
                        : 'border-slate-200 bg-white hover:shadow-[0_16px_40px_rgba(30,64,175,0.08)]'
                    }`}
                  >
                    {p.badge && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1 text-[11px] font-bold text-cerulean-blue-700 shadow">
                        {p.badge}
                      </span>
                    )}

                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          highlight ? 'bg-white/15 text-white' : 'bg-cerulean-blue-50 text-cerulean-blue-600'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <h2 className={`truncate text-base font-bold tracking-tight ${highlight ? 'text-white' : 'text-gray-900'}`}>
                        {p.name}
                      </h2>
                    </div>

                    <p className={`mt-2.5 line-clamp-2 min-h-[2rem] text-xs leading-relaxed ${highlight ? 'text-cerulean-blue-100' : 'text-slate-500'}`}>
                      {p.description}
                    </p>

                    <div className="mt-4 flex flex-wrap items-end gap-x-2 gap-y-1">
                      {p.contactOnly ? (
                        <span className={`text-3xl font-extrabold tracking-tight ${highlight ? 'text-white' : 'text-gray-900'}`}>
                          Liên hệ
                        </span>
                      ) : price === 0 ? (
                        <span className={`text-3xl font-extrabold tracking-tight ${highlight ? 'text-white' : 'text-gray-900'}`}>
                          Miễn phí
                        </span>
                      ) : (
                        <>
                          <span className={`text-3xl font-extrabold tracking-tight ${highlight ? 'text-white' : 'text-gray-900'}`}>
                            {fmtVND(price)}
                          </span>
                          <span className={`pb-1 text-xs ${highlight ? 'text-cerulean-blue-200' : 'text-slate-400'}`}>
                            {cyclePeriod}
                          </span>
                        </>
                      )}
                    </div>
                    {saving > 0 && !p.contactOnly && (
                      <p className={`mt-1 text-[11px] font-medium ${highlight ? 'text-emerald-200' : 'text-emerald-600'}`}>
                        Tiết kiệm {saving}% so với trả theo tháng
                      </p>
                    )}

                    <ul className="mt-4 flex-1 space-y-2">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs">
                          <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                              highlight ? 'bg-white/15 text-white' : 'bg-emerald-100 text-emerald-600'
                            }`}
                          >
                            <Check className="h-2.5 w-2.5" />
                          </span>
                          <span className={highlight ? 'text-white' : 'text-slate-600'}>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-5">
                      {p.contactOnly ? (
                        <Link
                          to="/contact"
                          className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
                            highlight
                              ? 'bg-white text-cerulean-blue-700 hover:bg-cerulean-blue-50'
                              : 'bg-cerulean-blue-600 text-white hover:bg-cerulean-blue-700'
                          }`}
                        >
                          Liên hệ tư vấn
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openAuth('owner')}
                          className={`inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
                            highlight
                              ? 'bg-white text-cerulean-blue-700 hover:bg-cerulean-blue-50'
                              : 'bg-cerulean-blue-600 text-white hover:bg-cerulean-blue-700'
                          }`}
                        >
                          Chọn gói này
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

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
                {COMPARISON_COLUMNS.map((c) => (
                  <p
                    key={c.name}
                    className={`text-center text-sm font-bold ${c.highlight ? 'text-cerulean-blue-600' : 'text-gray-900'}`}
                  >
                    {c.name}
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
                <button
                  type="button"
                  onClick={() => openAuth('owner')}
                  className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-7 font-bold text-cerulean-blue-700 transition hover:bg-cerulean-blue-50"
                >
                  Chọn gói này
                  <ArrowRight className="h-4 w-4" />
                </button>
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
        className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left"
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