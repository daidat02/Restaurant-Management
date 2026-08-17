import { useNavigate } from 'react-router-dom';
import { CreditCard, Lock, Sparkles } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux-hook';
import { closeUpsell } from '@/redux/slices/upsellSlice';
import { LIMIT_RESOURCE_LABEL } from '@/constants/feature-catalog';
import { useSubscription } from '@/hooks/use-subscription';
import type { IPlan } from '@/types/subscription.type';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Modal upsell toàn cục — tự bật khi API trả RESTAURANT_LOCKED (nhà hàng bị khoá)
 * hoặc PLAN_LIMIT_REACHED (vượt giới hạn gói). Đưa chủ về trang thanh toán để nâng cấp.
 */
export default function UpsellSubscriptionModal() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { open, type, message, meta } = useAppSelector((state) => state.upsell);
  const { pricing } = useSubscription();

  /** Gợi ý gói tối thiểu đủ limit (so theo meta từ server) → mở PaymentDialog với gói đó. */
  const suggestedPlanKey = (() => {
    if (type !== 'plan-limit' || !meta || !meta.limit) return '';
    const limit = meta.limit;
    const resource = meta.resource as keyof IPlan['limits'] | undefined;
    const plans = pricing?.plans ?? [];
    const currentSort = meta.planKey
      ? (plans.find((p) => p.key === meta.planKey)?.sortOrder ?? 0)
      : 0;
    const candidate = plans
      .filter((p) => {
        if (p.isActive === false || p.contactOnly) return false;
        if ((p.sortOrder ?? 0) <= currentSort) return false;
        if (!resource) return true;
        const pLimit = p.limits?.[resource] ?? 0;
        return pLimit === 0 || pLimit > limit;
      })
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0];
    return candidate?.key ?? '';
  })();

  const handleUpgrade = () => {
    dispatch(closeUpsell());
    if (suggestedPlanKey) {
      navigate(`/admin/billing?plan=${suggestedPlanKey}&cycle=1`);
    } else {
      navigate('/admin/billing');
    }
  };

  // Copy + hành động theo loại upsell
  const isPlanLimit = type === 'plan-limit';
  const title = isPlanLimit ? 'Đã đạt giới hạn gói' : 'Nhà hàng đã bị khoá';

  const limitCopy = (() => {
    if (!meta) return null;
    if (meta.feature) {
      return `Tính năng này không nằm trong gói của bạn.`;
    }
    const resource = meta.resource
      ? (LIMIT_RESOURCE_LABEL[meta.resource] ?? meta.resource)
      : 'tài nguyên';
    if (meta.limit && meta.used != null) {
      return `Bạn đã dùng ${meta.used}/${meta.limit} ${resource} của gói hiện tại.`;
    }
    if (meta.limit) return `Gói hiện tại cho phép tối đa ${meta.limit} ${resource}.`;
    return null;
  })();

  return (
    <Dialog open={open} onOpenChange={(val) => !val && dispatch(closeUpsell())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div
            className={`mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl ${
              isPlanLimit ? 'bg-amber-100' : 'bg-rose-100'
            }`}
          >
            {isPlanLimit ? (
              <Lock className="h-7 w-7 text-amber-600" />
            ) : (
              <Lock className="h-7 w-7 text-rose-600" />
            )}
          </div>
          <DialogTitle className="text-center text-xl font-bold text-slate-900">
            {title}
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-slate-500">
            {isPlanLimit ? (
              <>
                {limitCopy || message || 'Gói hiện tại không đủ quyền cho thao tác này.'}
                <br />
                Nâng cấp gói cao hơn để tiếp tục phục vụ khách.
              </>
            ) : (
              <>
                {message || 'Nhà hàng đã bị khoá do hết hạn thanh toán.'}
                <br />
                Thanh toán để mở lại và tiếp tục phục vụ khách ngay lập tức.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2.5 mt-2">
          <Button
            onClick={handleUpgrade}
            className="h-11 w-full rounded-xl bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white font-semibold"
          >
            {isPlanLimit ? (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Nâng cấp gói
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" /> Thanh toán mở lại
              </>
            )}
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
