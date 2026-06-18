import type { ITable } from '@/types/table.type';

// --- COMPONENT CON 1: DANH SÁCH BÀN ---
interface TableListProps {
  tables: ITable[];
  onSelectTable: (table: ITable) => void;
  onOpenModal: () => void;
}

export const TableList = ({ tables, onSelectTable, onOpenModal }: TableListProps) => (
  <div className="flex flex-col ">
    <div className="mb-3 flex items-center justify-between">
      {/* Khối bên trái: Tiêu đề và dòng hướng dẫn nằm ngay bên dưới */}
      <div className="space-y-0.5 text-left">
        <h4 className="text-sm font-bold text-slate-900">
          Danh sách bàn hiện tại ({tables.length})
        </h4>
        <span className="text-[11px] text-slate-400 font-medium block">
          Bấm dòng để khóa/mở hoạt động của bàn
        </span>
      </div>

      {/* Khối bên phải: Nút bấm dạng text link để mở modal thêm bàn */}
      <button
        type="button"
        onClick={() => onOpenModal()}
        className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline active:text-blue-800 transition-all cursor-pointer pt-0.5"
      >
        + Thêm bàn mới
      </button>
    </div>
    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
      {tables.map((table) => (
        <div
          key={table._id}
          onClick={() => onSelectTable(table)}
          className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100/70 transition-all cursor-pointer group"
        >
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-900 group-hover:text-cerulean-blue-600 transition-colors">
              Bàn số {table.tableNumber}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">
              Khu vực: {`Ngoài trời`} | Ghế: {table.capacity} chỗ
            </span>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
              table.status !== 'inactive'
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}
          >
            {table.status !== 'inactive' ? 'Sẵn sàng' : 'Tạm khóa'}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export const TabTables = ({
  list,
  onSelect,
  onOpenCreateModal,
}: {
  list: ITable[];
  onSelect: (table: ITable) => void;
  onOpenCreateModal: () => void;
}) => {
  return (
    <div className="animate-fade-in h-full">
      <div className="lg:col-span-3">
        <TableList
          tables={list}
          onSelectTable={(table) => onSelect(table)}
          onOpenModal={() => onOpenCreateModal()}
        />
      </div>
    </div>
  );
};
