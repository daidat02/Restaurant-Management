import React, { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { CustomInput } from '@/components/FormInput';
import { CustomTextarea } from '@/components/CustomTextArea';
interface FormAddCategoryProps {
  restaurantId: string; // ID của nhà hàng hiện tại
  onSuccess: (newCat: any) => void; // Callback xử lý sau khi tạo thành công (đóng modal, cập nhật state)
}

export const FormAddCategory = ({ restaurantId, onSuccess }: FormAddCategoryProps) => {
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Vui lòng nhập tên danh mục');
      return;
    }

    setIsSubmitting(true);
    try {
      // Cấu trúc dữ liệu gửi lên API theo đúng cấu trúc IMenuCategory
      const categoryData = {
        restaurant: restaurantId,
        name: name.trim(),
        description: description.trim() || undefined,
      };

      // Giả lập gọi API (Thế bằng hàm kết nối API thực tế của bạn tại đây)
      console.log('Dữ liệu tạo danh mục gửi lên Backend:', categoryData);

      // Giả lập phản hồi thành công từ server
      const mockNewCategory = {
        _id: Math.random().toString(),
        ...categoryData,
        foodCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Kích hoạt callback truyền dữ liệu ngược lên component cha
      onSuccess(mockNewCategory);

      // Reset form
      setName('');
      setDescription('');
    } catch (error) {
      console.error('Lỗi khi tạo danh mục:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4 bg-white text-left">
      {/* HEADER TẠO DANH MỤC */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
        <UtensilsCrossed size={16} className="text-blue-600" />
        <h4 className="text-sm font-bold text-slate-900">Tạo danh mục món ăn mới</h4>
      </div>

      {/* 🛠️ INPUT 1: TÊN DANH MỤC - SỬ DỤNG CUSTOM INPUT */}
      <CustomInput
        required
        type="text"
        label="Tên danh mục (Bắt buộc)"
        placeholder="Ví dụ: Món Khai Vị, Lẩu Đặc Sắc, Đồ Uống..."
        value={name}
        onChange={(e: any) => setName(e.target.value)}
      />

      {/* 🛠️ INPUT 2: MÔ TẢ DANH MỤC - SỬ DỤNG CUSTOM TEXTAREA */}
      <CustomTextarea
        label="Mô tả món ăn"
        placeholder="Nhập mô tả hấp dẫn về món ăn..."
        value={description}
        onChange={(e: any) => setDescription(e.target.value)}
      />

      {/* FOOTER NÚT BẤM */}
      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-4">
        <button
          type="button"
          onClick={() => onSuccess(null)}
          className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          Hủy bỏ
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-300 rounded-xl shadow-sm transition-colors cursor-pointer"
        >
          {isSubmitting ? 'Đang tạo...' : 'Xác nhận tạo'}
        </button>
      </div>
    </form>
  );
};
