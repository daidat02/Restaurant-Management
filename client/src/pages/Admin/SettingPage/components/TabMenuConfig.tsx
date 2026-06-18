import type { IMenuCategory } from '@/types/category.type';

export const TabMenuConfig = ({
  list,
  onToggle,
  onOpenCreateModal,
}: {
  list: IMenuCategory[];
  onToggle: (id: string) => void;
  onOpenCreateModal: () => void;
}) => {
  return (
    <div className="animate-fade-in h-full">
      <div className="lg:col-span-3 flex flex-col min-w-0">
        <div className="mb-3 flex items-center justify-between">
          {/* Khối bên trái: Tiêu đề danh mục và dòng hướng dẫn nằm ngay bên dưới */}
          <div className="space-y-0.5 text-left">
            <h4 className="text-sm font-bold text-slate-900">
              Danh mục thực đơn hiện tại ({list.length})
            </h4>
            <span className="text-[11px] text-slate-400 font-medium block">
              Bấm dòng để khóa/mở hoạt động của danh mục
            </span>
          </div>

          {/* Khối bên phải: Nút bấm dạng text link để mở modal thêm danh mục món ăn */}
          <button
            type="button"
            onClick={() => {
              // Gọi hàm mở modal thêm danh mục của bạn ở đây, ví dụ: setIsOpenAddCategory(true)
              onOpenCreateModal();
            }}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline active:text-blue-800 transition-all cursor-pointer pt-0.5"
          >
            + Thêm danh mục
          </button>
        </div>

        <div className="flex-1 overflow-y-auto  custom-scrollbar">
          {list.map((category) => (
            <div
              key={category._id}
              onClick={() => onToggle(category._id)}
              className="flex items-center justify-between p-3 mb-2 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100/70 transition-all cursor-pointer group"
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-cerulean-blue-600 transition-colors">
                    {category.name}
                  </span>
                  <span className="text-[9px] font-mono bg-slate-200/60 text-slate-600 px-1.5 py-0.5 rounded-md">
                    {`APPETIZER`}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1">
                  Số lượng món hiện tại:{' '}
                  <b className="text-slate-700 font-medium">{category.foodCount} món ăn</b>
                </span>
              </div>

              {/* <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                  category.status === 'active'
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}
              >
                {category.status === 'active' ? 'Đang áp dụng' : 'Tạm ẩn'}
              </span> */}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
