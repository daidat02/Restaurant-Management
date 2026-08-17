import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, CreditCard, XCircle } from 'lucide-react';
import { useActiveRestaurantId } from '@/hooks/use-active-restaurant';
import { useSubscription } from '@/hooks/use-subscription';
import { Button } from '@/components/ui/button';

/**
 * Banner trạng thái thuê bao cho dashboard chủ nhà hàng (/admin).
 * - Trial còn nhiều ngày → xanh
 * - Trial sắp hết (≤7 ngày) → cam + nút gia hạn
 * - Bị khoá → đỏ + nút thanh toán ngay
 * Nếu không có dữ liệu thuê bao (không phải admin / không có nhà hàng) → không hiển thị gì.
 */
export function SubscriptionBanner() {
  const navigate = useNavigate();
  const activeRestaurantId = useActiveRestaurantId();
  const { getStateForRestaurant } = useSubscription();
  const state = activeRestaurantId ? getStateForRestaurant(activeRestaurantId) : undefined;

  if (!state) return null;

  const { subscription, daysLeft } = state;

  // Chờ thanh toán (chi nhánh mới tạo chưa trả phí) → cam
  if (subscription === 'pending') {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-orange-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-orange-800">
              Nhà hàng đang chờ thanh toán
            </p>
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

  // Trial sắp hết (≤7 ngày) → cam
  if (subscription === 'trial' && daysLeft <= 7) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-800">
              Trial sắp hết hạn — còn {daysLeft} ngày
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Thanh toán để không bị gián đoạn hoạt động.
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate('/admin/billing')}
          className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-10 shrink-0 font-semibold"
        >
          <CreditCard className="mr-2 h-4 w-4" /> Gia hạn / Thanh toán
        </Button>
      </div>
    );
  }

  // Đang dùng thử → xanh
  if (subscription === 'trial') {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 mb-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-sky-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-sky-800">
              Bạn đang dùng thử miễn phí — còn lại {daysLeft} ngày
            </p>
            <p className="text-xs text-sky-600 mt-0.5">
              Nhà hàng đầu tiên được dùng thử 30 ngày, không tính phí.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/admin/billing')}
          className="rounded-xl h-10 shrink-0 font-semibold text-sky-700 border-sky-300 hover:bg-sky-100"
        >
          Xem gói thanh toán
        </Button>
      </div>
    );
  }

  // active → không cần banner
  return null;
}
