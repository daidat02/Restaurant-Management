import { Star, MessageSquareText } from 'lucide-react';

/**
 * Section Đánh giá khách hàng — CHƯA CÓ BACKEND (model Review chưa tồn tại).
 * Dựng UI + dữ liệu MẪU để xem trước thiết kế, CHỈ render khi chạy môi trường dev
 * (import.meta.env.DEV). Production build trả về null → không bao giờ hiện số liệu giả.
 */
const MOCK_REVIEWS = [
  {
    id: 'r1',
    customer: 'Nguyễn Văn A',
    rating: 5,
    comment: 'Món ngon, phục vụ nhanh, sẽ quay lại!',
    dishName: 'Cơm tấm sườn',
    date: '22/08/2026',
  },
  {
    id: 'r2',
    customer: 'Trần Thị B',
    rating: 4,
    comment: 'Không gian đẹp nhưng hơi chờ lâu lúc cao điểm.',
    dishName: 'Phở bò',
    date: '21/08/2026',
  },
  {
    id: 'r3',
    customer: 'Lê Hoàng C',
    rating: 5,
    comment: 'Cà phê sữa đá đậm vị, giá hợp lý.',
    dishName: 'Cà phê sữa đá',
    date: '20/08/2026',
  },
];

export function ReviewsPlaceholder() {
  // Production: ẩn hoàn toàn section này cho đến khi có backend Review thật.
  if (!import.meta.env.DEV) return null;

  const avgRating =
    MOCK_REVIEWS.reduce((s, r) => s + r.rating, 0) / Math.max(MOCK_REVIEWS.length, 1);

  return (
    <div className="rounded-2xl border border-dashed border-amber-300/70 bg-amber-50/30 p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <MessageSquareText size={16} />
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-900">Đánh giá khách hàng</h3>
            <p className="text-xs text-slate-400">
              Sắp ra mắt — dữ liệu bên dưới chỉ là bản mẫu xem trước giao diện
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">
          Dev preview
        </span>
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-amber-200/60">
        <span className="text-3xl font-bold text-slate-900">{avgRating.toFixed(1)}</span>
        <div>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={14}
                className={
                  i < Math.round(avgRating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-300'
                }
              />
            ))}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">Điểm trung bình · {MOCK_REVIEWS.length} đánh giá</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {MOCK_REVIEWS.map((r) => (
          <div key={r.id} className="rounded-xl bg-white p-4 ring-1 ring-slate-100">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-800">{r.customer}</span>
              <span className="text-[11px] text-slate-400">{r.date}</span>
            </div>
            <div className="mt-1 flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={12}
                  className={i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                />
              ))}
              <span className="ml-2 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                {r.dishName}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-600">{r.comment}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-center text-[11px] italic text-slate-400">
        Dữ liệu mẫu (mock) — chỉ hiển thị trong môi trường dev, không dùng cho ra mắt.
      </p>
    </div>
  );
}
