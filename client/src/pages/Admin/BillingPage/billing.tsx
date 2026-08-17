import { useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Check,
  CreditCard,
  Crown,
  Loader2,
  ReceiptText,
  RotateCcw,
  QrCode,
  Landmark,
} from 'lucide-react';
import { toast } from 'sonner';

import { useSubscription } from '@/hooks/use-subscription';
import type { IPlan } from '@/types/subscription.type';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/TableData';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PaymentDialog, type PaymentMethod } from './PaymentDialog';
import { StatusTag } from '@/components/StatusTag';
import { PaymentSuccessDialog } from '@/components/PaymentSuccessDialog';

const CYCLE_MONTHS: (1 | 3 | 6 | 12)[] = [1, 3, 6, 12];

const fmtVND = (n: number) => `${n.toLocaleString('vi-VN')}đ`;
const fmtDate = (d: Date | string) => format(new Date(d), 'dd/MM/yyyy', { locale: vi });

const STATE_LABEL: Record<string, { text: string; className: string }> = {
  active: { text: 'Đang hoạt động', className: 'bg-emerald-50 text-emerald-700' },
  trial: { text: 'Dùng thử', className: 'bg-amber-50 text-amber-700' },
  locked: { text: 'Bị khoá', className: 'bg-rose-50 text-rose-700' },
  pending: { text: 'Chờ thanh toán', className: 'bg-orange-50 text-orange-700' },
};

const METHOD_LABEL: Record<PaymentMethod, { text: string; desc: string }> = {
  payos: { text: 'PayOS', desc: 'Quét QR hoặc chuyển khoản qua PayOS' },
  vnpay: { text: 'VNPay', desc: 'Thanh toán qua cổng VNPay' },
};

export default function BillingPage() {
  const {
    subscriptions,
    transactions,
    pricing,
    isLoading,
    createPayosUrl,
    createVnpayUrl,
    listenPaymentResult,
    stopListeningPaymentResult,
    refresh,
  } = useSubscription();

  const [restaurantId, setRestaurantId] = useState('');
  const [cycleMonths, setCycleMonths] = useState<1 | 3 | 6 | 12>(1);

  const [paying, setPaying] = useState(false);
  // Gói đang được chọn để thanh toán ('' = chưa chọn).
  const [paymentPlan, setPaymentPlan] = useState<IPlan | undefined>(undefined);
  const [paymentOpen, setPaymentOpen] = useState(false);
  // Phương thức thanh toán được chọn.
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('payos');
  // Link thanh toán hiện tại (PayOS có qrCodeData).
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [qrCodeData, setQrCodeData] = useState('');
  const [lastPayment, setLastPayment] = useState<{
    restaurantName: string;
    amount: number;
    paidUntil: string;
  } | null>(null);
  const plansRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  const plans = useMemo(() => pricing?.plans ?? [], [pricing]);

  // Nhà hàng mặc định: ưu tiên bị khoá hoặc sắp hết hạn trial
  const defaultRestaurant = useMemo(() => {
    if (subscriptions.length === 0) return undefined;
    return (
      subscriptions.find((s) => s.subscription === 'locked') ||
      subscriptions.find((s) => s.subscription === 'trial' && s.daysLeft <= 7) ||
      subscriptions[0]
    );
  }, [subscriptions]);

  const selected = subscriptions.find((s) => String(s._id) === restaurantId) || defaultRestaurant;

  // Gói đang dùng: ưu tiên gói lưu trên nhà hàng (currentPlanKey), fallback transaction mới nhất, rồi gói nổi bật.
  const currentPlan = useMemo<IPlan | undefined>(() => {
    if (!selected) return undefined;
    if (selected.currentPlanKey) {
      const byKey = plans.find((p) => p.key === selected.currentPlanKey);
      if (byKey) return byKey;
    }
    const tx = transactions.find(
      (t) =>
        t.planName &&
        (typeof t.restaurant === 'object'
          ? String(t.restaurant._id) === String(selected._id)
          : String(t.restaurant) === String(selected._id)),
    );
    if (tx?.planKey) return plans.find((p) => p.key === tx.planKey);
    return plans.find((p) => p.isPopular) ?? plans[0];
  }, [selected, transactions, plans]);

  // Còn hạn (active + chưa hết hạn) → không được hạ gói.
  const inTerm = useMemo(
    () =>
      !!selected &&
      selected.subscription === 'active' &&
      !!selected.paidUntil &&
      new Date(selected.paidUntil).getTime() > new Date().getTime(),
    [selected],
  );

  // Gói thấp hơn gói hiện tại (so theo sortOrder) → chặn khi còn hạn.
  const isDowngrade = (plan: IPlan) =>
    !!currentPlan &&
    currentPlan.key !== plan.key &&
    inTerm &&
    (currentPlan.sortOrder ?? 0) > (plan.sortOrder ?? 0);

  // Mức giảm so với trả theo tháng (chỉ hiển thị khi thực sự rẻ hơn)
  const cycleSavingPct = (months: number, p: number) => {
    if (!selectedPlanForPrice || selectedPlanForPrice.priceMonthly <= 0) return 0;
    const monthlyRate = p / months;
    return Math.max(0, Math.round((1 - monthlyRate / selectedPlanForPrice.priceMonthly) * 100));
  };

  const selectedPlanForPrice = paymentPlan ?? currentPlan;
  const cycleText = cycleMonths === 1 ? '1 tháng' : `${cycleMonths} tháng`;

  // Phản hồi kết quả thanh toán từ webhook/return qua socket: đóng dialog, hiện màn hình thành công.
  const handlePaymentResult = (ev: { status: 'success' | 'cancelled' }) => {
    setPaymentOpen(false);
    setPaymentPlan(undefined);
    stopListeningPaymentResult();

    if (ev.status === 'success') {
      const amount = paymentPlan?.cycles[cycleMonths] ?? 0;
      const updated = subscriptions.find(
        (s) => selected && String(s._id) === String(selected._id),
      );
      const paidUntil = updated?.paidUntil
        ? new Date(updated.paidUntil).toISOString()
        : new Date().toISOString();
      setLastPayment({
        restaurantName: selected?.name ?? '',
        amount,
        paidUntil,
      });
      void refresh();
    } else {
      void refresh();
    }
  };

  const openPayDialog = async (plan?: IPlan) => {
    if (!plan) {
      toast.info('Hãy chọn một gói ở phần Nâng cấp gói', { position: 'top-right' });
      plansRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (plan.contactOnly) {
      toast.info('Vui lòng liên hệ bán hàng để được tư vấn gói này', { position: 'top-right' });
      return;
    }
    if (!selected) {
      toast.error('Vui lòng chọn nhà hàng cần thanh toán', { position: 'top-right' });
      return;
    }
    setPaymentPlan(plan);
    setCheckoutUrl('');
    setQrCodeData('');
    stopListeningPaymentResult();
    setPaymentOpen(true);

    // Tạo link theo phương thức đang chọn.
    setPaying(true);
    try {
      if (paymentMethod === 'payos') {
        const res = await createPayosUrl(selected._id, cycleMonths, plan.key);
        if (res.success && res.data) {
          setCheckoutUrl(res.data.checkoutUrl);
          setQrCodeData(res.data.qrCodeData);
          listenPaymentResult(res.data.transactionId, handlePaymentResult);
        }
      } else {
        const res = await createVnpayUrl(selected._id, cycleMonths, plan.key);
        if (res.success && res.data) {
          setCheckoutUrl(res.data.checkoutUrl);
          listenPaymentResult(res.data.transactionId, handlePaymentResult);
        }
      }
    } finally {
      setPaying(false);
    }
  };

  /** Mở trang thanh toán theo phương thức (PayOS checkout / VNPay cổng). */
  const handleOpenCheckout = () => {
    if (checkoutUrl) {
      window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // ---- Màn hình thanh toán thành công: hiển thị bằng PaymentSuccessDialog overlay (không swap page) ----

  const renewDate = selected
    ? selected.subscription === 'trial'
      ? selected.trialEndsAt
      : selected.paidUntil
    : undefined;

  const activeCount = subscriptions.filter((s) => s.subscription === 'active').length;
  const now = new Date();
  const currentMonthBilling = transactions
    .filter((t) => {
      const d = new Date(t.createdAt);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear() &&
        t.status === 'paid'
      );
    })
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="min-h-screen bg-slate-50 p-4 text-slate-800 md:p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 md:text-3xl">
              Thanh Toán &amp; Gói Dịch Vụ
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Quản lý gói đang dùng, nâng cấp và xem lịch sử thanh toán.
            </p>
          </div>
          <Button
            onClick={() => plansRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-cerulean-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-cerulean-blue-200 transition hover:bg-cerulean-blue-700"
          >
            <CreditCard className="h-4 w-4" /> Nâng cấp gói
          </Button>
        </div>

        <div className="mt-6 space-y-6">
          {/* GÓI ĐANG SỬ DỤNG + THÔNG TIN CHUYỂN KHOẢN */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Gói đang sử dụng */}
            <div className="rounded-2xl border-2 border-cerulean-blue-200 bg-white p-6 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-gray-900">Gói đang sử dụng</h3>
                {selected && (
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[11px] font-bold',
                      STATE_LABEL[selected.subscription]?.className ??
                        'bg-slate-100 text-slate-600',
                    )}
                  >
                    {STATE_LABEL[selected.subscription]?.text ?? selected.subscription}
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cerulean-blue-600 text-white shadow-lg shadow-cerulean-blue-200">
                  <Crown className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-extrabold text-gray-900">
                    {currentPlan?.name ?? 'Chưa chọn gói'}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {currentPlan && !currentPlan.contactOnly ? (
                      <>
                        {fmtVND(currentPlan.priceMonthly)}/tháng
                        {renewDate ? (
                          <>
                            {' · '}
                            <span className="font-semibold text-gray-800">
                              {selected?.subscription === 'trial' ? 'Hết hạn dùng thử' : 'Gia hạn'}{' '}
                              {fmtDate(renewDate)}
                            </span>
                          </>
                        ) : null}
                      </>
                    ) : (
                      <span>Chọn một gói bên dưới để gia hạn hoặc mở lại chi nhánh.</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Nhà hàng
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-gray-900">
                    {activeCount}{' '}
                    <span className="text-sm font-semibold text-slate-400">
                      / {subscriptions.length}
                    </span>
                  </p>
                  <p className="text-xs text-emerald-600">đang hoạt động</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Hoá đơn tháng này
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-cerulean-blue-600">
                    {fmtVND(currentMonthBilling)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {transactions.filter((t) => t.status === 'paid').length} giao dịch
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-600">Nhà hàng thanh toán</p>
                  {subscriptions.length > 0 ? (
                    <Select value={String(selected?._id ?? '')} onValueChange={setRestaurantId}>
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Chọn nhà hàng" />
                      </SelectTrigger>
                      <SelectContent>
                        {subscriptions.map((s) => (
                          <SelectItem key={s._id} value={s._id}>
                            {s.name} —{' '}
                            {s.subscription === 'locked'
                              ? 'Bị khoá'
                              : s.subscription === 'trial'
                                ? `Trial còn ${s.daysLeft} ngày`
                                : s.subscription === 'pending'
                                  ? 'Chờ thanh toán'
                                  : 'Đang hoạt động'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                      Bạn chưa có nhà hàng nào để thanh toán.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => historyRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-cerulean-blue-200 hover:text-cerulean-blue-600"
                  >
                    <ReceiptText className="h-4 w-4" /> Xem hoá đơn
                  </Button>
                </div>
              </div>
            </div>

            {/* Phương thức thanh toán */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <h3 className="text-sm font-bold text-gray-900">Phương thức thanh toán</h3>
              <p className="mt-0.5 text-xs text-slate-400">Chọn cổng thanh toán cho gói dịch vụ</p>
              <div className="mt-4 space-y-2.5">
                {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => {
                  const Icon = m === 'payos' ? QrCode : Landmark;
                  const active = paymentMethod === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition',
                        active
                          ? 'border-cerulean-blue-300 bg-cerulean-blue-50/60'
                          : 'border-slate-200 bg-white hover:border-cerulean-blue-200',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                          m === 'payos'
                            ? 'bg-cerulean-blue-600 text-white'
                            : 'bg-amber-100 text-amber-700',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800">{METHOD_LABEL[m].text}</p>
                        <p className="text-xs text-slate-400">{METHOD_LABEL[m].desc}</p>
                      </div>
                      <span
                        className={cn(
                          'flex h-4 w-4 items-center justify-center rounded-full border-2 transition',
                          active
                            ? 'border-cerulean-blue-600 bg-cerulean-blue-600'
                            : 'border-slate-300',
                        )}
                      >
                        {active && <Check className="h-2.5 w-2.5 text-white" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              <Button
                onClick={() =>
                  openPayDialog(currentPlan && !currentPlan.contactOnly ? currentPlan : undefined)
                }
                disabled={!selected}
                className="mt-4 h-10 w-full rounded-xl bg-cerulean-blue-600 text-sm font-semibold text-white shadow-lg shadow-cerulean-blue-200 transition hover:bg-cerulean-blue-700"
              >
                <RotateCcw className="h-4 w-4" /> Gia hạn gói
              </Button>
              <p className="mt-2 text-center text-[11px] text-slate-400">
                Chọn nhà hàng và gói, sau đó bấm gia hạn để tạo link thanh toán{' '}
                {METHOD_LABEL[paymentMethod].text}.
              </p>
            </div>
          </div>

          {/* NÂNG CẤP GÓI */}
          <div ref={plansRef} className="scroll-mt-24">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Nâng cấp gói</h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  Chọn gói phù hợp hơn với quy mô hiện tại của nhà hàng.
                </p>
              </div>
              <div className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                {CYCLE_MONTHS.map((months) => {
                  const active = cycleMonths === months;
                  const p = selectedPlanForPrice?.cycles[months] ?? 0;
                  const saving = selectedPlanForPrice ? cycleSavingPct(months, p) : 0;
                  return (
                    <button
                      key={months}
                      type="button"
                      onClick={() => setCycleMonths(months)}
                      className={cn(
                        'flex flex-col items-start rounded-lg px-3 py-1.5 text-left transition-colors',
                        active
                          ? 'bg-cerulean-blue-600 text-white'
                          : 'text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      <span
                        className={cn(
                          'text-xs font-bold',
                          active ? 'text-white' : 'text-slate-700',
                        )}
                      >
                        {months} tháng
                        {saving > 0 && months > 1 && (
                          <span
                            className={cn(
                              'ml-1 text-[10px] font-semibold',
                              active ? 'text-cerulean-blue-100' : 'text-emerald-600',
                            )}
                          >
                            −{saving}%
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {isLoading ? (
              <div className="mt-4 flex h-32 items-center justify-center text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tải danh sách gói...
              </div>
            ) : plans.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
                Chưa có gói dịch vụ nào được cấu hình.
              </div>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  {plans.map((plan) => {
                    const isCurrent = currentPlan?.key === plan.key;
                    const isPopularNow = plan.isPopular && !isCurrent;
                    const blockedDowngrade = isDowngrade(plan);
                    const price = plan.cycles[cycleMonths];
                    const saving = cycleSavingPct(cycleMonths, price);
                    return (
                      <div
                        key={plan._id ?? plan.key}
                        className={cn(
                          'relative flex flex-col rounded-2xl bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover',
                          isCurrent
                            ? 'border-2 border-emerald-300 bg-emerald-50/40'
                            : isPopularNow
                              ? 'border-2 border-cerulean-blue-500'
                              : 'border border-slate-200',
                        )}
                      >
                        {isCurrent && (
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white">
                            ĐANG DÙNG
                          </span>
                        )}
                        {isPopularNow && (
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-cerulean-blue-600 px-3 py-1 text-[11px] font-bold text-white">
                            {plan.badge || 'PHỔ BIẾN NHẤT'}
                          </span>
                        )}

                        <p
                          className={cn(
                            'text-sm font-bold',
                            isPopularNow ? 'text-cerulean-blue-700' : 'text-gray-900',
                          )}
                        >
                          {plan.name}
                        </p>
                        {plan.description && (
                          <p className="mt-1 text-xs text-slate-500">{plan.description}</p>
                        )}

                        <p className="mt-4 text-3xl font-extrabold text-gray-900">
                          {plan.contactOnly ? (
                            'Liên hệ'
                          ) : (
                            <>
                              {fmtVND(price)}
                              <span className="ml-1 text-sm font-medium text-slate-400">
                                /{cycleText}
                              </span>
                            </>
                          )}
                        </p>
                        {saving > 0 && !plan.contactOnly && cycleMonths > 1 && (
                          <p className="mt-0.5 text-[11px] font-semibold text-emerald-600">
                            Tiết kiệm {saving}%
                          </p>
                        )}

                        <ul className="mt-4 flex flex-col gap-2 text-sm text-slate-600">
                          {plan.features.map((f) => (
                            <li key={f} className="flex items-center gap-2">
                              <Check className="h-4 w-4 shrink-0 text-emerald-500" /> {f}
                            </li>
                          ))}
                        </ul>

                        <div className="mt-auto pt-5">
                          <Button
                            disabled={isCurrent || blockedDowngrade}
                            onClick={() => openPayDialog(plan)}
                            className={cn(
                              'w-full rounded-xl text-sm font-semibold',
                              isCurrent || blockedDowngrade
                                ? 'border border-slate-200 bg-white text-slate-400'
                                : isPopularNow
                                  ? 'bg-cerulean-blue-600 text-white shadow-lg shadow-cerulean-blue-200 hover:bg-cerulean-blue-700'
                                  : 'border border-slate-200 bg-white text-slate-600 hover:border-cerulean-blue-300 hover:text-cerulean-blue-600',
                            )}
                            variant={
                              isCurrent || blockedDowngrade
                                ? 'outline'
                                : isPopularNow
                                  ? 'default'
                                  : 'outline'
                            }
                          >
                            {isCurrent
                              ? 'Gói hiện tại'
                              : plan.contactOnly
                                ? 'Liên hệ bán hàng'
                                : blockedDowngrade
                                  ? 'Còn hạn — không hạ gói'
                                  : 'Nâng cấp'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-center text-xs text-slate-400">
                  Giá hiển thị theo chu kỳ đang chọn. Chọn gói để mở modal thanh toán chuyển khoản.
                </p>
              </>
            )}
          </div>

          {/* LỊCH SỬ THANH TOÁN */}
          <div
            ref={historyRef}
            className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white shadow-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-5">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Lịch sử thanh toán</h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Toàn bộ giao dịch nâng cấp và gia hạn của nhà hàng
                </p>
              </div>
              <span className="rounded-full bg-cerulean-blue-50 px-3 py-1 text-xs font-semibold text-cerulean-blue-700">
                {transactions.length} giao dịch
              </span>
            </div>
            <DataTable
              data={transactions}
              isLoading={isLoading}
              emptyMessage="Chưa có hoá đơn nào."
              minWidth="900px"
              getRowKey={(t) => t._id}
              striped
              columns={[
                {
                  header: 'Mã giao dịch',
                  render: (t) => (
                    <span className="font-mono text-xs text-cerulean-blue-700">
                      #{t.transactionId}
                    </span>
                  ),
                },
                {
                  header: 'Nhà hàng',
                  render: (t) => (
                    <span className="text-slate-700">
                      {typeof t.restaurant === 'object' ? t.restaurant.name : '—'}
                    </span>
                  ),
                },
                {
                  header: 'Gói dịch vụ',
                  render: (t) => (
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800">
                        {t.planName || 'Gói mặc định'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {t.cycleMonths === 1 ? '1 tháng' : `${t.cycleMonths} tháng`}
                      </span>
                    </div>
                  ),
                },
                {
                  header: 'Ngày tạo',
                  render: (t) => (
                    <div className="flex flex-col">
                      <span className="text-slate-700">{fmtDate(t.createdAt)}</span>
                      <span className="text-xs text-slate-400">
                        {format(new Date(t.createdAt), 'HH:mm', { locale: vi })}
                      </span>
                    </div>
                  ),
                },
                {
                  header: 'Hạn sử dụng',
                  render: (t) => (
                    <span className="text-slate-600">
                      {t.paidUntil ? fmtDate(t.paidUntil) : '—'}
                    </span>
                  ),
                },
                {
                  header: 'Số tiền',
                  render: (t) => (
                    <span className="font-bold text-gray-900">{fmtVND(t.amount)}</span>
                  ),
                },
                {
                  header: 'Trạng thái',
                  render: (t) => <StatusTag status={t.status} />,
                },
              ]}
            />
          </div>
        </div>

        {/* MODAL THANH TOÁN */}
        <PaymentDialog
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          planName={paymentPlan?.name ?? currentPlan?.name ?? 'Gói dịch vụ'}
          cycleText={cycleText}
          restaurantName={selected?.name ?? ''}
          price={paymentPlan?.cycles[cycleMonths] ?? currentPlan?.cycles[cycleMonths] ?? 0}
          method={paymentMethod}
          checkoutUrl={checkoutUrl}
          qrCodeData={qrCodeData}
          paying={paying}
          onOpenCheckout={handleOpenCheckout}
        />

        {/* DIALOG THÀNH CÔNG — overlay, ở nguyên trang */}
        <PaymentSuccessDialog
          open={!!lastPayment}
          title="Thanh toán thành công"
          subtitle={`${lastPayment?.restaurantName ?? ''} đã được kích hoạt và hoạt động bình thường.`}
          rows={
            lastPayment
              ? [
                  { label: 'Nhà hàng', value: lastPayment.restaurantName },
                  {
                    label: 'Số tiền',
                    value: (
                      <span className="font-bold text-cerulean-blue-600">
                        {fmtVND(lastPayment.amount)}
                      </span>
                    ),
                  },
                  { label: 'Thanh toán tới ngày', value: fmtDate(lastPayment.paidUntil) },
                ]
              : []
          }
          confirmLabel="Xem lịch sử hoá đơn"
          onConfirm={() => {
            setLastPayment(null);
            void refresh();
          }}
        />
      </div>
    </div>
  );
}
