import { Check, Lock, Briefcase, PhoneCall } from 'lucide-react';
import { cn } from '@/lib/utils';

export type WizardStepKey = 'account' | 'hr' | 'emergency';

interface StepMeta {
  key: WizardStepKey;
  label: string;
  description: string;
  icon: typeof Lock;
}

const STEPS: StepMeta[] = [
  {
    key: 'account',
    label: 'Tài khoản & Phân quyền',
    description: 'Đăng nhập & chi nhánh làm việc',
    icon: Lock,
  },
  {
    key: 'hr',
    label: 'Hồ sơ nhân sự',
    description: 'Thông tin công việc & lương',
    icon: Briefcase,
  },
  {
    key: 'emergency',
    label: 'Liên hệ khẩn cấp',
    description: 'Người liên hệ khi có sự cố',
    icon: PhoneCall,
  },
];

export interface StepperProps {
  steps: WizardStepKey[];
  currentIndex: number;
  onStepClick?: (index: number) => void;
}

type StepStatus = 'done' | 'active' | 'upcoming';

export function Stepper({ steps, currentIndex, onStepClick }: StepperProps) {
  return (
    <nav
      aria-label="Tiến trình thêm / chỉnh sửa nhân viên"
      className="w-full overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <ol className="flex w-full items-start px-2 sm:px-6">
        {steps.map((key, index) => {
          const meta = STEPS.find((s) => s.key === key)!;
          const status: StepStatus =
            index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'upcoming';
          const isLast = index === steps.length - 1;
          const { icon: Icon } = meta;

          return (
            <li
              key={key}
              className="relative flex min-w-0 flex-1 flex-col items-center"
            >
              {/* Đường nối giữa các bước (ẩn trên mobile) */}
              {!isLast && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute left-[calc(50%+20px)] right-[calc(50%+20px)] top-4 hidden h-0.5 rounded-full transition-colors duration-300 sm:block',
                    index < currentIndex ? 'bg-cerulean-blue-500' : 'bg-slate-200',
                  )}
                />
              )}

              {/* Vòng tròn trạng thái */}
              <button
                type="button"
                tabIndex={status === 'upcoming' ? -1 : 0}
                aria-current={status === 'active' ? 'step' : undefined}
                aria-label={`${meta.label}: ${
                  status === 'done'
                    ? 'đã hoàn thành'
                    : status === 'active'
                      ? 'đang thực hiện'
                      : 'chưa thực hiện'
                }`}
                onClick={() => onStepClick?.(index)}
                className={cn(
                  'z-10 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cerulean-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                  status === 'done' &&
                    'bg-cerulean-blue-600 text-white shadow-md shadow-cerulean-blue-200',
                  status === 'active' &&
                    'bg-white text-cerulean-blue-600 ring-2 ring-cerulean-blue-600 ring-offset-2 ring-offset-slate-50',
                  status === 'upcoming' && 'bg-slate-100 text-slate-400 ring-1 ring-slate-200',
                )}
              >
                {status === 'done' ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </button>

              {/* Nhãn bước */}
              <div className="mt-2 flex flex-col items-center px-1 text-center">
                <span
                  className={cn(
                    'max-w-24 truncate text-[11px] font-semibold leading-tight transition-colors sm:max-w-none sm:text-xs',
                    status === 'done' && 'text-cerulean-blue-600',
                    status === 'active' && 'text-slate-900',
                    status === 'upcoming' && 'text-slate-400',
                  )}
                >
                  {meta.label}
                </span>
                <span className="mt-0.5 hidden text-[10px] text-slate-400 sm:block">
                  {meta.description}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function StepProgressLabel({ currentIndex, total }: { currentIndex: number; total: number }) {
  return (
    <span className="text-xs font-medium text-slate-500">
      Bước{' '}
      <span className="font-bold text-cerulean-blue-600">{currentIndex + 1}</span> / {total}
    </span>
  );
}