import React, { useState, useEffect } from 'react';
import { LayoutGrid } from 'lucide-react';
import type { ITable } from '@/types/table.type';
import { CustomSelect } from '@/components/SelectCustom';
import { CustomInput } from '@/components/FormInput'; // 🛠️ Import CustomInput vào đây

interface FormAddTableProps {
  restaurantId: string;
  onSuccess: () => void;
  onSubmit: (data: Partial<ITable>) => void;
  editData?: ITable | null;
}

const capacityOptions = [
  { value: '2', label: 'Bàn nhỏ (2 Chỗ)' },
  { value: '4', label: 'Bàn tiêu chuẩn (4 Chỗ)' },
  { value: '6', label: 'Bàn gia đình (6 Chỗ)' },
  { value: '8', label: 'Bàn VIP (8 Chỗ)' },
  { value: '12', label: 'Bàn tiệc lớn (12 Chỗ)' },
];

const statusOptions = [
  { value: 'available', label: 'Sẵn sàng phục vụ (Available)' },
  { value: 'inactive', label: 'Tạm dừng phục vụ (Inactive)' },
];

export const FormAddTable = ({
  restaurantId,
  onSuccess,
  onSubmit,
  editData,
}: FormAddTableProps) => {
  const isEdit = !!editData;

  // Quản lý state cục bộ cho form
  const [tableNumber, setTableNumber] = useState<string>('');
  const [capacity, setCapacity] = useState<string>('4');
  const [status, setStatus] = useState<string>('available');

  // Theo dõi và đổ dữ liệu cũ vào form khi mở chế độ Edit
  useEffect(() => {
    if (isEdit && editData) {
      setTableNumber(String(editData.tableNumber));
      setCapacity(String(editData.capacity));
      setStatus(editData.status);
    } else {
      setTableNumber('');
      setCapacity('4');
      setStatus('available');
    }
  }, [editData, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tableNumber || isNaN(Number(tableNumber))) {
      alert('Vui lòng nhập số bàn hợp lệ');
      return;
    }

    const tableData: Partial<ITable> = {
      restaurant: restaurantId,
      tableNumber: Number(tableNumber),
      capacity: Number(capacity),
      status: status as any,
    };

    onSubmit(tableData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4 bg-white text-left">
      {/* HEADER TẠO / SỬA BÀN */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
        <LayoutGrid size={16} className="text-blue-600" />
        <h4 className="text-sm font-bold text-slate-900">
          {isEdit
            ? `Chỉnh sửa thông tin bàn ${editData?.tableNumber}`
            : 'Nhập thông tin bàn ăn mới'}
        </h4>
      </div>

      {/* 🛠️ INPUT 1: SỐ BÀN - ĐÃ THAY BẰNG CUSTOM INPUT */}
      <CustomInput
        required
        type="text"
        pattern="[0-9]*"
        inputMode="numeric"
        label="Số hiệu bàn (Bắt buộc)"
        placeholder="Ví dụ: 10, 12, 25..."
        value={tableNumber}
        onChange={(e: any) => setTableNumber(e.target.value)}
      />

      {/* INPUT 2: SỨC CHỨA SỬ DỤNG CUSTOM SELECT */}
      <CustomSelect
        options={capacityOptions}
        value={capacity}
        label="Sức chứa (Số chỗ ngồi)"
        onChange={(val) => setCapacity(val)}
        className="w-full"
        triggerClass="!bg-white !border-slate-200 !rounded-xl !text-slate-800"
      />

      {/* INPUT 3: TRẠNG THÁI SỬ DỤNG CUSTOM SELECT */}
      <CustomSelect
        options={statusOptions}
        value={status}
        label="Trạng thái bàn"
        onChange={(val) => setStatus(val)}
        className="w-full"
        triggerClass="!bg-white !border-slate-200 !rounded-xl !text-slate-800"
      />

      {/* FOOTER NÚT BẤM HOÀN THÀNH */}
      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-4">
        <button
          type="button"
          onClick={onSuccess}
          className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          Hủy bỏ
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm transition-colors cursor-pointer"
        >
          {isEdit ? 'Cập nhật thông tin' : 'Xác nhận tạo bàn'}
        </button>
      </div>
    </form>
  );
};
