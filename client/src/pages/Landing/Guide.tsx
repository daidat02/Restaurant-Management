import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, animate } from 'motion/react';
import {
  QrCode,
  Store,
  ArrowRight,
  ClipboardList,
  CheckCircle2,
  Compass,
  Zap,
  LifeBuoy,
} from 'lucide-react';

const STEPS = [
  {
    num: '01',
    icon: Store,
    title: 'Tạo tài khoản nhà hàng',
    desc: 'Đăng ký chủ nhà hàng, lựa chọn gói phù hợp. Hệ thống tự động đưa bạn vào trình hướng dẫn tạo nhà hàng đầu tiên.',
    time: '5 phút',
  },
  {
    num: '02',
    icon: ClipboardList,
    title: 'Nhập menu và nhân sự',
    desc: 'Thêm danh mục món, giá, ảnh và món hết hàng. Tạo tài khoản cho quản lý và nhân viên thu ngân, phục vụ.',
    time: '15 phút',
  },
  {
    num: '03',
    icon: QrCode,
    title: 'Gắn QR và mở bán',
    desc: 'In mã QR dán từng bàn, khách quét mở menu ngay. Bật KDS cho bếp và tiến hành phục vụ khách đầu tiên.',
    time: '5 phút',
  },
];

const CHECKLIST = [
  'Tạo tài khoản chủ nhà hàng (đăng ký miễn phí 30 ngày)',
  'Tạo nhà hàng/chi nhánh đầu tiên qua trình hướng dẫn',
  'Nhập danh mục & món ăn (hình ảnh, giá, mô tả)',
  'Tạo tài khoản quản lý và nhân viên',
  'Thiết lập bàn, khu vực và mã QR tại bàn',
  'Kết nối màn hình bếp (KDS) và máy in',
  'Kiểm thử quét QR gọi món và thanh toán',
  'Chạy thử ca phục vụ thực tế',
];

const STATS = [
  { value: '5 phút', label: 'để mở bán một chi nhánh mới' },
  { value: '30 phút', label: 'để vận hành đầy đủ tính năng' },
  { value: '24/7', label: 'hỗ trợ triển khai từ xa' },
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

export default function GuidePage() {
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
            <Compass className="h-3.5 w-3.5" />
            Hướng dẫn triển khai
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            className="mx-auto mt-4 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight text-gray-900 sm:text-5xl"
          >
            Mở bán chỉ trong 30 phút, không cần cài đặt
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.16 }}
            className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-600"
          >
            Giao diện thân thiện kết hợp tài liệu trực quan giúp nhân viên mới thành thạo nhanh chóng.
            Chúng tôi đồng hành hỗ trợ triển khai từ xa hoặc trực tiếp.
          </motion.p>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-slate-50/60 py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {STATS.map((s) => (
                <div key={s.label} className="flex items-center justify-center gap-3 text-center sm:justify-start">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cerulean-blue-50 text-cerulean-blue-600">
                    <Zap className="h-5 w-5" />
                  </span>
                  <div className="text-left">
                    <CountUp
                      value={s.value}
                      className="block text-2xl font-extrabold text-cerulean-blue-700"
                    />
                    <p className="text-sm text-slate-500">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* STEPS */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-cerulean-blue-600">
                Quy trình triển khai
              </span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Ba bước đi từ chưa có gì đến bán được ngay
              </h2>
              <p className="mt-4 leading-relaxed text-slate-500">
                Không cần kỹ thuật viên, không cần cài đặt phần mềm. Mỗi bước đều có đội ngũ hỗ trợ kèm
                cặp.
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
                  <span className="text-4xl font-extrabold tracking-tight text-slate-100">{s.num}</span>
                </div>
                <h2 className="mt-4 text-lg font-semibold tracking-tight text-gray-900">{s.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{s.desc}</p>
                <span className="mt-4 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  {s.time}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CHECKLIST */}
      <section className="border-y border-slate-100 bg-slate-50/60 py-16 lg:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mb-10 text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-cerulean-blue-600">
                Checklist
              </span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                Checklist khi bắt đầu
              </h2>
              <p className="mt-2 text-slate-500">Theo dõi từng bước để nhà hàng sẵn sàng phục vụ.</p>
            </div>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2">
            {CHECKLIST.map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: (i % 2) * 0.08 }}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-cerulean-blue-200"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <span className="text-sm text-slate-700">{item}</span>
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
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                <LifeBuoy className="h-7 w-7" />
              </span>
              <h2 className="mx-auto mt-4 max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">
                Cần hỗ trợ triển khai?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-cerulean-blue-100">
                Đội ngũ của chúng tôi sẵn sàng đồng hành thiết lập dữ liệu, đào tạo nhân viên và kết nối
                thiết bị. Liên hệ để được tư vấn 1-1.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/contact"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-6 font-semibold text-cerulean-blue-700 transition hover:bg-cerulean-blue-50"
                >
                  Liên hệ hỗ trợ
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-white/30 px-6 font-semibold text-white transition hover:bg-white/10"
                >
                  Xem bảng giá
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
