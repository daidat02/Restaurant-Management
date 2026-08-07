import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  Headset,
  Mail,
  MapPin,
  Phone,
  Send,
  CheckCircle2,
  CircleAlert,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

const CONTACTS = [
  { icon: Phone, title: 'Hotline hỗ trợ', value: '1900 xxxx', desc: '8h30 - 22h00 các ngày, kể cả Lễ Tết' },
  { icon: Mail, title: 'Email', value: 'hotro@nhahangos.vn', desc: 'Phản hồi trong vòng 24h làm việc' },
  { icon: MapPin, title: 'Trụ sở', value: 'TP. Hồ Chí Minh', desc: 'Phục vụ khách hàng toàn quốc' },
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

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!name || !email || !message) {
      setErrorMsg('Vui lòng nhập đầy đủ họ tên, email và nội dung.');
      return;
    }
    setSent(true);
  };

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
            <Headset className="h-3.5 w-3.5" />
            Liên hệ hỗ trợ
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            className="mx-auto mt-4 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight text-gray-900 sm:text-5xl"
          >
            Chúng tôi sẵn sàng đồng hành cùng bạn
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.16 }}
            className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-600"
          >
            Gửi yêu cầu tư vấn triển khai hoặc hỗ trợ kỹ thuật, đội ngũ của chúng tôi sẽ liên hệ lại
            với bạn sớm nhất.
          </motion.p>
        </div>
      </section>

      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* CONTACT CARDS */}
          <div className="mb-14 grid gap-5 sm:grid-cols-3">
            {CONTACTS.map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-cerulean-blue-200 hover:shadow-[0_16px_40px_rgba(30,64,175,0.08)]"
              >
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cerulean-blue-50 text-cerulean-blue-600">
                  <c.icon className="h-6 w-6" />
                </span>
                <h2 className="mt-4 text-base font-semibold text-gray-900">{c.title}</h2>
                <p className="mt-1 font-bold text-cerulean-blue-700">{c.value}</p>
                <p className="mt-1 text-xs text-slate-500">{c.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* FORM */}
          <Reveal>
            <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(30,64,175,0.06)] sm:p-10">
              {sent ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="h-8 w-8" />
                  </span>
                  <h2 className="mt-4 text-xl font-bold tracking-tight text-gray-900">Đã gửi yêu cầu</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi trong thời gian sớm nhất.
                  </p>
                  <Link
                    to="/"
                    className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-cerulean-blue-600 px-6 font-semibold text-white transition hover:bg-cerulean-blue-700"
                  >
                    Về trang chủ
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-900">Họ và tên</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-cerulean-blue-500 focus:ring-1 focus:ring-cerulean-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-900">Số điện thoại</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0123456789"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-cerulean-blue-500 focus:ring-1 focus:ring-cerulean-blue-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-900">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@gmail.com"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-cerulean-blue-500 focus:ring-1 focus:ring-cerulean-blue-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-900">Nội dung</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Mô tả nhu cầu tư vấn hoặc vấn đề cần hỗ trợ..."
                      rows={5}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-cerulean-blue-500 focus:ring-1 focus:ring-cerulean-blue-500"
                    />
                  </div>
                  {errorMsg && (
                    <div className="flex items-center gap-2 text-sm text-red-500">
                      <CircleAlert className="h-4 w-4" />
                      <span>{errorMsg}</span>
                    </div>
                  )}
                  <button
                    type="submit"
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cerulean-blue-600 font-semibold text-white transition hover:bg-cerulean-blue-700"
                  >
                    <Send className="h-4 w-4" />
                    Gửi yêu cầu
                  </button>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA CUỐI */}
      <section>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cerulean-blue-600 to-cerulean-blue-800 px-8 py-12 text-center text-white shadow-xl lg:px-14 lg:py-14">
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <Sparkles className="mx-auto h-9 w-9 text-cerulean-blue-100" />
              <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
                Chưa sẵn sàng liên hệ? Hãy khám phá trước
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-cerulean-blue-100">
                Xem cách hệ thống giúp nhà hàng vận hành, hoặc bắt đầu dùng thử miễn phí 30 ngày.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/guide"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-7 font-bold text-cerulean-blue-700 transition hover:bg-cerulean-blue-50"
                >
                  Xem hướng dẫn triển khai
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-white/30 px-7 font-semibold text-white transition hover:bg-white/10"
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
