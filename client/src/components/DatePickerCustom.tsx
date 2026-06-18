import * as React from 'react';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar'; // Component Calendar của Shadcn
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface CustomDatePickerProps {
  value: string; // Nhận vào chuỗi dạng "YYYY-MM-DD"
  onChange: (value: string) => void; // Trả ra chuỗi dạng "YYYY-MM-DD"
  className?: string;
}

export function CustomDatePicker({
  value,
  onChange,
  className = 'w-full sm:w-44',
}: CustomDatePickerProps) {
  // Chuyển đổi chuỗi string "YYYY-MM-DD" từ state thành kiểu Date object cho thư viện hiểu
  const dateValue = React.useMemo(() => {
    return value ? parseISO(value) : undefined;
  }, [value]);

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Định dạng Date object ngược lại thành chuỗi chuẩn HTML "YYYY-MM-DD" để gọi API
      const formattedString = format(selectedDate, 'yyyy-MM-dd');
      onChange(formattedString);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'h-9 justify-start text-left font-medium rounded-xl border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 px-3 text-slate-700 text-sm transition-all outline-none focus-visible:ring-0 focus:border-cerulean-blue-500 focus:bg-white',
            !value && 'text-slate-400',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-slate-400 shrink-0" />
          {dateValue ? format(dateValue, 'dd/MM/yyyy', { locale: vi }) : <span>Chọn ngày...</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 rounded-xl border border-slate-200 shadow-xl"
        align="start"
      >
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={(date) => handleSelect(date as Date | undefined)}
          autoFocus
          locale={vi}
          className={cn(
            'p-3 pointer-events-auto',
            // 1. Đổi màu nền cho ngày được chọn
            '[&_.rdp-selected]:bg-cerulean-blue-600 [&_.rdp-selected]:text-white',
            '[&_.rdp-selected:hover]:bg-cerulean-blue-700',
            '[&_.rdp-selected_button]:bg-cerulean-blue-600 [&_.rdp-selected_button]:text-white',

            // 2. 🌟 SỬA RADIUS: Ép bo góc cho TẤT CẢ các nút ngày (Today, Selected, Normal Day)
            '[&_.rdp-day]:rounded-lg [&_.rdp-day_button]:rounded-lg',
            '[&_.rdp-selected]:rounded-lg [&_.rdp-selected_button]:rounded-lg',

            // 3. Custom riêng cho ngày Today (nếu muốn nó nổi bật nhưng vẫn có bo góc)
            '[&_.rdp-today]:font-bold [&_.rdp-today]:text-cerulean-blue-600 [&_.rdp-today]:rounded-lg',
            '[&_.rdp-today_button]:rounded-lg',
          )}
        />
      </PopoverContent>
    </Popover>
  );
}
