import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CreditCard, XCircle, CalendarClock } from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * Cảnh báo thuê bao cho dashboard admin (chủ chuỗi) — /admin.
 * Đầu khối là banner gradient amber tổng hợp (đồng bộ super-admin dashboard):
 * số chi nhánh bị khoá / trial sắp hết + nút xử lý → /admin/billing.
 * Phía dưới liệt kê từng chi nhánh đang cần xử lý. Không có cảnh báo → ẩn toàn bộ.
 */
export function SubscriptionAlertsTable() {
  const navigate = useNavigate();
  const { subscriptions } = useSubscription();

  const alerts = (subscriptions ?? []).filter(
    (s) =>
      s.subscription === 'locked' ||
      (s.subscription === 'active' &&
        !!s.paidUntil &&
        typeof s.daysLeft === 'number' &&
        s.daysLeft >= 0 &&
        s.daysLeft <= 7),
  );

  if (alerts.length === 0) return null;

  const lockedCount = alerts.filter((s) => s.subscription === 'locked').length;
  const expiringCount = alerts.length - lockedCount;

  const formatDate = (value?: Date | string) => {
    if (!value) return '—';
    try {
      return format(new Date(value), 'dd/MM/yyyy', { locale: vi });
    } catch {
      return '—';
    }
  };

  return (
    <div className="mb-6 space-y-4">
      {/* Banner tổng hợp — đồng bộ style super-admin dashboard */}
      <div className="flex flex-col gap-3 rounded-2xl border border-amber-200/70 bg-gradient-to-r from-amber-50 to-orange-50 p-4 sm:flex-row sm:items-center">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-amber-900">
            {alerts.length} nhà hàng cần gia hạn thuê bao
          </p>
          <p className="mt-0.5 text-xs text-amber-700">
            {lockedCount} bị khoá do hết hạn thanh toán{lockedCount > 0 && expiringCount > 0 ? ' · ' : ''}
            {expiringCount > 0 ? `${expiringCount} gói sắp hết hạn` : ''} — xử lý để tránh gián đoạn
            vận hành.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/billing')}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-amber-600"
        >
          Xử lý ngay <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Danh sách chi tiết từng chi nhánh cần xử lý */}
      <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/60">
        <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-5 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-bold text-amber-800">Chi nhánh cần xử lý</h3>
        </div>

        <div className="divide-y divide-amber-100/70">
          {alerts.map((s) => {
            const isLocked = s.subscription === 'locked';
            return (
              <div
                key={String(s._id)}
                className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      isLocked ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                    }`}
                  >
                    {isLocked ? <XCircle className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{s.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {isLocked
                        ? 'Bị khoá do hết hạn thanh toán'
                        : `Gói sắp hết hạn — còn ${s.daysLeft} ngày`}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Hết hạn: {formatDate(s.paidUntil)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/admin/billing')}
                  className={`flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-semibold text-white transition-all ${
                    isLocked ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  <CreditCard className="h-4 w-4" /> Thanh toán
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
