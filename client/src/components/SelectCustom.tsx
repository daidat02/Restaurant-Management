import { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  label?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClass?: string;
  disabled?: boolean | false;
}

export function CustomSelect({
  options,
  value,
  label,
  onChange,
  placeholder = 'Chọn một tùy chọn...',
  className = 'w-full sm:w-44',
  triggerClass,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  // Lấy label của option đang được chọn để hiển thị trên Trigger
  const selectedLabel = useMemo(() => {
    return options.find((opt) => opt.value === value)?.label || placeholder;
  }, [options, value, placeholder]);

  // Đóng dropdown khi click ra ngoài vùng select (Click Outside)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    /* 1. BẮT BUỘC: Thêm class `relative` ở đây để định vị Menu absolute bên dưới */
    <div ref={selectRef} className={`relative text-left flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-sm text-gray-900">{label}</label>}

      {/* TRIGGER BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-slate-700 transition-all text-left outline-none
          ${
            isOpen
              ? 'border-cerulean-blue-500 bg-white ring-2 ring-cerulean-blue-50'
              : 'border-gray-300 hover:bg-gray-100/50'
          } ${triggerClass}`}
      >
        <span className="truncate pr-2">{selectedLabel}</span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200
            ${isOpen ? 'rotate-180 text-cerulean-blue-500' : ''}`}
        />
      </button>

      {/* 2. DROPDOWN MENU (ĐÃ SỬA LẠI TỌA ĐỘ) */}
      {isOpen && (
        <div
          className="absolute left-0 z-50 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg animate-in fade-in-0 zoom-in-95 duration-100 origin-top
          top-[calc(100%+4px)]"
          /* Tọa độ top-[calc(100%+4px)] giúp menu tự động đẩy sát xuống dưới nút bấm bất kể có label hay không */
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full cursor-pointer select-none rounded-lg py-2 px-3 text-sm font-medium text-left outline-none transition-colors
                  ${
                    isSelected
                      ? 'bg-cerulean-blue-50 text-cerulean-blue-600 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 focus:bg-slate-50'
                  }`}
              >
                {/* 3. Thêm break-words hoặc whitespace-normal để các text dài (như cổng thanh toán) tự xuống dòng đẹp mắt */}
                <span className="block whitespace-normal break-words">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
