import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Utensils } from 'lucide-react';
import baner_nhamnhi from '@/assets/baner_nhamnhi.png';
import { useNavigate } from 'react-router-dom';

const SLIDE_IMAGES = [
  {
    id: 1,
    url: 'https://images.unsplash.com/photo-1625398407796-82650a8c135f?auto=format&fit=crop&q=80&w=1200', // Ảnh lẩu/nướng tôm hùm ấm cúng
    title: 'Món Ngon Chuẩn Vị Mẹ Nấu',
    desc: 'Đậm đà hương vị truyền thống từ những nguyên liệu tươi ngon nhất trong ngày.',
  },
  {
    id: 2,
    url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=1200', // Ảnh các món kho, xào mộc mạc
    title: 'Mồi Bén Cho Cuộc Vui Trọn Vẹn',
    desc: 'Thực đơn nhậu lai rai phong phú, không gian lý tưởng để tụ họp gia đình và bạn bè.',
  },
  {
    id: 3,
    url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=1200', // Ảnh thịt nướng xèo xèo hấp dẫn
    title: 'Không Gian Ấm Cúng & Thư Giãn',
    desc: 'Gác lại âu lo, cùng ngồi lại nhâm nhi những món ăn ngon bên chén rượu nồng.',
  },
];

export default function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDE_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const next = () => setCurrent((prev) => (prev + 1) % SLIDE_IMAGES.length);
  const prev = () => setCurrent((prev) => (prev - 1 + SLIDE_IMAGES.length) % SLIDE_IMAGES.length);

  return (
    <section className="max-w-7xl mx-auto px-6 md:px-16 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center overflow-hidden">
      {/* KHỐI TRÁI: TEXT MÔ TẢ ĐẬM CHẤT QUÁN ĂN */}
      <div className="lg:col-span-6 space-y-6">
        <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full">
          <Utensils className="w-3.5 h-3.5" />
          Tinh Hoa Ẩm Thực Việt
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-[1.15]">
          Món ngon <span className="text-orange-500">đậm đà</span> <br />
          Bén mồi <span className="text-amber-600">lai rai</span> <br />
          Sánh đôi cuộc vui
        </h1>

        <p className="text-base sm:text-lg text-gray-600 font-light leading-relaxed max-w-xl">
          Tại <strong className="font-semibold text-gray-900">NhamNhi</strong>, chúng tôi mang đến
          những mâm cơm nhà thân thuộc và những món nhậu đặc sản ba miền thơm ngon nức mũi. Không
          gian rộng rãi, bình dị là nơi hoàn hảo để bạn cùng người thân yêu "nhâm nhi" trọn vẹn từng
          khoảnh khắc.
        </p>

        <div className="flex gap-4 pt-2">
          <button
            onClick={() => navigate('/menu')}
            className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-orange-600 active:scale-95 shadow-md shadow-orange-500/10"
          >
            Xem thực đơn ngay
          </button>
          <button
            onClick={() => navigate('/reservation')}
            className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-95"
          >
            Liên hệ đặt bàn
          </button>
        </div>
      </div>

      {/* CHỖ SỬA CHÍNH: Thay đổi 'justify-start' sang 'justify-center' để khối này căn giữa hoàn hảo khi ở Mobile */}
      <div className="lg:col-span-6 relative w-full h-[350px] sm:h-[450px] flex items-center justify-center">
        {/* Tinh chỉnh lại tọa độ đốm sáng blur để cân bằng khi slider nằm giữa */}
        <div className="absolute left-4 sm:left-10 top-10 w-24 h-24 bg-orange-100 rounded-full blur-2xl opacity-70" />
        <div className="absolute right-4 sm:right-16 bottom-4 w-36 h-36 bg-amber-100 rounded-full blur-3xl opacity-60" />

        {/* Khung ảnh chạy chính (đặt chiều rộng chiếm 85% trên PC, tự động giãn lên 100% trên Mobile để ảnh to rõ nét) */}
        <div className="relative w-full sm:w-[85%] h-full rounded-3xl overflow-hidden shadow-xl border-4 border-white">
          {SLIDE_IMAGES.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 w-full h-full transition-all duration-700 ease-in-out ${
                index === current
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-105 pointer-events-none'
              }`}
            >
              <img src={slide.url} alt={slide.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

              <div className="absolute bottom-6 left-6 right-6 text-white space-y-1">
                <h3 className="text-lg font-bold tracking-wide text-amber-400">{slide.title}</h3>
                <p className="text-xs text-gray-200 font-light line-clamp-2">{slide.desc}</p>
              </div>
            </div>
          ))}

          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white text-gray-800 shadow transition-all active:scale-90"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white text-gray-800 shadow transition-all active:scale-90"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Ảnh preview bên cạnh (Chỉ hiển thị trên màn hình sm trở lên nhờ class 'hidden sm:block') */}
        <div className="absolute right-[-40px] w-[12%] h-[85%] rounded-l-2xl overflow-hidden opacity-25 shadow border-y border-l border-white hidden sm:block">
          <img
            src={SLIDE_IMAGES[(current + 1) % SLIDE_IMAGES.length].url}
            alt="Next preview"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}
