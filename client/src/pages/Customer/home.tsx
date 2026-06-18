import React, { useEffect } from 'react';
import HeroSlider from './components/slider'; // Điều chỉnh lại đường dẫn file slider của bạn
import ProductCard from './components/product-card';
import { Flame, Layers, Beer, Soup } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMenu } from '@/hooks/use-menu';
import { useAppSelector } from '@/hooks/redux-hook';

export default function HomePage() {
  const { categories, items, fetchCategories, fetchTopBestSellers } = useMenu();
  const { restaurantSelected } = useAppSelector((state) => state.restaurant);

  useEffect(() => {
    if (restaurantSelected) {
      fetchCategories(restaurantSelected || '');
      fetchTopBestSellers(restaurantSelected || '');
    }
  }, [fetchCategories, fetchTopBestSellers, restaurantSelected]);

  const navigate = useNavigate();

  return (
    <div className="w-full pb-20">
      <HeroSlider />

      {/* SECTION 2: DANH MỤC THỰC ĐƠN QUÁN */}
      <section className="max-w-7xl mx-auto px-6 md:px-16 mt-8">
        <div className="flex flex-col mb-8">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Hôm Nay Nhâm Nhi Gì?</h2>
          <p className="text-sm text-gray-500">Chọn nhanh nhóm món ăn yêu thích của bạn</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {categories.map((cat) => {
            const IconComponent = Soup;
            return (
              <div
                onClick={() => navigate(`menu?catId=${cat._id}`)}
                key={cat._id}
                className="group flex flex-col items-center justify-center p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-orange-200 transition-all cursor-pointer text-center"
              >
                <div className="p-3 bg-orange-50 rounded-xl text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors mb-3">
                  <IconComponent className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-xs text-gray-800 group-hover:text-orange-600 transition-colors">
                  {cat.name}
                </h3>
                {/* <span className="text-xs text-gray-400 mt-1">{cat.count}</span> */}
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: DANH SÁCH SẢN PHẨM */}
      <section className="max-w-7xl mx-auto px-6 md:px-16 mt-20">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              Món Ngon Bán Chạy Nhất
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Những hương vị làm nên tên tuổi độc bản tại Quán NhamNhi
            </p>
          </div>
          <button
            onClick={() => navigate('/menu')}
            className="text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-1 group/btn"
          >
            Xem toàn bộ menu
            <span className="transform group-hover/btn:translate-x-1 transition-transform">
              &rarr;
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <ProductCard key={item._id} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
