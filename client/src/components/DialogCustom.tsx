import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface IDialogProps {
  dialogTrigger?: React.ReactNode;
  content: React.ReactNode;
  headerTitle?: string;
  desc?: string;
  containerClass?: string;
  contentClass?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Thêm prop mới ở đây
  closeOnInteractOutside?: boolean;
}

export function DialogCustom({
  dialogTrigger,
  content,
  headerTitle,
  desc,
  containerClass,
  contentClass,
  open,
  onOpenChange,
  closeOnInteractOutside = false,
}: IDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {dialogTrigger && (
        <div className={containerClass}>
          <DialogTrigger asChild>{dialogTrigger}</DialogTrigger>
        </div>
      )}

      <DialogContent
        showCloseButton={false}
        className={contentClass}
        onInteractOutside={(e) => {
          if (!closeOnInteractOutside) {
            e.preventDefault();
          }
        }}
      >
        {headerTitle && (
          <DialogHeader>
            <DialogTitle>{headerTitle}</DialogTitle>
            <DialogDescription>{desc}</DialogDescription>
          </DialogHeader>
        )}
        {content}
      </DialogContent>
    </Dialog>
  );
}
