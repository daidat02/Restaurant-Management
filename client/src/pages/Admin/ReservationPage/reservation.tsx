import React, { useState, useMemo, useEffect } from 'react';
import { Search, Grid, List } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { extractId, generateTimeSlots } from '@/utils/helpers';
import { useReservation } from '@/hooks/use-reservation';

import type { ITable } from '@/types/table.type';
import type { IReservation } from '@/types/reservation.type';

// 🌟 Import các Custom Component dùng chung đồng bộ toàn hệ thống
import { CustomDatePicker } from '@/components/DatePickerCustom';
import { CustomSelect } from '@/components/SelectCustom';
import { format } from 'date-fns';
import TimeSlotModal from './components/TimeSlotModal';
import { FilterToolbar } from '../OrderPage/management-order';
import { TimelineView } from './components/TimelineView';
import { ListView } from './components/ListView';

export default function ReservationPage() {
  const { user } = useAuth();
  const {
    tableTimeSlots,
    reservations,
    fetchTableTimeSlots,
    fetchReservationsByRestaurant,
    addReservationByStaff,
    editReservation,
  } = useReservation();

  const [isLoading, setIsLoading] = useState<boolean | false>(false);

  // Bộ lọc & Chế độ xem giao diện
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Partial<ITable> | null>(null);
  const [reservedInfo, setReservedInfo] = useState<IReservation | null>(null);
  const [selectedSlot, setSelectedSlot] = useState({
    timeSlot: '',
    isEmpty: true,
    date: '',
  });

  const restaurantConfig = {
    openHours: '15:00',
    closeHours: '22:00',
  };

  // 🌟 Định dạng danh sách các options trạng thái đặt bàn cho CustomSelect
  const statusOptions = useMemo(
    () => [
      { value: '', label: 'Tất cả trạng thái' },
      { value: 'confirmed', label: 'Đã xác nhận' },
      { value: 'pending', label: 'Chờ xử lý' },
      { value: 'completed', label: 'Đã nhận bàn' },
      { value: 'cancelled', label: 'Đã huỷ' },
    ],
    [],
  );

  const DYNAMIC_TIME_SLOTS = useMemo(() => {
    return generateTimeSlots(restaurantConfig.openHours, restaurantConfig.closeHours);
  }, [restaurantConfig.openHours, restaurantConfig.closeHours]);

  useEffect(() => {
    const fetchSlots = async () => {
      await fetchTableTimeSlots(extractId(user?.restaurant), selectedDate);
      setIsLoading(true);
      await fetchReservationsByRestaurant(extractId(user?.restaurant), selectedDate, statusFilter);
      setIsLoading(false);
    };
    fetchSlots();
  }, [user?.restaurant, selectedDate, statusFilter]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8">
        <TimeSlotModal
          isOpen={isDialogOpen}
          onChangeTimeSlotModal={() => setIsDialogOpen(false)}
          slotInfo={selectedSlot}
          table={selectedTable as ITable}
          reservedInfo={reservedInfo || null}
          onAddReservationByStaff={addReservationByStaff}
          onUpdateReservation={editReservation}
        />

        {/* TOP HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-950">
              Quản Lý Đặt Bàn
            </h1>
            <p className="text-sm text-slate-500 mt-1">Hôm nay: Thứ Bảy, 30 Tháng 5, 2026</p>
          </div>
        </div>

        {/* 🌟 SỬ DỤNG FILTER TOOLBAR ĐA NĂNG ĐỒNG BỘ TOÀN CỤM QL CHUNG */}
        <FilterToolbar
          rightActions={
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start lg:self-auto">
              <button
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'timeline'
                    ? 'bg-white text-cerulean-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid size={14} /> Sơ đồ dòng thời gian
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-cerulean-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List size={14} /> Dạng bảng danh sách
              </button>
            </div>
          }
        >
          {/* 1. Ô Tìm kiếm */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm tên khách, số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 h-9 rounded-xl border border-slate-200 focus:outline-none focus:border-cerulean-blue-500 text-sm bg-slate-50/50 focus:bg-white"
            />
          </div>

          {/* 2. Ô Lọc Theo Ngày Custom từ Shadcn Popover + Calendar */}
          <CustomDatePicker value={selectedDate} onChange={(val: any) => setSelectedDate(val)} />

          {/* 3. Ô Lọc Trạng Thái Custom (Chỉ xuất hiện khi chuyển qua chế độ Xem dạng danh sách) */}
          {viewMode === 'table' && (
            <CustomSelect
              options={statusOptions}
              value={statusFilter}
              onChange={(val: any) => setStatusFilter(val)}
            />
          )}
        </FilterToolbar>

        {/* 3. ĐIỀU HƯỚNG INTERFACE HIỂN THỊ CHÍNH */}
        {viewMode === 'timeline' ? (
          <TimelineView
            timeSlots={DYNAMIC_TIME_SLOTS}
            tableTimeSlots={tableTimeSlots || []}
            onClickTimeSlot={(tableId, tableNumber, timeSlot, isEmpty, reservedInfo) => {
              setSelectedTable({ _id: tableId, tableNumber });
              setSelectedSlot({ timeSlot, isEmpty, date: selectedDate });
              setReservedInfo(reservedInfo);
              setIsDialogOpen(true);
              console.log('Clicked time slot:', {
                tableId,
                tableNumber,
                timeSlot,
                isEmpty,
                reservedInfo,
              });
            }}
          />
        ) : (
          <ListView
            reservations={reservations}
            onSelect={(res) => {
              setSelectedTable(typeof res.table == 'object' ? res.table : null);

              setSelectedSlot({
                timeSlot: res.reservationTime,
                isEmpty: false,
                date: new Date(res.date).toISOString().split('T')[0],
              });

              setReservedInfo(res);
              setIsDialogOpen(true);
            }}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}
