import React, { useEffect, useRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode; // Cái "ruột" sẽ được truyền vào đây
  className?: string; // Dùng để chỉnh độ rộng nếu muốn (ví dụ: sm:max-w-xl)
  isHeaderless?: boolean; // Nếu true, sẽ không hiển thị header (title + description)
  side?: 'top' | 'right' | 'bottom' | 'left'; // Hướng mở drawer; mặc định là bên phải
  showDragHandle?: boolean; // Nếu true, sẽ hiển thị thanh kéo để di chuyển drawer
}

export default function SideDrawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  className = 'sm:max-w-md', // Mặc định là max-w-md, có thể ghi đè
  isHeaderless = false,
  side = 'right',
  showDragHandle = false,
}: SideDrawerProps) {
  // Lưu onClose mới nhất vào ref để listener popstate không bị capture function cũ
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Đồng bộ nút Back của trình duyệt: khi mở drawer ta pushState 1 entry,
  // nút Back sẽ kích hoạt popstate → đóng drawer (predictable back behavior)
  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ drawerOpen: true }, '');

    const handlePopState = () => {
      onCloseRef.current();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Nếu drawer đóng bằng nút đóng/overlay (không qua back), xóa marker để
      // không khiến lần back kế tiếp đóng nhầm drawer — tránh thoát khỏi trang
      if (window.history.state?.drawerOpen) {
        window.history.replaceState({}, '');
      }
    };
  }, [isOpen]);

  const isVertical = side === 'bottom' || side === 'top';

  return (
    // onOpenChange sẽ nhận giá trị true/false. Nếu là false (user bấm X hoặc click ra ngoài), ta gọi hàm onClose
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={side}
        className={`overflow-y-auto ${isHeaderless ? '[&>button]:hidden' : ''} ${className}`}
      >
        {/* Drag handle cho bottom/top sheet — gợi ý thị giác rằng có thể vuốt/kéo */}
        {isVertical && showDragHandle && (
          <div
            aria-hidden="true"
            className="mx-auto mt-2.5 mb-1 h-1.5 w-10 shrink-0 rounded-full bg-slate-200"
          />
        )}

        {isHeaderless && (
          <>
            <SheetTitle className="sr-only">Drawer</SheetTitle>
            <SheetDescription className="sr-only">
              {description || 'Nội dung drawer'}
            </SheetDescription>
          </>
        )}
        {!isHeaderless && (
          <SheetHeader className="border-b border-gray-200">
            <SheetTitle className="text-xl font-bold ">{title}</SheetTitle>
            {description && (
              <SheetDescription className="text-sm text-gray-500">{description}</SheetDescription>
            )}
          </SheetHeader>
        )}

        {/* Vùng chứa nội dung động (Form) */}
        <div className={`${isHeaderless ? '' : '-mt-4'} flex-1 h-full`}>{children}</div>
      </SheetContent>
    </Sheet>
  );
}
