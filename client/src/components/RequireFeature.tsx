import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Lock } from 'lucide-react';
import { usePlan } from '@/hooks/use-plan';
import { useAuth } from '@/hooks/use-auth';
import { getFeatureLabel, type FeatureKey } from '@/constants/feature-catalog';
import { Button } from '@/components/ui/button';

/**
 * Route gate: yêu cầu tính năng theo gói của nhà hàng đang làm việc.
 * Không đủ tính năng → hiển thị màn hình upsell thay vì trang.
 * Thiếu dữ liệu plan → cho phép đi tiếp (server là lưới cuối).
 */
export default function RequireFeature({
  feature,
  children,
}: {
  feature: FeatureKey;
  children: ReactNode;
}) {
  const { hasFeature, plan } = usePlan();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (hasFeature(feature)) return <>{children}</>;

  const isAdmin = user?.role === 'admin';
  const planName = plan?.name || 'gói hiện tại';

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
          <Lock className="h-7 w-7 text-amber-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          Tính năng chưa có trong {planName}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          “{getFeatureLabel(feature)}” không nằm trong gói của nhà hàng này.
          {isAdmin
            ? ' Nâng cấp gói để mở khoá ngay.'
            : ' Liên hệ chủ nhà hàng để nâng cấp gói.'}
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          {isAdmin && (
            <Button
              onClick={() => navigate('/admin/billing')}
              className="h-11 w-full rounded-xl bg-cerulean-blue-600 font-semibold text-white hover:bg-cerulean-blue-700"
            >
              <Sparkles className="mr-2 h-4 w-4" /> Nâng cấp gói
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="h-11 w-full rounded-xl text-slate-600"
          >
            Quay lại
          </Button>
        </div>
      </div>
    </div>
  );
}
