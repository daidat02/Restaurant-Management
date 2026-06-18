import { cn } from '@/lib/utils';
import React from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  actionButton?: React.ReactNode;
  containerClassName?: string;
  autoComplete?: string;
}

export const CustomInput = ({
  label,
  icon,
  actionButton,
  containerClassName,
  className = '',
  ...props
}: FormInputProps) => {
  return (
    <div className={cn('flex flex-col gap-1.5 w-full', containerClassName)}>
      <label className="text-sm text-gray-900">{label}</label>
      <div className="relative">
        <input
          /* 🛠️ SỬ DỤNG HÀM cn() ĐỂ QUẢN LÝ CLASS MÀU: Nếu bên ngoài truyền vào focus:border-..., nó sẽ tự ghi đè màu cerulean-blue */
          className={cn(
            'w-full px-4 py-2 border border-gray-300 rounded-lg text-sm placeholder:text-gray-400 transition-colors',
            'focus:outline-none focus:border-cerulean-blue-500 focus:ring-1 focus:ring-cerulean-blue-500', // Cặp màu mặc định
            icon || actionButton ? 'pr-10' : '',
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
    </div>
  );
};
