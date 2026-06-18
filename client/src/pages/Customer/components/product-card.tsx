export interface Dish {
  id: number;
  name: string;
  category: string;
  price: string;
  img: string;
  time: string;
  people: string;
}

export interface Category {
  id: number;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  count: string;
}
import React from 'react';
import { Star, Clock, Users, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // 1. Import useNavigate
import type { IMenuItem } from '@/types/category.type';
import { extractId } from '@/utils/helpers';
import { useDispatch } from 'react-redux';
import { addToCart } from '@/redux/slices/cartSlice';

interface ProductCardProps {
  item: IMenuItem;
}

export default function ProductCard({ item }: ProductCardProps) {
  const navigate = useNavigate(); // 2. Khởi tạo hook điều hướng
  const dispatch = useDispatch();
  const defaultImage = 'https://placehold.co/400x300/f8f9fc/a3a8bf?text=No+Image';

  let displayImg = defaultImage;
  if (item.imageUrl && item.imageUrl.length > 0) {
    const firstImage = item.imageUrl[0];
    displayImg =
      typeof firstImage === 'string' ? firstImage : (firstImage as any).url || defaultImage;
  }

  // Hàm xử lý khi bấm vào vùng bao quanh card (Chuyển trang)
  const handleCardClick = () => {
    navigate(`/product/${item._id}`, { state: { item } }); // 3. Điều hướng đến trang chi tiết sản phẩm, truyền dữ liệu item qua state
  };

  // Hàm xử lý nút thả tim (Ngăn chặn chuyển trang ngoài ý muốn)
  const handleLikeClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Chặn hiện tượng loang sự kiện
    // Xử lý logic yêu thích sản phẩm của bạn ở đây...
    console.log('Thích món:', item.name);
  };

  // Hàm xử lý nút thêm món (Ngăn chặn chuyển trang ngoài ý muốn)
  const handleAddToCartClick = (e: React.MouseEvent<HTMLButtonElement>, food: IMenuItem) => {
    e.stopPropagation();
    dispatch(addToCart({ food }));
  };

  return (
    <div
      onClick={handleCardClick} // 3. Gắn sự kiện click cho toàn bộ thẻ cha
      className="bg-white rounded-[24px] p-3.5 border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_-6px_rgba(0,0,0,0.08)] hover:border-orange-100 transition-all duration-300 relative group cursor-pointer flex flex-col justify-between h-full"
    >
      <div>
        {/* Nút Thả tim tinh tế ẩn hiện */}
        <button
          onClick={handleLikeClick} // Gắn hàm xử lý đã bọc e.stopPropagation()
          className="absolute top-5 right-5 p-2 rounded-full bg-white/90 backdrop-blur-md text-gray-400 hover:text-red-500 hover:scale-105 transition-all shadow-sm z-10 sm:opacity-0 group-hover:opacity-100 duration-200"
        >
          <Heart className="w-4 h-4 stroke-[2]" />
        </button>

        {/* Khung Ảnh Món Ăn */}
        <div className="w-full h-44 rounded-[18px] overflow-hidden bg-gray-50 relative">
          <img
            src={displayImg}
            alt={item.name}
            className="w-full h-full object-cover transform group-hover:scale-103 transition-transform duration-500 ease-out"
          />
          <span className="absolute bottom-3 left-3 text-[10px] font-semibold text-gray-700 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm tracking-wide">
            {extractId(item.category, 'name')} {/* Hiển thị ID đã được trích xuất */}
          </span>
        </div>

        {/* Khối Thông Tin */}
        <div className="pt-4 px-1 space-y-2.5">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-bold text-gray-800 text-[15px] leading-snug tracking-tight group-hover:text-orange-500 transition-colors line-clamp-2 flex-1">
              {item.name}
            </h3>

            {/* Điểm Đánh Giá */}
            <div className="flex items-center gap-1 bg-amber-50/70 text-amber-700 px-1.5 py-0.5 rounded-md self-start flex-shrink-0">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              <span className="font-bold text-[11px]">4.9</span>
            </div>
          </div>

          {/* Thông số thời gian & khẩu phần */}
          <div className="flex items-center gap-4 text-[11px] text-gray-400 font-medium">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-300 stroke-[2]" />
              <span>15 Phút</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-gray-300 stroke-[2]" />
              <span>2-3 Người</span>
            </div>
          </div>
        </div>
      </div>

      {/* Khối Giá Tiền & CTA */}
      <div className="pt-4 mt-3 px-1 border-t border-gray-50 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
            Giá bán
          </span>
          <span className="text-[16px] font-black text-gray-900 tracking-tight">
            {item.price.toLocaleString('vi-VN')}đ
          </span>
        </div>

        <button
          onClick={(e) => handleAddToCartClick(e, item)} // Gắn hàm xử lý đã bọc e.stopPropagation()
          className="text-xs font-bold bg-[#1a1a1a] hover:bg-orange-500 text-white px-3.5 py-2 rounded-xl transition-all duration-200 shadow-sm active:scale-95"
        >
          + Thêm món
        </button>
      </div>
    </div>
  );
}
