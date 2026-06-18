import { useEffect, useState } from 'react';
import ProductCard from './components/product-card';
import { useMenu } from '@/hooks/use-menu';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAppSelector } from '@/hooks/redux-hook';

export default function MenuPage() {
  const { restaurantSelected } = useAppSelector((state) => state.restaurant);
  const { categories, items, fetchCategories, fetchAllItems, fetchItemsByCat } = useMenu();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchParams, setSearchParams] = useSearchParams();
  // EFFECT 1: Gọi API lấy danh mục động từ Backend khi vào trang
  useEffect(() => {
    if (restaurantSelected) {
      fetchCategories(restaurantSelected || '');
    }
    const cat = searchParams.get('catId');
    if (cat) {
      setActiveTab(cat);
      fetchItemsByCat(cat);
    }
  }, [fetchCategories]);

  useEffect(() => {
    if (activeTab === 'all') {
      fetchAllItems(restaurantSelected || '');
    } else {
      fetchItemsByCat(activeTab);
    }
  }, [activeTab, fetchAllItems, fetchItemsByCat]);

  // CHỖ XỬ LÝ CHÍNH: Tự động chèn thêm danh mục "Tất Cả Món" vào đầu mảng categories động
  // SỬA LẠI ĐOẠN NÀY: Đảm bảo luôn luôn có phần tử 'all' ở đầu mảng
  const menuTabs = [
    { _id: 'all', name: 'Tất Cả Món' },
    ...(categories || []), // Nếu categories chưa có dữ liệu, nó sẽ bung một mảng rỗng và không bị crash
  ];

  return (
    <div className="w-full min-h-screen pb-24 pt-8">
      <div className="max-w-7xl mx-auto px-6 md:px-16">
        {/* TIÊU ĐỀ TRANG */}
        <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
            Thực Đơn Quán NhamNhi
          </h1>
          <p className="text-sm text-gray-400">
            Hội tụ tinh hoa mồi bén, lẩu ngọt nướng thơm ngon chuẩn vị mộc mạc cho cuộc vui thăng
            hoa.
          </p>
        </div>

        {/* THANH BỘ LỌC ĐỘNG ĐÃ ĐƯỢC CHÈN "TẤT CẢ MÓN" */}
        <div className="flex justify-start md:justify-start items-center gap-2 overflow-x-auto pb-4 mb-10 no-scrollbar">
          {menuTabs.map((cat: any) => (
            <button
              key={cat._id || cat.id}
              onClick={() => setActiveTab(cat._id || cat.id)}
              className={`whitespace-nowrap px-5 py-2.5 rounded-full text-xs font-bold tracking-wide border transition-all duration-200 active:scale-95 ${
                activeTab === (cat._id || cat.id)
                  ? 'bg-[#1a1a1a] border-[#1a1a1a] text-white shadow-md'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* LƯỚI SẢN PHẨM */}
        {items && items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {items.map((item) => (
              <ProductCard key={item._id} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
            <p className="text-gray-400 text-sm font-medium">
              Hiện tại nhóm danh mục này đang được cập nhật món ăn!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
