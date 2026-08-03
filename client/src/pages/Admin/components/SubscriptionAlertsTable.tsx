import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CreditCard, XCircle, CalendarClock } from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * Bảng cảnh báo thuê bao cho dashboard admin (chủ chuỗi) — /admin.
 * Liệt kê từng chi nhánh đang bị khoá (locked) hoặc trial sắp hết (≤7 ngày),
 * mỗi dòng có nút thanh toán → /admin/billing. Không có chi nhánh cảnh báo → ẩn.
 */
export function SubscriptionAlertsTable() {
  const navigate = useNavigate();
  const { subscriptions } = useSubscription();

  const alerts = (subscriptions ?? []).filter(
    (s) =>
      s.subscription === 'locked' ||
      (s.subscription === 'trial' && typeof s.daysLeft === 'number' && s.daysLeft <= 7),
  );

  if (alerts.length === 0) return null;

  const formatDate = (value?: Date | string) => {
    if (!value) return '—';
    try {
      return format(new Date(value), 'dd/MM/yyyy', { locale: vi });
    } catch {
      return '—';
    }
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 overflow-hidden mb-6">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-amber-100 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <h3 className="text-sm font-bold text-amber-800">Cảnh báo thuê bao — chi nhánh cần xử lý</h3>
      </div>

      <div className="divide-y divide-amber-100/70">
        {alerts.map((s) => {
          const isLocked = s.subscription === 'locked';
          return (
            <div
              key={String(s._id)}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${
                    isLocked ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                  }`}
                >
                  {isLocked ? <XCircle className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">{s.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isLocked
                      ? 'Bị khoá do hết hạn thanh toán'
                      : `Trial sắp hết hạn — còn ${s.daysLeft} ngày`}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Hết hạn: {formatDate(s.trialEndsAt ?? s.paidUntil)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/admin/billing')}
                className={`flex items-center justify-center gap-1.5 px-4 h-9 rounded-xl text-xs font-semibold text-white shrink-0 transition-all ${
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
  );
}
