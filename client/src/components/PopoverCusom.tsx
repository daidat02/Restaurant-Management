
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type React from "react"
import { useState } from "react";

interface PopoverProp {
    children: React.ReactNode;
    width?: string;
    trigger:React.ReactNode;
    align?: "center" | "start" | "end";
    className?:string;
    onClose?:()=>void;
    onOpenChange?:(open:boolean)=>void
}

export function PopoverCustom({children, trigger, align, className,onOpenChange }: PopoverProp) {
  const [isOpen, setIsOpen] = useState(false);
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open); // ĐÚNG: Nhận giá trị true/false từ Radix UI truyền vào

    // Kích hoạt callback từ phía component cha nếu có truyền vào
    if (onOpenChange) {
      onOpenChange(open);
    }
  };
  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange} >
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent onClick={() => setIsOpen(false)}  align={ align} className={className || "w-full h-auto p-2"}>
        {children}
      </PopoverContent>
    </Popover>
  )
}
