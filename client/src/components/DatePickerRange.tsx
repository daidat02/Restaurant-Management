'use client';

import {
  addDays,
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
} from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { type DateRange } from 'react-day-picker';
import { vi } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// Cập nhật lại định nghĩa Type để an toàn và chính xác hơn
interface DatePickerProps {
  mode: 'single' | 'range';
  value?: string | { from: string; to: string }; // Nhận giá trị string cho single hoặc object cho range
  onChange?: (value: any) => void;
}

export function DatePickerWithRange({ mode, value, onChange }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // State dùng chung, hỗ trợ cả Date (cho single) và DateRange (cho range)
  const [singleDate, setSingleDate] = useState<Date | undefined>(
    mode === 'single' && typeof value === 'string' ? new Date(value) : new Date(),
  );
  const [rangeDate, setRangeDate] = useState<DateRange | undefined>({
    from: mode === 'range' && typeof value === 'object' ? new Date(value.from) : new Date(),
    to: mode === 'range' && typeof value === 'object' ? new Date(value.to) : addDays(new Date(), 7),
  });

  // Đồng bộ hóa khi prop `value` từ bên ngoài thay đổi
  useEffect(() => {
    if (!value) return;
    if (mode === 'single' && typeof value === 'string') {
      setSingleDate(new Date(value));
    } else if (mode === 'range' && typeof value === 'object') {
      setRangeDate({
        from: value.from ? new Date(value.from) : undefined,
        to: value.to ? new Date(value.to) : undefined,
      });
    }
  }, [value, mode]);

  // Các presets cho trạng thái chọn khoảng ngày (Range) - ảnh "Ảnh màn hình 2026-06-10 lúc 22.19.52.png"
  const rangePresets = [
    {
      label: 'Tuần hiện tại',
      getValue: () => ({
        from: startOfWeek(new Date(), { weekStartsOn: 1 }),
        to: endOfWeek(new Date(), { weekStartsOn: 1 }),
      }),
    },
    {
      label: 'Tháng hiện tại',
      getValue: () => ({
        from: startOfMonth(new Date()),
        to: new Date(),
      }),
    },
    {
      label: '7 Ngày trước',
      getValue: () => ({
        from: subDays(new Date(), 6),
        to: new Date(),
      }),
    },

    {
      label: '1 Tháng trước',
      getValue: () => ({
        from: startOfMonth(subMonths(new Date(), 1)),
        to: endOfMonth(subMonths(new Date(), 1)),
      }),
    },
    {
      label: '3 Tháng trước',
      getValue: () => ({
        from: startOfMonth(subMonths(new Date(), 2)),
        to: endOfMonth(new Date()),
      }),
    },
  ];

  // Các presets bổ sung cho trạng thái chọn 1 ngày (Single) giúp UI cân đối hơn
  const singlePresets = [
    { label: 'Hôm nay', getValue: () => new Date() },
    { label: 'Hôm qua', getValue: () => subDays(new Date(), 1) },
    { label: 'Đầu tuần', getValue: () => startOfWeek(new Date(), { weekStartsOn: 1 }) },
  ];

  // Xử lý khi nhấn nút chọn nhanh cho Range
  const handleRangePresetClick = (getRange: () => DateRange) => {
    const range = getRange();
    setRangeDate(range);
    onChange?.({
      from: range.from ? format(range.from, 'yyyy-MM-dd') : undefined,
      to: range.to ? format(range.to, 'yyyy-MM-dd') : undefined,
    });
    setIsOpen(false);
  };

  // Xử lý khi nhấn nút chọn nhanh cho Single
  const handleSinglePresetClick = (getDate: () => Date) => {
    const selected = getDate();
    setSingleDate(selected);
    onChange?.(format(selected, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  // Cập nhật khi click trực tiếp trên bảng Lịch
  const handleSelect = (val: any) => {
    if (mode === 'single') {
      setSingleDate(val);
      if (val) onChange?.(format(val, 'yyyy-MM-dd'));
      setIsOpen(false); // Thường single click xong sẽ đóng luôn cho tiện UX
    } else {
      setRangeDate(val);
      if (val?.from && val?.to) {
        onChange?.({
          from: format(val.from, 'yyyy-MM-dd'),
          to: format(val.to, 'yyyy-MM-dd'),
        });
      }
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          id="date-picker-range"
          className={cn(
            'h-9 px-2.5 justify-start text-left font-medium rounded-xl border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 px-3 text-slate-700 text-sm transition-all outline-none focus-visible:ring-0 focus:border-cerulean-blue-500 focus:bg-white',
            !value && 'text-slate-400',
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {mode === 'single' ? (
            singleDate ? (
              format(singleDate, 'dd/MM/yyyy')
            ) : (
              <span>Chọn một ngày</span>
            )
          ) : rangeDate?.from ? (
            rangeDate.to ? (
              <>
                {format(rangeDate.from, 'dd/MM/yyyy')} - {format(rangeDate.to, 'dd/MM/yyyy')}
              </>
            ) : (
              format(rangeDate.from, 'dd/MM/yyyy')
            )
          ) : (
            <span>Chọn khoảng ngày</span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0 mr-8" align="start">
        <div className="flex flex-col">
          {/* Khu vực Lịch dựa theo Mode */}
          <div className="p-1">
            {mode === 'single' ? (
              <Calendar
                mode="single"
                locale={vi}
                selected={singleDate}
                onSelect={handleSelect}
                autoFocus
                className="w-full"
              />
            ) : (
              <Calendar
                mode="range"
                locale={vi}
                defaultMonth={rangeDate?.from}
                selected={rangeDate}
                onSelect={handleSelect}
                numberOfMonths={1}
                className="w-full"
              />
            )}
          </div>

          {/* --- FOOTER CHUYỂN ĐỔI THEO TRẠNG THÁI --- */}
          <div className="border-t border-border p-3 bg-muted/10">
            {mode === 'range' ? (
              /* Thiết kế layout 3 cột chuẩn như ảnh cho Range */
              <div className="grid grid-cols-3 gap-1 gap-y-3">
                {rangePresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleRangePresetClick(preset.getValue)}
                    className="text-left text-[12px] font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-all"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            ) : (
              /* Layout cho Single */
              <div className="flex gap-3">
                {singlePresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleSinglePresetClick(preset.getValue)}
                    className="text-[12px] font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-all"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
