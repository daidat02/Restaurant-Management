import { Link } from 'react-router-dom';
import { QrCode, Store, ArrowRight, ClipboardList, CheckCircle2, Headset } from 'lucide-react';

const STEPS = [
  {
    icon: Store,
    title: '1. Tạo tài khoản nhà hàng',
    desc: 'Đăng ký chủ nhà hàng, lựa chọn gói phù hợp. Hệ thống tự động đưa bạn vào trình hướng dẫn tạo nhà hàng đầu tiên.',
    time: '5 phút',
  },
  {
    icon: ClipboardList,
    title: '2. Nhập menu và nhân sự',
    desc: 'Thêm danh mục món, giá, ảnh và món hết hàng. Tạo tài khoản cho quản lý và nhân viên thu ngân, phục vụ.',
    time: '15 phút',
  },
  {
    icon: QrCode,
    title: '3. Gắn QR và mở bán',
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

export default function GuidePage() {
  return (
    <div className="pb-20">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-slate-100">
        <div className="pointer-events-none absolute -top-32 left-0 h-[400px] w-[400px] rounded-full bg-cerulean-blue-50 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cerulean-blue-200 bg-cerulean-blue-50 px-3 py-1 text-xs font-semibold text-cerulean-blue-700">
            Hướng dẫn triển khai
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.08] text-gray-900">
            Mở bán chỉ trong 30 phút, không cần cài đặt
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 leading-relaxed">
            Giao diện thân thiện kết hợp tài liệu trực quan giúp nhân viên mới thành thạo nhanh chóng.
            Chúng tôi đồng hành hỗ trợ triển khai từ xa hoặc trực tiếp.
          </p>
        </div>
      </section>

      {/* STEPS */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative grid sm:grid-cols-3 gap-6">
            <div className="hidden sm:block absolute top-14 left-16 right-16 border-t-2 border-dashed border-cerulean-blue-200" />
            {STEPS.map((s) => (
              <div key={s.title} className="relative rounded-2xl border border-slate-200 bg-white p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cerulean-blue-600 text-white shadow-lg shadow-cerulean-blue-200">
                  <s.icon className="w-7 h-7" />
                </div>
                <h2 className="mt-4 text-lg font-semibold tracking-tight text-gray-900">{s.title}</h2>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">{s.desc}</p>
                <span className="mt-3 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  {s.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CHECKLIST */}
      <section className="bg-slate-50/60 border-y border-slate-100 py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Checklist khi bắt đầu</h2>
            <p className="mt-2 text-slate-500">Theo dõi từng bước để nhà hàng sẵn sàng phục vụ.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {CHECKLIST.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
                <span className="text-sm text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-cerulean-blue-600 to-cerulean-blue-800 p-10 lg:p-14 text-white text-center shadow-xl">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
              <Headset className="w-7 h-7" />
            </span>
            <h2 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight">Cần hỗ trợ triển khai?</h2>
            <p className="mx-auto mt-3 max-w-xl text-cerulean-blue-100 leading-relaxed">
              Đội ngũ của chúng tôi sẵn sàng đồng hành thiết lập dữ liệu, đào tạo nhân viên và kết nối
              thiết bị. Liên hệ để được tư vấn 1-1.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/contact"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-6 font-semibold text-cerulean-blue-700 hover:bg-cerulean-blue-50 transition"
              >
                Liên hệ hỗ trợ
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/pricing"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/30 px-6 font-semibold text-white hover:bg-white/10 transition"
              >
                Xem bảng giá
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}