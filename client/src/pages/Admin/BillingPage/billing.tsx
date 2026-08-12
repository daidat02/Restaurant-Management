import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Check, CheckCircle2, CreditCard, Crown, Loader2, ReceiptText, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import { useSubscription } from '@/hooks/use-subscription';
import { useSetting } from '@/hooks/use-setting';
import type { IPlan, ITransaction } from '@/types/subscription.type';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PaymentDialog } from './PaymentDialog';

const CYCLE_MONTHS: (1 | 3 | 6 | 12)[] = [1, 3, 6, 12];

const fmtVND = (n: number) => `${n.toLocaleString('vi-VN')}đ`;
const fmtDate = (d: Date | string) => format(new Date(d), 'dd/MM/yyyy', { locale: vi });

const STATE_LABEL: Record<string, { text: string; className: string }> = {
  active: { text: 'Đang hoạt động', className: 'bg-emerald-50 text-emerald-700' },
  trial: { text: 'Dùng thử', className: 'bg-amber-50 text-amber-700' },
  locked: { text: 'Bị khoá', className: 'bg-rose-50 text-rose-700' },
};

/** Sinh mã thanh toán (nội dung chuyển khoản) dạng NHOS-XXXXXX. */
const genPaymentCode = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return `NHOS-${Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')}`;
};

export default function BillingPage() {
  const { subscriptions, transactions, pricing, isLoading, pay, refresh } = useSubscription();
  const { currentSetting, fetchOrCreateSetting } = useSetting();

  const [restaurantId, setRestaurantId] = useState('');
  const [cycleMonths, setCycleMonths] = useState<1 | 3 | 6 | 12>(1);
  const [paying, setPaying] = useState(false);
  // Gói đang được chọn để thanh toán ('' = chưa chọn).
  const [paymentPlan, setPaymentPlan] = useState<IPlan | undefined>(undefined);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentCode, setPaymentCode] = useState('');
  const [lastPayment, setLastPayment] = useState<{ restaurantName: string; amount: number; paidUntil: string } | null>(null);
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
      (t) => t.planName && (typeof t.restaurant === 'object' ? String(t.restaurant._id) === String(selected._id) : String(t.restaurant) === String(selected._id)),
    );
    if (tx?.planKey) return plans.find((p) => p.key === tx.planKey);
    return plans.find((p) => p.isPopular) ?? plans[0];
  }, [selected, transactions, plans]);

  // Tải cấu hình (thông tin chuyển khoản nhận tiền) theo nhà hàng đang chọn
  useEffect(() => {
    if (!selected) return;
    void fetchOrCreateSetting('restaurant', 'Restaurant', selected._id);
  }, [selected, fetchOrCreateSetting]);

  const bankAccount = currentSetting?.bankAccount;

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

  const openPayDialog = (plan?: IPlan) => {
    if (!plan) {
      toast.info('Hãy chọn một gói ở phần Nâng cấp gói', { position: 'top-right' });
      plansRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (plan.contactOnly) {
      toast.info('Vui lòng liên hệ bán hàng để được tư vấn gói này', { position: 'top-right' });
      return;
    }
    setPaymentPlan(plan);
    setPaymentCode(genPaymentCode());
    setPaymentOpen(true);
  };

  const handlePay = async () => {
    if (!selected || !paymentPlan) return;
    setPaying(true);
    try {
      const result = await pay(selected._id, cycleMonths, paymentPlan.key);
      if (result.success && result.data) {
        setLastPayment({
          restaurantName: selected.name,
          amount: result.data.transaction.amount,
          paidUntil: result.data.paidUntil,
        });
        setPaymentOpen(false);
        setPaymentPlan(undefined);
      } else {
        setPaymentOpen(false);
        setPaymentPlan(undefined);
        await refresh();
      }
    } finally {
      setPaying(false);
    }
  };

  // ---- Màn hình thanh toán thành công ----
  if (lastPayment) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
          <div className="mx-auto max-w-xl rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" />
            </div>
            <h1 className="mt-4 text-2xl font-extrabold text-gray-900">Thanh toán thành công</h1>
            <p className="mt-1 text-sm text-slate-500">
              {lastPayment.restaurantName} đã được mở lại và hoạt động bình thường.
            </p>
            <div className="mt-6 space-y-3 rounded-xl bg-slate-50 p-5 text-left text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Nhà hàng</span>
                <span className="font-semibold text-slate-800">{lastPayment.restaurantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số tiền</span>
                <span className="font-bold text-cerulean-blue-600">{fmtVND(lastPayment.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Thanh toán tới ngày</span>
                <span className="font-semibold text-slate-800">{fmtDate(lastPayment.paidUntil)}</span>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2.5">
              <Button
                onClick={() => {
                  setLastPayment(null);
                  void refresh();
                }}
                className="h-11 w-full rounded-xl bg-cerulean-blue-600 text-white hover:bg-cerulean-blue-700"
              >
                Xem lịch sử hoá đơn
              </Button>
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="h-11 w-full rounded-xl text-slate-600"
              >
                Quay lại quản trị
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
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
            <p className="mt-1 text-sm text-slate-500">Quản lý gói đang dùng, nâng cấp và xem lịch sử thanh toán.</p>
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
                  <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold', STATE_LABEL[selected.subscription]?.className ?? 'bg-slate-100 text-slate-600')}>
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
                              {selected?.subscription === 'trial' ? 'Hết hạn dùng thử' : 'Gia hạn'} {fmtDate(renewDate)}
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
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Nhà hàng</p>
                  <p className="mt-1 text-xl font-extrabold text-gray-900">
                    {activeCount} <span className="text-sm font-semibold text-slate-400">/ {subscriptions.length}</span>
                  </p>
                  <p className="text-xs text-emerald-600">đang hoạt động</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Hoá đơn tháng này</p>
                  <p className="mt-1 text-xl font-extrabold text-cerulean-blue-600">{fmtVND(currentMonthBilling)}</p>
                  <p className="text-xs text-slate-400">{transactions.length} giao dịch</p>
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
                    onClick={() => openPayDialog(currentPlan && !currentPlan.contactOnly ? currentPlan : undefined)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-cerulean-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-cerulean-blue-200 transition hover:bg-cerulean-blue-700"
                  >
                    <RotateCcw className="h-4 w-4" /> Gia hạn gói
                  </Button>
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

            {/* Thông tin chuyển khoản */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <h3 className="text-sm font-bold text-gray-900">Thông tin chuyển khoản</h3>
              <div className="mt-4 space-y-2.5">
                {[
                  { label: 'Ngân hàng', value: bankAccount?.bankName || '—' },
                  { label: 'Số tài khoản', value: bankAccount?.accountNumber || '—' },
                  { label: 'Chủ tài khoản', value: bankAccount?.accountName || '—' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                    <span className="text-xs font-semibold text-slate-400">{row.label}</span>
                    <span className={cn('text-sm font-bold', row.value === '—' ? 'text-slate-300' : 'text-slate-800')}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-4 rounded-xl bg-cerulean-blue-50 p-3.5 text-xs leading-relaxed text-cerulean-blue-700">
                Bắt buộc ghi đúng <strong>nội dung chuyển khoản</strong> hiển thị khi bạn chọn gói. Nếu
                nhập sai hoặc thêm, bớt ký tự, giao dịch sẽ không được tự động ghi nhận.
              </p>
            </div>
          </div>

          {/* NÂNG CẤP GÓI */}
          <div ref={plansRef} className="scroll-mt-24">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Nâng cấp gói</h3>
                <p className="mt-0.5 text-sm text-slate-500">Chọn gói phù hợp hơn với quy mô hiện tại của nhà hàng.</p>
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
                        active ? 'bg-cerulean-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      <span className={cn('text-xs font-bold', active ? 'text-white' : 'text-slate-700')}>
                        {months} tháng
                        {saving > 0 && months > 1 && (
                          <span className={cn('ml-1 text-[10px] font-semibold', active ? 'text-cerulean-blue-100' : 'text-emerald-600')}>
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

                        <p className={cn('text-sm font-bold', isPopularNow ? 'text-cerulean-blue-700' : 'text-gray-900')}>
                          {plan.name}
                        </p>
                        {plan.description && <p className="mt-1 text-xs text-slate-500">{plan.description}</p>}

                        <p className="mt-4 text-3xl font-extrabold text-gray-900">
                          {plan.contactOnly ? (
                            'Liên hệ'
                          ) : (
                            <>
                              {fmtVND(price)}
                              <span className="ml-1 text-sm font-medium text-slate-400">/{cycleText}</span>
                            </>
                          )}
                        </p>
                        {saving > 0 && !plan.contactOnly && cycleMonths > 1 && (
                          <p className="mt-0.5 text-[11px] font-semibold text-emerald-600">Tiết kiệm {saving}%</p>
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
                            variant={isCurrent || blockedDowngrade ? 'outline' : isPopularNow ? 'default' : 'outline'}
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
          <div ref={historyRef} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white shadow-card">
            <div className="border-b border-slate-100 p-5">
              <h3 className="text-sm font-bold text-gray-900">Lịch sử thanh toán</h3>
              <p className="mt-0.5 text-xs text-slate-400">Toàn bộ giao dịch nâng cấp và gia hạn của nhà hàng</p>
            </div>
            {transactions.length === 0 ? (
              <p className="p-8 text-sm text-slate-400">Chưa có hoá đơn nào.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-3">Mã giao dịch</th>
                      <th className="px-5 py-3">Gói</th>
                      <th className="px-5 py-3">Ngày tạo</th>
                      <th className="px-5 py-3">Số tiền</th>
                      <th className="px-5 py-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.slice(0, 12).map((t: ITransaction) => {
                      const year = new Date(t.createdAt).getFullYear();
                      const code = `INV-${year}-${String(t._id).slice(-4).toUpperCase()}`;
                      return (
                        <tr key={t._id} className="transition-colors hover:bg-cerulean-blue-50/60">
                          <td className="px-5 py-3.5 font-semibold text-cerulean-blue-700">{code}</td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {t.planName ? `${t.planName} (${t.cycleMonths === 1 ? 'tháng' : 'năm'})` : `${t.cycleMonths} tháng`}
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {fmtDate(t.createdAt)}
                            <span className="text-slate-400">{format(new Date(t.createdAt), ' · HH:mm', { locale: vi })}</span>
                          </td>
                          <td className="px-5 py-3.5 font-bold text-gray-900">{fmtVND(t.amount)}</td>
                          <td className="px-5 py-3.5">
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              Đã thanh toán
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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
          paymentCode={paymentCode}
          bank={bankAccount}
          paying={paying}
          onConfirm={handlePay}
        />
      </div>
    </div>
  );
}