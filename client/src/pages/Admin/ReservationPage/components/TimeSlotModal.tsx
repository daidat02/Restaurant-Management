import { CustomDatePicker } from '@/components/DatePickerCustom';
import { DialogCustom } from '@/components/DialogCustom';
import { CustomSelect } from '@/components/SelectCustom';
import { StatusTag } from '@/components/StatusTag';
import { useAuth } from '@/hooks/use-auth';
import { useTable } from '@/hooks/use-table';
import type { IReservation, ReservationStatus } from '@/types/reservation.type';
import type { ITable } from '@/types/table.type';
import { extractId, generateTimeSlots } from '@/utils/helpers';
import React, { useState, useEffect, useMemo } from 'react';

// Hàm helper định dạng Date object thành chuỗi "YYYY-MM-DD" cho HTML Input
const formatDateToYYYYMMDD = (dateInstance: Date | string) => {
  if (!dateInstance) return '';
  const d = new Date(dateInstance);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

interface TimeSlotModalProps {
  isOpen: boolean;
  onChangeTimeSlotModal: () => void;
  table: ITable;
  slotInfo: {
    timeSlot: string;
    isEmpty: boolean;
    date: string;
  };
  reservedInfo?: IReservation | null;
  onAddReservationByStaff: (data: Partial<IReservation>) => Promise<any>;
  onUpdateReservation: (id: string, data: Partial<IReservation>) => Promise<any>;
}

const TimeSlotModal = ({
  isOpen,
  onChangeTimeSlotModal,
  table,
  slotInfo,
  reservedInfo,
  onAddReservationByStaff,
  onUpdateReservation,
}: TimeSlotModalProps) => {
  const { user } = useAuth();
  const { tables, fetchTablesByRestaurant } = useTable();

  const [isEditing, setIsEditing] = useState(false);

  // States quản lý Form thông tin khách
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [partySize, setPartySize] = useState<number>(2);
  const [status, setStatus] = useState<string>('confirmed');

  const [selectedTable, setSelectedTable] = useState<string>(table?._id);
  const [timeSlotSelected, setTimeSlotSelected] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');

  const restaurantConfig = { openHours: '15:00', closeHours: '22:00' };

  const DYNAMIC_TIME_SLOTS = useMemo(() => {
    return generateTimeSlots(restaurantConfig.openHours, restaurantConfig.closeHours);
  }, [restaurantConfig.openHours, restaurantConfig.closeHours]);

  // 🌟 Định dạng danh sách bàn ăn thành Options cho CustomSelect
  const tableOptions = useMemo(() => {
    return tables.map((tbl) => ({
      value: tbl._id,
      label: `Bàn ${tbl.tableNumber}`,
    }));
  }, [tables]);

  // 🌟 Định dạng danh sách slot khung giờ cho CustomSelect
  const timeSlotOptions = useMemo(() => {
    return DYNAMIC_TIME_SLOTS.map((time) => ({
      value: time,
      label: time,
    }));
  }, [DYNAMIC_TIME_SLOTS]);

  // 🌟 Định dạng danh sách trạng thái đơn đặt cho CustomSelect
  const statusOptions = useMemo(
    () => [
      { value: 'pending', label: 'Chờ xác nhận' },
      { value: 'confirmed', label: 'Đã xác nhận' },
      { value: 'checked_in', label: 'Đã nhận bàn' },
      { value: 'cancelled', label: 'Đã hủy' },
    ],
    [],
  );

  // ĐỒNG BỘ dữ liệu form khi đóng/mở hoặc thay đổi chế độ xem
  useEffect(() => {
    if (isOpen) {
      if (!slotInfo.isEmpty && reservedInfo) {
        // TRƯỜNG HỢP XEM/SỬA: Đồng bộ thông tin cũ của đơn đặt chỗ
        setName(reservedInfo.customerInfo.name || '');
        setPhone(reservedInfo?.customerInfo?.phoneNumber || '');
        setNotes(reservedInfo?.notes || '');
        setPartySize(Number(reservedInfo?.partySize || 2));
        setStatus(reservedInfo?.status || 'confirmed');
        // Đồng bộ dữ liệu cấu hình slot của đơn đặt hiện tại
        setSelectedTable(extractId(reservedInfo?.table));
        setTimeSlotSelected(reservedInfo?.reservationTime || slotInfo.timeSlot);
        setSelectedDate(formatDateToYYYYMMDD(reservedInfo?.date || slotInfo.date));
        setSelectedTable(table._id);
      } else {
        // TRƯỜNG HỢP TẠO MỚI: Reset trắng biểu mẫu
        setName('');
        setPhone('');
        setNotes('');
        setPartySize(2);
        setStatus('confirmed');
        setSelectedTable(table?._id || '');
        setTimeSlotSelected(slotInfo.timeSlot);
        setSelectedDate(formatDateToYYYYMMDD(slotInfo.date));
      }
    } else {
      fetchTablesByRestaurant(extractId(user?.restaurant));
      setIsEditing(false);
    }
  }, [isOpen, slotInfo.isEmpty, reservedInfo, table, slotInfo.timeSlot, slotInfo.date]);

  const hasData = !slotInfo.isEmpty;

  const currentSlot = {
    tableNo: table?.tableNumber ? `Bàn ${table.tableNumber}` : 'Chưa chọn bàn',
    timeSlot: slotInfo.timeSlot || 'Chưa chọn giờ',
  };

  const handleCreateReservation = async () => {
    const payload: Partial<IReservation> = {
      table: table?._id,
      reservationTime: slotInfo.timeSlot,
      date: new Date(slotInfo.date),
      customerInfo: { name, phoneNumber: phone },
      partySize,
      notes,
    };

    const res = await onAddReservationByStaff(payload);
    if (res) onChangeTimeSlotModal();
  };

  const handleUpdateReservation = async () => {
    if (!reservedInfo?._id) return;

    const payload: Partial<IReservation> = {
      table: selectedTable,
      reservationTime: timeSlotSelected,
      date: new Date(selectedDate),
      customerInfo: { name, phoneNumber: phone },
      partySize,
      notes,
      status: status as ReservationStatus,
    };

    const res = await onUpdateReservation(reservedInfo._id, payload);
    if (res) {
      setIsEditing(false);
      onChangeTimeSlotModal();
    }
  };

  return (
    <DialogCustom
      open={isOpen}
      contentClass="!max-w-lg max-h-screen"
      onOpenChange={() => onChangeTimeSlotModal()}
      content={
        <div className="p-2 w-full mx-auto bg-white rounded-xl text-slate-800">
          <h2 className="sr-only">{hasData ? 'Chi tiết đặt bàn' : 'Tạo đơn đặt bàn mới'}</h2>

          {/* PHẦN THÔNG TIN SLOT CỐ ĐỊNH / CHẾ ĐỘ SỬA */}
          {!isEditing ? (
            <div className="mb-4 p-3 bg-cerulean-blue-50/60 border border-cerulean-blue-100 rounded-xl animate-in fade-in duration-200">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-cerulean-blue-800 uppercase tracking-wider">
                  Vị trí bàn
                </span>
                <span className="text-xs font-semibold text-cerulean-blue-800 uppercase tracking-wider">
                  Khung giờ & Ngày
                </span>
              </div>
              <div className="flex justify-between items-start gap-4">
                <p className="text-sm font-bold text-cerulean-blue-950">{currentSlot.tableNo}</p>
                <p className="text-sm font-medium text-cerulean-blue-950 text-right">
                  {currentSlot.timeSlot} – {slotInfo.date}
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-cerulean-blue-50/60 border border-cerulean-blue-100 rounded-xl animate-in fade-in duration-200">
              <span className="text-xs font-bold text-cerulean-blue-800 uppercase tracking-wider block mb-2">
                Chế Độ Cập Nhật Thông Tin Slot
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Thay đổi bàn Custom */}
                <div>
                  <label className="text-[11px] text-cerulean-blue-800 block mb-1 font-medium">
                    Thay đổi Bàn
                  </label>
                  <CustomSelect
                    options={tableOptions}
                    value={selectedTable}
                    onChange={(val: any) => setSelectedTable(val)}
                    className="w-full"
                  />
                </div>
                {/* Thay đổi Khung giờ Custom */}
                <div>
                  <label className="text-[11px] text-cerulean-blue-800 block mb-1 font-medium">
                    Thay đổi Khung giờ
                  </label>
                  <CustomSelect
                    options={timeSlotOptions}
                    value={timeSlotSelected}
                    onChange={(val: any) => setTimeSlotSelected(val)}
                    className="w-full"
                  />
                </div>
                {/* Thay đổi Ngày Custom */}
                <div>
                  <label className="text-[11px] text-cerulean-blue-800 block mb-1 font-medium">
                    Thay đổi Ngày
                  </label>
                  <CustomDatePicker
                    value={selectedDate}
                    onChange={(val: any) => setSelectedDate(val)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}

          <hr className="border-slate-100 my-4" />

          {/* CHIA CÁC TRƯỜNG HỢP: XEM CHI TIẾT HOẶC ĐIỀN FORM */}
          {hasData && !isEditing ? (
            /* ================= TRƯỜNG HỢP 1: XEM CHI TIẾT DATA ================= */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                  Thông tin khách đặt
                </h4>
                <StatusTag status={reservedInfo?.status || ''} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-0.5">Tên khách hàng:</label>
                  <p className="text-sm font-semibold text-slate-900">
                    {reservedInfo?.customerInfo?.name || '---'}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-0.5">Số điện thoại:</label>
                  <p className="text-sm font-medium text-slate-900">
                    {reservedInfo?.customerInfo?.phoneNumber || '---'}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-0.5">Email:</label>
                <p className="text-sm font-medium text-slate-800">
                  {reservedInfo?.customerInfo?.email || '---'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-0.5">Số lượng khách:</label>
                  <p className="text-sm font-semibold text-slate-800">
                    {reservedInfo?.partySize || 0} Người
                  </p>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-0.5">Khu Vực Ngồi:</label>
                  <p className="text-sm font-medium text-slate-900">
                    {reservedInfo?.customerInfo?.side || '---'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-0.5">Trạng thái số ghế:</label>
                  <p className="text-sm text-slate-600">
                    Sức chứa tối đa: {table?.capacity || 'N/A'} người
                  </p>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-0.5">Thông báo hệ thống:</label>
                  <p className="text-sm text-slate-600">
                    {reservedInfo?.customerInfo?.note || 'Không có thông báo'}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-0.5">
                  Ghi chú ăn uống / Tiệc của khách:
                </label>
                <p className="text-sm text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 whitespace-pre-line">
                  {reservedInfo?.notes || 'Không có ghi chú'}
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onChangeTimeSlotModal()}
                  className="px-4 py-2 h-9 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Đóng
                </button>
                {reservedInfo && reservedInfo?.status !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 h-9 text-sm font-medium text-white bg-cerulean-blue-600 hover:bg-cerulean-blue-700 rounded-xl shadow-sm transition-colors"
                  >
                    Chỉnh sửa
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* ================= TRƯỜNG HỢP 2: FORM INPUT (ĐIỀN MỚI HOẶC SỬA) ================= */
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">
                {isEditing ? 'Cập nhật thông tin đặt bàn' : 'Nhập thông tin đặt bàn'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">
                    Tên khách hàng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3 py-2 h-9 border border-slate-200 bg-slate-50/50 rounded-xl text-sm focus:outline-none focus:border-cerulean-blue-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0901234..."
                    className="w-full px-3 py-2 h-9 border border-slate-200 bg-slate-50/50 rounded-xl text-sm focus:outline-none focus:border-cerulean-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">
                    Số lượng khách
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={partySize}
                    onChange={(e) => setPartySize(Number(e.target.value))}
                    className="w-full px-3 py-2 h-9 border border-slate-200 bg-slate-50/50 rounded-xl text-sm focus:outline-none focus:border-cerulean-blue-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">
                    Trạng thái <span className="text-red-500">*</span>
                  </label>
                  <CustomSelect
                    options={statusOptions}
                    value={status}
                    onChange={(val: any) => setStatus(val)}
                    className="w-full"
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  Ghi chú của khách
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Yêu cầu món ăn, set up bàn sinh nhật..."
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 rounded-xl text-sm focus:outline-none focus:border-cerulean-blue-500 focus:bg-white transition-all resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) {
                      setIsEditing(false);
                    } else {
                      onChangeTimeSlotModal();
                    }
                  }}
                  className="px-4 py-2 h-9 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="px-4 py-2 h-9 text-sm font-medium text-white bg-cerulean-blue-600 hover:bg-cerulean-blue-700 rounded-xl shadow-sm transition-colors"
                  onClick={() => {
                    if (isEditing) {
                      handleUpdateReservation();
                    } else {
                      handleCreateReservation();
                    }
                  }}
                >
                  {isEditing ? 'Cập nhật dữ liệu' : 'Xác nhận đặt bàn'}
                </button>
              </div>
            </div>
          )}
        </div>
      }
    />
  );
};

export default TimeSlotModal;
