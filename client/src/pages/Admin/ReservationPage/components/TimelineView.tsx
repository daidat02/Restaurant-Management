import type { ITableTimeSlot } from '@/types/reservation.type';
import { Calendar, Users } from 'lucide-react';

// --- Component Giao Diện Sơ Đồ Dòng Thời Gian (Timeline) ---
interface TimelineViewProps {
  timeSlots: string[];
  tableTimeSlots: ITableTimeSlot[];
  onClickTimeSlot?: (
    tableId: string,
    tableNumber: number,
    timeSlot: string,
    isEmpty: boolean,
    reservedInfo?: any,
  ) => void;
}
export function TimelineView({ timeSlots, tableTimeSlots, onClickTimeSlot }: TimelineViewProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <Calendar size={18} className="text-indigo-500" /> Trạng thái sử dụng bàn theo khung giờ
        </h2>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[800px] p-5">
          {/* Header Giờ */}
          <div className="grid grid-cols-8 gap-3 mb-4 text-center border-b border-slate-100 pb-3">
            <div className="text-left font-semibold text-xs text-slate-400 uppercase tracking-wider">
              Vị trí bàn
            </div>
            {timeSlots.map((slot) => (
              <div
                key={slot}
                className="font-semibold text-xs bg-slate-50 text-slate-600 py-1.5 rounded-lg border border-slate-100"
              >
                {slot}
              </div>
            ))}
          </div>

          {/* Dòng các bàn */}
          <div className="space-y-3">
            {tableTimeSlots?.map((table) => (
              <div
                key={table?._id || Math.random()}
                className="grid grid-cols-8 gap-3 items-center border-b border-slate-50 pb-3 last:border-0 last:pb-0"
              >
                <div className="text-left">
                  <div className="font-medium text-sm text-slate-900">Bàn {table.tableNumber}</div>
                </div>

                {/* Các block giờ */}
                {timeSlots.map((slot) => {
                  const resInfo = table.reservedTimes?.[slot];

                  if (!resInfo) {
                    return (
                      <div
                        key={slot}
                        className="h-12 rounded-xl bg-slate-50/60 border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-300 hover:bg-indigo-50/30 hover:border-indigo-200 cursor-pointer transition-colors"
                        onClick={() =>
                          onClickTimeSlot &&
                          onClickTimeSlot(table._id, table.tableNumber, slot, true)
                        }
                      >
                        Trống
                      </div>
                    );
                  }

                  const isCancelled = resInfo?.status === 'cancelled';
                  const isConfirmed = resInfo?.status === 'confirmed';
                  const isCheckedIn = resInfo?.status === 'checked_in';
                  const isPending = resInfo?.status === 'pending';

                  return (
                    <div
                      onClick={() =>
                        onClickTimeSlot &&
                        onClickTimeSlot(table._id, table.tableNumber, slot, false, resInfo)
                      }
                      key={`${table._id}-${slot}`}
                      className={`h-12 p-1.5 rounded-xl border text-[11px] flex flex-col justify-between transition-shadow hover:shadow-sm cursor-pointer overflow-hidden
                          ${isCancelled ? 'bg-rose-50 border-rose-200 text-rose-800 line-through' : ''}
                          ${isConfirmed ? 'bg-sky-50/80 border-sky-200 text-sky-700' : ''}
                          ${isPending ? 'bg-amber-50 border-amber-200 text-amber-900 font-medium' : ''}
                          ${isCheckedIn ? 'bg-green-50 border-green-200 text-green-900 font-medium' : ''}

                          ${!isCancelled && !isConfirmed && !isPending && !isCheckedIn ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : ''}
                        `}
                    >
                      <div className="font-bold truncate">
                        {resInfo?.customerInfo?.name || 'Khách vãng lai'}
                      </div>
                      <div className="flex items-center justify-between text-[10px] opacity-80">
                        <span className="flex items-center gap-0.5 font-medium">
                          <Users size={10} /> {resInfo?.partySize}n
                        </span>
                        <span className="font-semibold">{resInfo?.reservationTime}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chú giải Footer của Timeline */}
      <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex gap-4 text-xs font-medium text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-indigo-100 border border-indigo-300 rounded"></span> Đã đặt /
          Chờ đến
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-emerald-100 border border-emerald-300 rounded"></span> Khách
          đang ngồi
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-slate-50 border border-dashed border-slate-300 rounded"></span>{' '}
          Giờ trống sẵn sàng
        </div>
      </div>
    </div>
  );
}
