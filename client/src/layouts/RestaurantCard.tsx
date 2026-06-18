import type { IRestaurant } from '@/types/restaurant.type';
import { ChevronRight, MapPin } from 'lucide-react';
import React from 'react';

interface RestaurantCardProps {
  restaurant: IRestaurant;
  isSelected?: boolean;
  onSelectRestaurant: (id: string) => void;

  // Custom Styles linh hoạt cho các mục đích khác nhau
  customStyles?: {
    // Style khi card ĐƯỢC CHỌN (Selected)
    selectedBorder?: string; // VD: 'border-orange-500' hoặc 'border-gray-900'
    selectedBg?: string; // VD: 'bg-orange-50/60' hoặc 'bg-gray-50'
    selectedShadow?: string; // VD: 'shadow-orange-100'
    selectedIconBg?: string; // VD: 'bg-orange-500'
    selectedBadgeBg?: string; // VD: 'bg-orange-500'

    // Style khi card Ở TRẠNG THÁI THƯỜNG (Unselected / Hover)
    hoverBorder?: string; // VD: 'hover:border-orange-200'
    hoverBg?: string; // VD: 'hover:bg-gray-50/80'
  };

  // Nút hoặc phần tử hiển thị bên phải (Mặc định là mũi tên ChevronRight)
  rightAction?: React.ReactNode;
}

const RestaurantCard = ({
  restaurant,
  isSelected = false,
  onSelectRestaurant,
  customStyles,
  rightAction,
}: RestaurantCardProps) => {
  // 1. Định nghĩa giá trị mặc định (Default cam/xám ban đầu của bạn) nếu không truyền customStyles
  const styles = {
    selectedBorder: customStyles?.selectedBorder || 'border-orange-500',
    selectedBg: customStyles?.selectedBg || 'bg-orange-50/60',
    selectedShadow: customStyles?.selectedShadow || 'shadow-orange-100',
    selectedIconBg: customStyles?.selectedIconBg || 'bg-orange-500',
    selectedBadgeBg: customStyles?.selectedBadgeBg || 'bg-orange-500',

    hoverBorder: customStyles?.hoverBorder || 'hover:border-orange-200',
    hoverBg: customStyles?.hoverBg || 'hover:bg-gray-50/80',
  };

  return (
    <div
      onClick={() => onSelectRestaurant(restaurant._id)}
      className={`group flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer text-left w-full
                  ${
                    isSelected
                      ? `${styles.selectedBorder} ${styles.selectedBg} shadow-md ${styles.selectedShadow}`
                      : `border-gray-100 bg-white ${styles.hoverBorder} ${styles.hoverBg} hover:shadow-sm`
                  }
                `}
    >
      <div className="flex items-start gap-3.5 flex-1 min-w-0">
        {/* Icon định vị */}
        <div
          className={`p-2.5 rounded-lg shrink-0 mt-0.5 transition-colors duration-200
                    ${isSelected ? `${styles.selectedIconBg} text-white` : 'bg-gray-100 text-gray-500 group-hover:bg-orange-100 group-hover:text-orange-600'}
                  `}
        >
          <MapPin className="w-5 h-5" />
        </div>

        {/* Thông tin nhà hàng */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-gray-800 text-base truncate group-hover:text-orange-600 transition-colors">
              {restaurant.name}
            </h4>
            {isSelected && (
              <span
                className={`text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${styles.selectedBadgeBg}`}
              >
                Đang chọn
              </span>
            )}
          </div>

          <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
            {restaurant.address || 'Chưa cập nhật địa chỉ'}
          </p>

          {restaurant.phone && (
            <p className="text-xs text-gray-400 font-medium">Hotline: {restaurant.phone}</p>
          )}
        </div>
      </div>

      {/* KHU VỰC XỬ LÝ NÚT BÊN PHẢI LINH HOẠT */}
      <div className="ml-4 shrink-0">
        {rightAction !== undefined ? (
          // Nếu có truyền custom nút/chữ bên phải thì render ra
          rightAction
        ) : (
          // Nếu không truyền gì, tự động dùng nút mũi tên mặc định của bạn
          <ChevronRight
            className={`w-5 h-5 transition-all duration-200 
                      ${isSelected ? 'text-orange-500 translate-x-0.5' : 'text-gray-300 group-hover:text-orange-500 group-hover:translate-x-1'}
                    `}
          />
        )}
      </div>
    </div>
  );
};

export default RestaurantCard;
