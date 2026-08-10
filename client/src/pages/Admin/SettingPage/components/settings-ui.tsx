import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Card tiêu đề + nội dung theo chuẩn preview settings.html */
export function SettingCard({
  title,
  description,
  badge,
  className,
  children,
}: {
  title: string;
  description?: string;
  badge?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('rounded-2xl border border-slate-200 bg-white p-6 shadow-card', className)}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}
        </div>
        {badge}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

/** Input + label theo chuẩn preview (field className) */
export function Field({
  label,
  hint,
  icon,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className={className}>
      <label className="text-xs font-medium text-slate-600">
        {label}
        {props.required && <span className="text-red-400"> *</span>}
      </label>
      <div className="relative mt-1.5">
        <input
          {...props}
          className={cn(
            'block h-10 w-full rounded-[10px] border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-900 outline-none transition-all focus:border-cerulean-blue-500 focus:bg-white focus:ring-3 focus:ring-cerulean-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400',
            icon && 'pl-10',
          )}
        />
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            {icon}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

/** Textarea theo chuẩn preview */
export function TextArea({
  label,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <div className={className}>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <textarea
        {...props}
        className="mt-1.5 block h-20 w-full resize-none rounded-[10px] border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-cerulean-blue-500 focus:bg-white focus:ring-3 focus:ring-cerulean-blue-100"
      />
    </div>
  );
}

/** Select theo chuẩn preview */
export function SelectField({
  label,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <div className={className}>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <select
        {...props}
        className="block h-10 w-full  relative mt-1.5 rounded-[10px] border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-900 outline-none transition-all focus:border-cerulean-blue-500 focus:bg-white focus:ring-3 focus:ring-cerulean-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      >
        {children}
      </select>
    </div>
  );
}

/** Hàng toggle (switch + tiêu đề + mô tả) — đồng bộ preview */
export function ToggleRow({
  title,
  description,
  checked,
  onChange,
  muted,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between py-1 transition-opacity',
        muted && 'opacity-60 pointer-events-none',
        'cursor-pointer',
      )}
      onClick={() => onChange(!checked)}
    >
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        {description && <p className="text-xs text-slate-400">{description}</p>}
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  );
}

/** Nút toggle đơn lẻ — copy chuẩn giao diện từ preview */
export function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        'relative h-6 w-11 flex-none rounded-full transition-colors duration-200',
        checked ? 'bg-cerulean-blue-600' : 'bg-slate-200',
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200',
          checked && 'left-[22px]',
        )}
      />
    </button>
  );
}

/** Danh sách toggle chia ô theo preview (roles tab) */
export function PermissionToggle({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 transition-colors hover:border-cerulean-blue-200"
      onClick={() => onChange(!checked)}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
        <span className="text-slate-400">{icon}</span> {label}
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  );
}
