import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarClock, CheckCircle2, CreditCard, XCircle } from 'lucide-react';
import { useActiveRestaurantId } from '@/hooks/use-active-restaurant';
import { useSubscription } from '@/hooks/use-subscription';
import { Button } from '@/components/ui/button';

/**
 * Banner trạng thái thuê bao cho dashboard chủ nhà hàng (/admin).
 * - Gói Miễn Phí (active, chưa thanh toán) → xanh + nút nâng gói.
 * - Gói trả phí sắp hết (≤7 ngày) → cam + nút gia hạn.
 * - Đã lên lịch hạ gói (pendingPlanKey) → thông tin áp dụng cuối chu kỳ.
 * - Bị khoá → đỏ + nút thanh toán ngay.
 * Nếu không có dữ liệu thuê bao (không phải admin / không có nhà hàng) → không hiển thị gì.
 */
export function SubscriptionBanner() {
  const navigate = useNavigate();
  const activeRestaurantId = useActiveRestaurantId();
  const { getStateForRestaurant } = useSubscription();
  const state = activeRestaurantId ? getStateForRestaurant(activeRestaurantId) : undefined;

  if (!state) return null;

  const { subscription, daysLeft, paidUntil, pendingPlanKey, currentPlanKey } = state;
  const isFree = subscription === 'active' && !paidUntil;
  const isExpiring = subscription === 'active' && !!paidUntil && daysLeft <= 7;

  // Chờ thanh toán (chi nhánh mới tạo chưa trả phí) → cam
  if (subscription === 'pending') {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-orange-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-orange-800">Nhà hàng đang chờ thanh toán</p>
            <p className="text-xs text-orange-600 mt-0.5">
              Hoàn tất thanh toán để kích hoạt chi nhánh và bắt đầu vận hành.
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate('/admin/billing')}
          className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl h-10 shrink-0 font-semibold"
        >
          <CreditCard className="mr-2 h-4 w-4" /> Thanh toán
        </Button>
      </div>
    );
  }

  // Bị khoá → đỏ
  if (subscription === 'locked') {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 mb-6">
        <div className="flex items-start gap-3">
          <XCircle className="mt-0.5 h-5 w-5 text-rose-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-rose-800">
              Nhà hàng đã bị khoá do hết hạn thanh toán
            </p>
            <p className="text-xs text-rose-600 mt-0.5">
              Thanh toán để mở lại ngay và tiếp tục phục vụ khách.
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate('/admin/billing')}
          className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-10 shrink-0 font-semibold"
        >
          <CreditCard className="mr-2 h-4 w-4" /> Thanh toán ngay
        </Button>
      </div>
    );
  }

  // Đã lên lịch hạ gói → thông báo cuối chu kỳ
  if (pendingPlanKey) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 mb-6">
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-800">
              Đã lên lịch hạ gói — áp dụng khi hết hạn chu kỳ
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Gói mới sẽ tự động có hiệu lực khi chu kỳ hiện tại kết thúc.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/admin/billing')}
          className="rounded-xl h-10 shrink-0 font-semibold text-amber-700 border-amber-300 hover:bg-amber-100"
        >
          Xem chi tiết
        </Button>
      </div>
    );
  }

  // Gói trả phí sắp hết (≤7 ngày) → cam
  if (isExpiring) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-800">
              Gói sắp hết hạn — còn {daysLeft} ngày
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Gia hạn để tiếp tục dùng gói; nếu hết hạn nhà hàng sẽ tự chuyển về gói Miễn Phí.
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate('/admin/billing')}
          className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-10 shrink-0 font-semibold"
        >
          <CreditCard className="mr-2 h-4 w-4" /> Gia hạn
        </Button>
      </div>
    );
  }

  // Gói Miễn Phí → xanh + nút nâng cấp
  if (isFree) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 mb-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-sky-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-sky-800">
              Bạn đang dùng gói Miễn Phí{currentPlanKey ? ` (${currentPlanKey})` : ''}
            </p>
            <p className="text-xs text-sky-600 mt-0.5">
              Nâng cấp để mở khoá thêm bàn, món, nhân viên và tính năng cao cấp.
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate('/admin/billing')}
          className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl h-10 shrink-0 font-semibold"
        >
          <CreditCard className="mr-2 h-4 w-4" /> Nâng cấp gói
        </Button>
      </div>
    );
  }

  // active + còn hạn → không cần banner
  return null;
}
