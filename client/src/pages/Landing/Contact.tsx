import React, { useState } from 'react';
import { Headset, Mail, MapPin, Phone, Send, CheckCircle2, CircleAlert } from 'lucide-react';

const CONTACTS = [
  { icon: Phone, title: 'Hotline hỗ trợ', value: '1900 xxxx', desc: '8h30 - 22h00 các ngày, kể cả Lễ Tết' },
  { icon: Mail, title: 'Email', value: 'hotro@nhahangos.vn', desc: 'Phản hồi trong vòng 24h làm việc' },
  { icon: MapPin, title: 'Trụ sở', value: 'TP. Hồ Chí Minh', desc: 'Phục vụ khách hàng toàn quốc' },
];

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
    <div className="pb-20">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-slate-100">
        <div className="pointer-events-none absolute -top-32 right-0 h-[400px] w-[400px] rounded-full bg-cerulean-blue-50 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cerulean-blue-200 bg-cerulean-blue-50 px-3 py-1 text-xs font-semibold text-cerulean-blue-700">
            <Headset className="w-3.5 h-3.5" />
            Liên hệ hỗ trợ
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.08] text-gray-900">
            Chúng tôi sẵn sàng đồng hành cùng bạn
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 leading-relaxed">
            Gửi yêu cầu tư vấn triển khai hoặc hỗ trợ kỹ thuật, đội ngũ của chúng tôi sẽ liên hệ lại
            với bạn sớm nhất.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* CONTACT CARDS */}
          <div className="grid sm:grid-cols-3 gap-5 mb-14">
            {CONTACTS.map((c) => (
              <div key={c.title} className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cerulean-blue-50 text-cerulean-blue-600">
                  <c.icon className="w-6 h-6" />
                </span>
                <h2 className="mt-4 text-base font-semibold text-gray-900">{c.title}</h2>
                <p className="mt-1 font-bold text-cerulean-blue-700">{c.value}</p>
                <p className="mt-1 text-xs text-slate-500">{c.desc}</p>
              </div>
            ))}
          </div>

          {/* FORM */}
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-[0_8px_30px_rgba(30,64,175,0.06)]">
            {sent ? (
              <div className="flex flex-col items-center text-center py-10">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="w-8 h-8" />
                </span>
                <h2 className="mt-4 text-xl font-bold tracking-tight text-gray-900">Đã gửi yêu cầu</h2>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                  Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi trong thời gian sớm nhất.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-900">Họ và tên</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cerulean-blue-500 focus:ring-1 focus:ring-cerulean-blue-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-900">Số điện thoại</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0123456789"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cerulean-blue-500 focus:ring-1 focus:ring-cerulean-blue-500"
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
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cerulean-blue-500 focus:ring-1 focus:ring-cerulean-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-900">Nội dung</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Mô tả nhu cầu tư vấn hoặc vấn đề cần hỗ trợ..."
                    rows={5}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cerulean-blue-500 focus:ring-1 focus:ring-cerulean-blue-500"
                  />
                </div>
                {errorMsg && (
                  <div className="flex items-center gap-2 text-sm text-red-500">
                    <CircleAlert className="w-4 h-4" />
                    <span>{errorMsg}</span>
                  </div>
                )}
                <button
                  type="submit"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cerulean-blue-600 font-semibold text-white hover:bg-cerulean-blue-700 transition"
                >
                  <Send className="w-4 h-4" />
                  Gửi yêu cầu
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}