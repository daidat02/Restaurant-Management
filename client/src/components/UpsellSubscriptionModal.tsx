import { useNavigate } from 'react-router-dom';
import { CreditCard, Lock } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux-hook';
import { closeUpsell } from '@/redux/slices/upsellSlice';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Modal upsell toàn cục — tự bật khi bất kỳ API nào trả RESTAURANT_LOCKED
 * (tạo đơn, tạo món...). Đưa chủ về trang thanh toán để mở lại nhà hàng.
 */
export default function UpsellSubscriptionModal() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { open, message } = useAppSelector((state) => state.upsell);

  const handlePay = () => {
    dispatch(closeUpsell());
    navigate('/admin/billing');
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && dispatch(closeUpsell())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100">
            <Lock className="h-7 w-7 text-rose-600" />
          </div>
          <DialogTitle className="text-center text-xl font-bold text-slate-900">
            Nhà hàng đã bị khoá
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-slate-500">
            {message || 'Nhà hàng đã bị khoá do hết hạn thanh toán.'}
            <br />
            Thanh toán để mở lại và tiếp tục phục vụ khách ngay lập tức.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2.5 mt-2">
          <Button
            onClick={handlePay}
            className="h-11 w-full rounded-xl bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white font-semibold"
          >
            <CreditCard className="mr-2 h-4 w-4" /> Thanh toán mở lại
          </Button>
          <Button
            variant="outline"
            onClick={() => dispatch(closeUpsell())}
            className="h-11 w-full rounded-xl text-slate-600"
          >
            Để sau
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
