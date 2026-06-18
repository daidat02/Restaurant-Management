import React, { use, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Star,
  Clock,
  Users,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  ArrowLeft,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import ProductCard from './components/product-card';
import { useMenu } from '@/hooks/use-menu';
import { extractId } from '@/utils/helpers';
import { useDispatch } from 'react-redux';
import { addToCart } from '@/redux/slices/cartSlice';
import type { IMenuItem } from '@/types/category.type';

export default function ProductDetailPage() {
  const { currentItem, items, fetchItemById, fetchItemsByCat } = useMenu();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { id } = useParams<{ id: string }>(); // Lấy ID món ăn từ URL

  const [quantity, setQuantity] = useState<number>(1);
  const [note, setNote] = useState<string>('');
  const [isLiked, setIsLiked] = useState<boolean>(false);

  // State quản lý danh sách món liên quan đã được xáo trộn ngẫu nhiên
  const [randomRelated, setRandomRelated] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        console.warn('Không tìm thấy thông tin món ăn. Vui lòng quay lại trang thực đơn.');
        return;
      }
      const result = await fetchItemById(id);
      if (result) {
        fetchItemsByCat(extractId(result?.category, '_id') || '');
      }
    };

    fetchData();
  }, [fetchItemById, fetchItemsByCat, id]);

  // CHỖ THAY ĐỔI: Chạy logic lấy ngẫu nhiên 4 món khi danh sách 'items' từ hook thay đổi hoặc khi đổi món khác
  useEffect(() => {
    if (items && items.length > 0 && currentItem) {
      // 1. Loại bỏ món ăn hiện tại đang xem ra khỏi danh sách gợi ý
      const filtered = items.filter((item) => item._id !== currentItem._id);

      // 2. Thuật toán xáo trộn mảng ngẫu nhiên (Fisher-Yates Shuffle)
      const shuffled = [...filtered];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      // 3. Cắt lấy tối đa 4 món ngon ngẫu nhiên
      setRandomRelated(shuffled.slice(0, 4));
    } else {
      setRandomRelated([]);
    }
  }, [items, currentItem]);

  const defaultImage = 'https://placehold.co/400x300/f8f9fc/a3a8bf?text=No+Image';

  let displayImg = defaultImage;
  if (currentItem?.imageUrl && currentItem?.imageUrl.length > 0) {
    const firstImage = currentItem?.imageUrl[0];
    displayImg =
      typeof firstImage === 'string' ? firstImage : (firstImage as any).url || defaultImage;
  }

  if (!currentItem) {
    return (
      <div className="w-full min-h-[70vh] flex flex-col items-center justify-center px-4">
        <p className="text-gray-500 font-medium mb-4">
          Món ăn này hiện chưa có trên hệ thống hoặc đã dừng bán.
        </p>
        <button
          onClick={() => navigate('/menu')}
          className="flex items-center gap-2 text-sm font-bold bg-[#1a1a1a] text-white px-5 py-2.5 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại thực đơn
        </button>
      </div>
    );
  }
  const handleAddToCartClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    food: IMenuItem,
    quantity: number,
  ) => {
    e.stopPropagation();

    dispatch(addToCart({ food, quantity }));
  };

  // Tăng giảm số lượng đặt món
  const handleIncrease = () => setQuantity((prev) => prev + 1);
  const handleDecrease = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  return (
    <div className="w-full min-h-screen pb-24 pt-4">
      <div className="max-w-7xl mx-auto px-6 md:px-16">
        {/* NÚT BACK TIỆN LỢI */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 mb-8 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-0.5 transition-transform" />
          <span>Quay lại</span>
        </button>

        {/* KHỐI NỘI DUNG CHÍNH (ẢNH BÊN TRÁI - THÔNG TIN BÊN PHẢI) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* KHỐI TRÁI: HÌNH ẢNH SẢN PHẨM */}
          <div className="lg:col-span-5 relative group">
            <div className="w-full aspect-square rounded-[32px] overflow-hidden bg-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border-4 border-white">
              <img
                src={displayImg}
                alt={currentItem.name}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
              />
            </div>

            <span className="absolute top-6 left-6 text-xs font-bold text-gray-700 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm">
              {extractId(currentItem.category, 'name')}
            </span>
          </div>

          {/* KHỐI PHẢI: CHI TIẾT GIÁ - ĐẶT MÓN */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-black text-gray-950 tracking-tight leading-tight">
                {currentItem.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg font-bold">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span>4.9</span>
                  <span className="text-gray-400 font-normal text-xs">(120+ đánh giá)</span>
                </div>

                <div className="h-4 w-[1px] bg-gray-200 hidden sm:block" />

                <div className="flex items-center gap-1.5 text-gray-500 font-medium">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>Chuẩn bị: {'15-20 phút'}</span>
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            <div className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
              <div className="space-y-0.5">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                  Giá niêm yết
                </span>
                <p className="text-3xl font-black text-orange-600 tracking-tight">
                  {Number(currentItem.price).toLocaleString('vi-VN')} đ
                </p>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 text-gray-600 px-3 py-2 rounded-xl text-xs font-semibold">
                <Users className="w-4 h-4 text-orange-500/80" />
                <span>Định lượng: {'1 người ăn'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Mô tả hương vị
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed font-light">
                {currentItem.description ||
                  `Món ${currentItem.name} được bếp trưởng Quán NhamNhi tẩm ướp kỳ công theo công thức độc bản...`}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-gray-400" />
                Ghi chú cho nhà bếp (Nếu có)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: Không bỏ hành lá, làm cay vừa, xin thêm nước chấm..."
                className="w-full text-sm rounded-xl border border-gray-200 px-4 py-3 outline-none bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-gray-700 placeholder:text-gray-400 transition-all"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
              <div className="flex items-center justify-between border border-gray-200 bg-white rounded-xl p-1.5 min-w-[130px]">
                <button
                  onClick={handleDecrease}
                  className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-bold text-sm text-gray-800 w-8 text-center">{quantity}</span>
                <button
                  onClick={handleIncrease}
                  className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={(e) => handleAddToCartClick(e, currentItem, quantity)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#1a1a1a] hover:bg-orange-500 text-white font-bold text-sm py-4 px-6 transition-all shadow-md"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Thêm Vào Giỏ Hàng</span>
              </button>

              <button
                onClick={() => setIsLiked(!isLiked)}
                className={`p-4 rounded-xl border transition-all ${isLiked ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-gray-200 text-gray-400'}`}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500' : ''}`} />
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/40">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>
                NhamNhi cam kết món ăn được chế biến từ thực phẩm sạch 100%, không chất bảo quản.
              </span>
            </div>
          </div>
        </div>

        {/* CHỔ THAY ĐỔI: Render danh sách randomRelated đã được giới hạn tối đa 4 món */}
        {randomRelated.length > 0 && (
          <section className="mt-8 border-t border-gray-100 pt-16">
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                Có Thể Bạn Sẽ Thích
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Những gợi ý mồi ngon cùng danh mục vừa miệng không kém
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {randomRelated.map((item) => (
                <ProductCard key={item._id} item={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
