import { useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Check,
  CheckCircle2,
  CreditCard,
  Crown,
  Loader2,
  ReceiptText,
  RotateCcw,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { useSubscription } from '@/hooks/use-subscription';
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

const CYCLE_MONTHS: (1 | 3 | 6 | 12)[] = [1, 3, 6, 12];

const fmtVND = (n: number) => `${n.toLocaleString('vi-VN')}đ`;
const fmtDate = (d: Date | string) => format(new Date(d), 'dd/MM/yyyy', { locale: vi });

const STATE_LABEL: Record<string, { text: string; className: string }> = {
  active: { text: 'Đang hoạt động', className: 'bg-emerald-50 text-emerald-700' },
  trial: { text: 'Dùng thử', className: 'bg-amber-50 text-amber-700' },
  locked: { text: 'Bị khoá', className: 'bg-rose-50 text-rose-700' },
};

export default function BillingPage() {
  const { subscriptions, transactions, pricing, isLoading, pay, refresh } = useSubscription();

  const [restaurantId, setRestaurantId] = useState('');
  const [cycleMonths, setCycleMonths] = useState<1 | 3 | 6 | 12>(1);
  const [paying, setPaying] = useState(false);
  // Gói đang được chọn để thanh toán ('' = chưa chọn).
  const [selectedPlanKey, setSelectedPlanKey] = useState<string | undefined>(undefined);
  const [lastPayment, setLastPayment] = useState<{ restaurantName: string; amount: number; paidUntil: string } | null>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const checkoutRef = useRef<HTMLDivElement>(null);
  const plansRef = useRef<HTMLDivElement>(null);

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

  const selectedPlan = plans.find((p) => p.key === selectedPlanKey);

  // Giá chu kỳ của gói đang chọn (không dùng cycles legacy nữa)
  const price = selectedPlan ? selectedPlan.cycles[cycleMonths] : 0;

  // Còn hạn (active + chưa hết hạn) → không được hạ gói.
  const inTerm = useMemo(
    () =>
      !!selected &&
      selected.subscription === 'active' &&
      !!selected.paidUntil &&
      new Date(selected.paidUntil).getTime() > Date.now(),
    [selected],
  );

  // Gói thấp hơn gói hiện tại (so theo sortOrder) → chặn khi còn hạn.
  const isDowngrade = (plan: IPlan) =>
    !!currentPlan &&
    currentPlan.key !== plan.key &&
    inTerm &&
    (currentPlan.sortOrder ?? 0) > (plan.sortOrder ?? 0);

  const newPaidUntil = useMemo(() => {
    const base = selected?.paidUntil && new Date(selected.paidUntil).getTime() > Date.now()
      ? new Date(selected.paidUntil)
      : new Date();
    return new Date(base.getTime() + cycleMonths * 30 * 24 * 3600 * 1000);
  }, [selected, cycleMonths]);

  const openPayDialog = (planKey?: string) => {
    setSelectedPlanKey(planKey);
    setCycleMonths(1);
    checkoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handlePay = async () => {
    if (!selected) return;
    setPaying(true);
    try {
      const result = await pay(selected._id, cycleMonths, selectedPlanKey);
      if (result.success && result.data) {
        setLastPayment({
          restaurantName: selected.name,
          amount: result.data.transaction.amount,
          paidUntil: result.data.paidUntil,
        });
        setSelectedPlanKey(undefined);
      } else {
        await refresh();
      }
    } finally {
      setPaying(false);
    }
  };

  const handleChoosePlan = (plan: IPlan) => {
    if (plan.contactOnly) {
      toast.info('Vui lòng liên hệ bán hàng để được tư vấn gói này', { position: 'top-right' });
      return;
    }
    if (isDowngrade(plan)) {
      toast.error('Không thể hạ gói khi còn hạn. Bạn có thể nâng cấp gói cao hơn hoặc chờ hết hạn để đổi gói.', {
        position: 'top-right',
      });
      return;
    }
    if (selectedPlanKey === plan.key) {
      setSelectedPlanKey(undefined);
      return;
    }
    openPayDialog(plan.key);
  };

  // Mức giảm so với trả theo tháng (chỉ hiển thị khi thực sự rẻ hơn)
  const cycleSavingPct = (months: number, p: number) => {
    if (!selectedPlan || selectedPlan.priceMonthly <= 0) return 0;
    const monthlyRate = p / months;
    return Math.max(0, Math.round((1 - monthlyRate / selectedPlan.priceMonthly) * 100));
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
            <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Thanh toán thành công</h1>
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
                className="h-11 w-full rounded-xl bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white font-semibold"
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

  const currentState = selected?.subscription ?? 'trial';
  const stateBadge = STATE_LABEL[currentState] ?? STATE_LABEL.trial;
  const renewDate = selected
    ? selected.subscription === 'trial'
      ? selected.trialEndsAt
      : selected.paidUntil
    : undefined;

  return (
    <div className="h-full overflow-y-auto">
      <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 md:text-3xl">
              Thanh Toán &amp; Gói Dịch Vụ
            </h1>
            <p className="mt-1 text-sm text-slate-500">Quản lý gói dịch vụ và hoá đơn</p>
          </div>
          <Button
            onClick={() => plansRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-cerulean-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-cerulean-blue-200 transition hover:bg-cerulean-blue-700"
          >
            <CreditCard className="h-4 w-4" /> Nâng cấp gói
          </Button>
        </div>

        <div className="mt-6 space-y-6">
          {/* GÓI HIỆN TẠI */}
          <div className="rounded-2xl border-2 border-cerulean-blue-200 bg-gradient-to-br from-cerulean-blue-50 via-white to-white p-6 shadow-card">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cerulean-blue-600 text-white shadow-lg shadow-cerulean-blue-200">
                  <Crown className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-extrabold text-gray-900">
                      {currentPlan?.name ?? 'Chưa chọn gói'}
                    </h3>
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', stateBadge.className)}>
                      {stateBadge.text}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {currentPlan && !currentPlan.contactOnly ? (
                      <>
                        Chi phí tháng này:{' '}
                        <span className="font-bold text-gray-900">{fmtVND(currentPlan.priceMonthly || price || 0)}</span>
                        {renewDate ? (
                          <>
                            {' '}
                            ·{' '}
                            {selected?.subscription === 'trial' ? 'Hết hạn dùng thử' : 'Gia hạn'}{' '}
                            <span className="font-semibold text-gray-800">{fmtDate(renewDate)}</span>
                          </>
                        ) : null}
                      </>
                    ) : (
                      <span>Chọn một gói bên dưới để gia hạn hoặc mở lại chi nhánh.</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => openPayDialog(currentPlan?.key)}
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

          {/* CÁC GÓI */}
          <div ref={plansRef} className="scroll-mt-24">
            <h3 className="mb-3 text-sm font-bold text-gray-900">Chọn gói dịch vụ</h3>
            {isLoading ? (
              <div className="flex h-32 items-center justify-center text-sm text-slate-500">
                Đang tải danh sách gói...
              </div>
            ) : plans.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
                Chưa có gói dịch vụ nào được cấu hình.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {plans.map((plan) => {
                  const isCurrent = currentPlan?.key === plan.key;
                  const isPopularNow = plan.isPopular && !isCurrent;
                  const isSelected = selectedPlanKey === plan.key;
                  const blockedDowngrade = isDowngrade(plan);
                  return (
                    <div
                      key={plan._id ?? plan.key}
                      className={cn(
                        'relative rounded-2xl bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover',
                        isSelected
                          ? 'border-2 border-cerulean-blue-600 ring-2 ring-cerulean-blue-100'
                          : isPopularNow
                            ? 'border-2 border-cerulean-blue-500'
                            : 'border border-slate-200',
                        isCurrent && 'border-2 border-emerald-300 bg-emerald-50/40',
                      )}
                    >
                      {isCurrent && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white">
                          GÓI HIỆN TẠI
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
                      <p className="mt-1 text-3xl font-extrabold text-gray-900">
                        {plan.contactOnly ? (
                          'Liên hệ'
                        ) : (
                          <>
                            {fmtVND(plan.priceMonthly)}
                            <span className="text-sm font-medium text-slate-400">/tháng</span>
                          </>
                        )}
                      </p>
                      <ul className="mt-4 flex flex-col gap-2 text-sm text-slate-600">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-2">
                            <Check className="h-4 w-4 shrink-0 text-emerald-500" /> {f}
                          </li>
                        ))}
                      </ul>
                      <Button
                        disabled={isCurrent || blockedDowngrade}
                        onClick={() => handleChoosePlan(plan)}
                        className={cn(
                          'mt-5 w-full rounded-xl text-sm font-semibold',
                          isCurrent || blockedDowngrade
                            ? 'border border-slate-200 bg-white text-slate-400'
                            : isSelected
                              ? 'bg-cerulean-blue-600 text-white shadow-lg shadow-cerulean-blue-200 hover:bg-cerulean-blue-700'
                              : isPopularNow
                                ? 'bg-cerulean-blue-600 text-white shadow-lg shadow-cerulean-blue-200 hover:bg-cerulean-blue-700'
                                : 'border border-slate-200 bg-white text-slate-600 hover:border-cerulean-blue-300 hover:text-cerulean-blue-600',
                        )}
                        variant={isCurrent || blockedDowngrade ? 'outline' : isSelected || isPopularNow ? 'default' : 'outline'}
                      >
                        {isCurrent
                          ? 'Gói hiện tại'
                          : plan.contactOnly
                            ? 'Liên hệ bán hàng'
                            : blockedDowngrade
                              ? 'Còn hạn — không hạ gói'
                              : isSelected
                                ? 'Đã chọn'
                                : 'Chọn gói & thanh toán'}
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* CHECKOUT: hiện khi đã chọn 1 gói */}
              {selectedPlan && price > 0 && (
                <div ref={checkoutRef} className="mt-5 scroll-mt-24 rounded-2xl border-2 border-cerulean-blue-200 bg-white p-6 shadow-card">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-cerulean-blue-600">
                        Hoàn tất thanh toán
                      </p>
                      <h4 className="mt-1 flex flex-wrap items-center gap-2 text-lg font-extrabold text-gray-900">
                        {selectedPlan.name}
                        {!selectedPlan.contactOnly && (
                          <span className="text-sm font-medium text-slate-400">
                            · {fmtVND(selectedPlan.priceMonthly)}/tháng
                          </span>
                        )}
                      </h4>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPlanKey(undefined);
                        setCycleMonths(1);
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-500 hover:border-cerulean-blue-300 hover:text-cerulean-blue-600"
                    >
                      <X className="h-4 w-4" /> Đổi gói
                    </Button>
                  </div>

                  <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
                    {/* Chọn chu kỳ theo gói */}
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-700">Chọn chu kỳ thanh toán</p>
                      <div className="grid grid-cols-2 gap-2">
                        {CYCLE_MONTHS.map((months) => {
                          const p = selectedPlan.cycles[months];
                          const active = cycleMonths === months;
                          const saving = months > 1 ? cycleSavingPct(months, p) : 0;
                          return (
                            <button
                              key={months}
                              type="button"
                              onClick={() => setCycleMonths(months)}
                              className={cn(
                                'flex flex-col items-start rounded-xl border-2 p-3 text-left transition-colors',
                                active
                                  ? 'border-cerulean-blue-600 bg-cerulean-blue-50'
                                  : 'border-slate-200 bg-white hover:border-cerulean-blue-300',
                              )}
                            >
                              <span className={cn('text-sm font-bold', active ? 'text-cerulean-blue-700' : 'text-slate-800')}>
                                {months} tháng
                              </span>
                              <span
                                className={cn(
                                  'mt-0.5 text-base font-extrabold',
                                  active ? 'text-cerulean-blue-700' : 'text-slate-900',
                                )}
                              >
                                {fmtVND(p)}
                              </span>
                              {saving > 0 && (
                                <span className="mt-0.5 text-[11px] font-semibold text-emerald-600">
                                  tiết kiệm {saving}%
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Nhà hàng + thanh toán */}
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <p className="text-sm font-semibold text-slate-700">Nhà hàng</p>
                        {selected ? (
                          <Select value={String(selected._id)} onValueChange={setRestaurantId}>
                            <SelectTrigger className="h-11 w-full">
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

                      {selected && (
                        <div className="rounded-xl bg-slate-50 p-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Tổng tiền cần thanh toán</span>
                            <span className="text-lg font-extrabold text-cerulean-blue-600">{fmtVND(price)}</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-sm">
                            <span className="text-slate-500">Thanh toán tới ngày</span>
                            <span className="font-semibold text-slate-800">{fmtDate(newPaidUntil)}</span>
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={handlePay}
                        disabled={!selected || paying}
                        className="h-12 w-full rounded-xl bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white font-semibold"
                      >
                        {paying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                        Thanh toán {fmtVND(price)}
                      </Button>
                      <p className="text-center text-[11px] text-slate-400">
                        Thanh toán mô phỏng (mock) — chưa nối cổng thanh toán thật.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              </>
            )}
          </div>

          {/* LỊCH SỬ HOÁ ĐƠN */}
          <div ref={historyRef} className="rounded-2xl border border-slate-200 bg-white shadow-card">
            <div className="border-b border-slate-100 p-5">
              <h3 className="text-sm font-bold text-gray-900">Lịch sử hoá đơn</h3>
            </div>
            {transactions.length === 0 ? (
              <p className="p-8 text-sm text-slate-400">Chưa có hoá đơn nào.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-3">Hoá đơn</th>
                      <th className="px-5 py-3">Ngày</th>
                      <th className="px-5 py-3">Gói</th>
                      <th className="px-5 py-3">Số tiền</th>
                      <th className="px-5 py-3">Trạng thái</th>
                      <th className="px-5 py-3 text-right">Tải xuống</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.slice(0, 12).map((t: ITransaction) => {
                      const year = new Date(t.createdAt).getFullYear();
                      const code = `INV-${year}-${String(t._id).slice(-4).toUpperCase()}`;
                      return (
                        <tr key={t._id} className="transition-colors hover:bg-cerulean-blue-50/60">
                          <td className="px-5 py-3.5 font-semibold text-cerulean-blue-700">{code}</td>
                          <td className="px-5 py-3.5 text-slate-600">{fmtDate(t.createdAt)}</td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {t.planName ? `${t.planName} · Tháng ${new Date(t.createdAt).getMonth() + 1}` : `${t.cycleMonths} tháng`}
                          </td>
                          <td className="px-5 py-3.5 font-bold text-gray-900">{fmtVND(t.amount)}</td>
                          <td className="px-5 py-3.5">
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              Đã thanh toán
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => toast.info('Tính năng tải PDF sắp ra mắt', { position: 'top-right' })}
                              className="rounded-lg bg-cerulean-blue-50 px-3 py-1.5 text-xs font-semibold text-cerulean-blue-700 transition hover:bg-cerulean-blue-600 hover:text-white"
                            >
                              PDF
                            </button>
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
      </div>
    </div>
  );
}