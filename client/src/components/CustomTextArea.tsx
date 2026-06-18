import React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Hoặc dùng thẻ <textarea> của HTML nếu không có shadcn
import { cn } from "@/lib/utils";

// Kế thừa các thuộc tính của thẻ textarea chuẩn
interface CustomTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  containerClassName?: string;
}

export const CustomTextarea = React.forwardRef<HTMLTextAreaElement, CustomTextareaProps>(
  ({ label, error, containerClassName, className, id, ...props }, ref) => {
    return (
      <div className={cn("flex flex-col gap-1.5 w-full", containerClassName)}>
        <Label 
          htmlFor={id} 
          className={cn(error && "text-red-500")}
        >
          {label}
        </Label>

        <Textarea
          id={id}
          ref={ref}
          // min-h-[100px] để set chiều cao mặc định cho đẹp, người dùng có thể tự kéo giãn thêm
          className={cn(
            "min-h-[100px] resize-y", 
            error && "border-red-500 focus-visible:ring-red-500",
            className
          )}
          {...props}
        />

        {error && (
          <p className="text-xs text-red-500 font-medium animate-in fade-in slide-in-from-top-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

CustomTextarea.displayName = "CustomTextarea";