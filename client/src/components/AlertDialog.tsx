import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Info, CheckCircle2, TriangleAlert, OctagonAlert } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type AlertVariant = 'info' | 'success' | 'warning' | 'danger';
type ConfirmButtonVariant = NonNullable<React.ComponentProps<typeof Button>['variant']>;

// Màu nền nhãn + icon theo variant — tuân theo hệ thống thiết kế NhaHang OS
const VARIANT_CONFIG: Record<
  AlertVariant,
  {
    icon: LucideIcon;
    media: string;
    confirmVariant: ConfirmButtonVariant;
    confirmCls?: string;
  }
> = {
  info: {
    icon: Info,
    media: 'bg-cerulean-blue-50 text-cerulean-blue-600',
    confirmVariant: 'default',
    confirmCls: 'bg-cerulean-blue-600 text-white hover:bg-cerulean-blue-700', // Thêm màu tương ứng cho nút warning nếu cần
  },
  success: {
    icon: CheckCircle2,
    media: 'bg-emerald-50 text-emerald-600',
    confirmVariant: 'default', // ✅ Giá trị hợp lệ theo Button variant
    confirmCls: 'bg-cerulean-blue-600 text-white hover:bg-cerulean-blue-700', // Thêm màu tương ứng cho nút warning nếu cần
  },
  warning: {
    icon: TriangleAlert,
    media: 'bg-amber-50 text-amber-600',
    confirmVariant: 'default',
    confirmCls: 'bg-cerulean-blue-600 text-white hover:bg-cerulean-blue-700', // Thêm màu tương ứng cho nút warning nếu cần
  },
  danger: {
    icon: OctagonAlert,
    media: 'bg-rose-50 text-rose-600',
    confirmVariant: 'destructive',
    confirmCls: 'bg-destructive text-white hover:bg-destructive/90',
  },
};

interface AlertDialogCustomProps {
  /** Trigger element (dùng khi điều khiển bằng trigger). */
  children?: React.ReactNode;
  /** Chế độ controlled — truyền open + onOpenChange để đóng/mở từ bên ngoài. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Tiêu đề dialog. */
  title?: string;
  /** Mô tả / nội dung phụ bên dưới tiêu đề. */
  description?: string;
  /** Phân loại hiển thị: info | success | warning | danger. Mặc định danger. */
  variant?: AlertVariant;
  /** Override icon hiển thị (mặc định theo variant). */
  icon?: LucideIcon;
  /** Kích thước dialog. */
  size?: 'default' | 'sm';
  /** Nội dung tuỳ chỉnh thêm giữa description và footer. */
  content?: React.ReactNode;
  /** Nhãn nút xác nhận. */
  confirmText?: string;
  /** Bí danh của confirmText (giữ tương thích với API cũ). */
  actionText?: string;
  /** Nhãn nút huỷ. */
  cancelText?: string;
  /** Ẩn nút huỷ (chỉ còn nút xác nhận). */
  showCancel?: boolean;
  /** Khoá nút xác nhận (vd: form chưa hợp lệ). */
  confirmDisabled?: boolean;
  /** Trạng thái loading bên ngoài kiểm soát (vd: đang lưu dữ liệu). */
  isLoading?: boolean;
  /**
   * Hàm chạy khi bấm nút xác nhận.
   * Trả về false → giữ dialog mở. Trả về Promise → nút hiện spinner tới khi resolve rồi tự đóng.
   */
  onConfirm?: () => void | boolean | Promise<void | boolean>;
  /** Gọi khi bấm huỷ. */
  onCancel?: () => void;
  className?: string;
}

/**
 * AlertDialog dùng chung toàn dự án — thay thế window.confirm và các dialog alert lẻ tẻ.
 *
 * Hỗ trợ:
 *  - 4 variant (info/success/warning/danger) kèm icon + màu nhãn.
 *  - Điều khiển bằng trigger hoặc controlled (open/onOpenChange).
 *  - Xác nhận bất đồng bộ: nút hiện spinner trong lúc await, tự đóng khi xong.
 *  - Truy cập bàn phím (Escape đóng, focus ring, trap focus) do Radix AlertDialog cung cấp.
 */
export function AlertDialogCustom({
  children,
  open,
  onOpenChange,
  title,
  description,
  variant = 'danger',
  icon,
  size = 'default',
  content,
  confirmText,
  actionText,
  cancelText = 'Huỷ',
  showCancel = true,
  confirmDisabled = false,
  isLoading: externalLoading,
  onConfirm,
  onCancel,
  className,
}: AlertDialogCustomProps) {
  // Hỗ trợ cả controlled và uncontrolled (quản lý open nội bộ khi không truyền open)
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const changeOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  // Loading nội bộ khi onConfirm là async — nút hiện spinner trong lúc chờ
  const [internalLoading, setInternalLoading] = React.useState(false);
  const isLoading = externalLoading ?? internalLoading;

  const handleConfirm = async () => {
    if (!onConfirm) {
      changeOpen(false);
      return;
    }
    setInternalLoading(true);
    try {
      const shouldClose = await onConfirm();
      if (shouldClose !== false) changeOpen(false);
    } finally {
      setInternalLoading(false);
    }
  };

  const IconComponent = icon ?? VARIANT_CONFIG[variant].icon;
  const cfg = VARIANT_CONFIG[variant];
  const resolvedConfirmText = confirmText ?? actionText ?? 'Xác nhận';

  return (
    <AlertDialog open={isOpen} onOpenChange={changeOpen}>
      {children && <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>}

      <AlertDialogContent size={size} className={cn('gap-5 p-5', className)}>
        <AlertDialogHeader>
          {IconComponent && (
            <AlertDialogMedia className={cfg.media}>
              <IconComponent className="size-6" />
            </AlertDialogMedia>
          )}
          {title && <AlertDialogTitle>{title}</AlertDialogTitle>}
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
          {content}
        </AlertDialogHeader>

        <AlertDialogFooter>
          {showCancel && (
            <AlertDialogCancel
              disabled={isLoading}
              onClick={() => {
                onCancel?.();
              }}
            >
              {cancelText}
            </AlertDialogCancel>
          )}
          <Button
            variant={cfg.confirmVariant}
            className={cn(cfg.confirmCls, 'min-w-20')}
            disabled={confirmDisabled || isLoading}
            onClick={handleConfirm}
          >
            {isLoading && <Spinner className="size-4" />}
            {resolvedConfirmText}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
