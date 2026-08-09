import { cn } from '@/lib/utils';
import React from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  actionButton?: React.ReactNode;
  containerClassName?: string;
  autoComplete?: string;
  error?: string;
}

export const CustomInput = ({
  label,
  icon,
  actionButton,
  containerClassName,
  error,
  className = '',
  ...props
}: FormInputProps) => {
  return (
    <div className={cn('flex flex-col gap-1.5 w-full', containerClassName)}>
      <label className="text-sm font-medium text-gray-900">{label}</label>
      <div className="relative">
        <input
          /* 🛠️ SỬ DỤNG HÀM cn() ĐỂ QUẢN LÝ CLASS MÀU: Nếu bên ngoài truyền vào focus:border-..., nó sẽ tự ghi đè màu cerulean-blue */
          className={cn(
            'h-10 w-full px-3.5 rounded-xl border text-sm placeholder:text-slate-400 transition-colors',
            'border-slate-200 bg-slate-50/70 focus:bg-white', // Nền + viền mặc định
            'focus:outline-none focus:border-cerulean-blue-500 focus:ring-2 focus:ring-cerulean-blue-100', // Cặp màu focus mặc định
            icon || actionButton ? 'pr-10' : '',
            error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : '',
            className, // Class động từ ngoài truyền vào sẽ đè bẹp các class trùng ở trên nhờ hàm cn
          )}
          {...props}
        />

        {/* Render Icon nếu có */}
        {icon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {icon}
          </div>
        )}

        {/* Render Nút bấm nếu có */}
        {actionButton && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
            {actionButton}
          </div>
        )}
      </div>

      {/* Hiển thị lỗi nếu có */}
      {error && (
        <p className="text-xs font-medium text-red-500 animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
};
