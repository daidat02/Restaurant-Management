import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Option {
  label: string;
  value: string;
}

interface FormSelectProps {
  label: string;
  placeholder?: string;
  options: Option[];
  value?: string;
  onValueChange?: (value: string) => void;
  error?: string;
  containerClassName?: string;
  disabled?: boolean; // Thêm trạng thái khoá
}

export const FormSelect = ({
  label,
  placeholder,
  options,
  value,
  onValueChange,
  error,
  containerClassName,
  disabled = false,
}: FormSelectProps) => {
  return (
    <div className={cn('space-y-2 w-full', containerClassName)}>
      {/* 1. CSS Label: Đỏ khi lỗi, mờ đi khi bị disabled */}
      <Label
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          error && 'text-red-500',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        {label}
      </Label>

      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        {/* 2. CSS Trigger (Khung bấm): Bo góc, viền đỏ khi lỗi, hiệu ứng ring khi focus */}
        <SelectTrigger
          className={cn(
            'w-full transition-colors', // Chiều cao h-10 + ring cerulean được xử lý sẵn ở base ui/select
            error && 'border-red-400 focus-visible:ring-red-100',
          )}
        >
          <SelectValue className="h-full" placeholder={placeholder} />
        </SelectTrigger>

        <SelectContent>
          {options.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              className="cursor-pointer hover:bg-gray-100 data-[state=checked]:bg-cerulean-blue-50 data-[state=checked]:text-cerulean-blue-700" // Thêm hover + trạng thái chọn cho từng item
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 3. CSS Báo lỗi: Có hiệu ứng trượt nhẹ từ trên xuống (animate-in) */}
      {error && (
        <p className="text-xs font-medium text-red-500 animate-in fade-in slide-in-from-top-1 mt-1">
          {error}
        </p>
      )}
    </div>
  );
};
