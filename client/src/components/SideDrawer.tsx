import React from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode; // Cái "ruột" sẽ được truyền vào đây
  className?: string; // Dùng để chỉnh độ rộng nếu muốn (ví dụ: sm:max-w-xl)
  isHeaderless?: boolean; // Nếu true, sẽ không hiển thị header (title + description)
}

export default function SideDrawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  className = "sm:max-w-md", // Mặc định là max-w-md, có thể ghi đè
  isHeaderless = false
}: SideDrawerProps) {
  return (
    // onOpenChange sẽ nhận giá trị true/false. Nếu là false (user bấm X hoặc click ra ngoài), ta gọi hàm onClose
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
      className={`overflow-y-auto ${isHeaderless ? '[&>button]:hidden' : ''} ${className}`}
      >
        {!isHeaderless && 
          <SheetHeader className="border-b border-gray-200">
            <SheetTitle className="text-xl font-bold ">
              {title}
            </SheetTitle>
            {description && (
              <SheetDescription className="text-sm text-gray-500">
                {description}
              </SheetDescription>
            )}
          </SheetHeader>
        }
        
        {/* Vùng chứa nội dung động (Form) */}
        <div className="-mt-4 flex-1 h-full">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}