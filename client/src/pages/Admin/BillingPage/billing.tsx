import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useSubscription } from '@/hooks/use-subscription';
import type { IPlan } from '@/types/subscription.type';

import { BillingHeader } from './components/BillingHeader';
import { CurrentPlanCard } from './components/CurrentPlanCard';
import { PaymentMethodCard } from './components/PaymentMethodCard';
import { PaymentDialog, type PaymentMethod } from './components/PaymentDialog';
import { PlansSection } from './components/PlansSection';
import { TransactionHistory } from './components/TransactionHistory';
import { PaymentSuccessDialog } from '@/components/PaymentSuccessDialog';
import { fmtDate, fmtVND } from './components/billing-utils';

export default function BillingPage() {
  const {
    subscriptions,
    transactions,
    pricing,
    isLoading,
    pay,
    createPayosUrl,
    cancelPendingPayment,
    createVnpayUrl,
    listenPaymentResult,
    stopListeningPaymentResult,
    refresh,
  } = useSubscription();

  const [searchParams, setSearchParams] = useSearchParams();
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
  // Số tiền thực tế server tính (pro-rate khi nâng gói giữa chu kỳ).
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentPriceNote, setPaymentPriceNote] = useState<string | undefined>(undefined);
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

  // Đơn thanh toán đang chờ gần nhất của nhà hàng đang chọn (pending + có link PayOS).
  const pendingOrder = useMemo(() => {
    if (!selected) return undefined;
    return transactions.find(
      (t) =>
        t.status === 'pending' &&
        !!t.orderCode &&
        (typeof t.restaurant === 'object'
          ? String(t.restaurant._id) === String(selected._id)
          : String(t.restaurant) === String(selected._id)),
    );
  }, [transactions, selected]);

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

  // Còn hạn (active + chưa hết hạn) → có thể đổi gói giữa chu kỳ (upgrade pro-rate / downgrade cuối kỳ).
  const inTerm = useMemo(
    () =>
      !!selected &&
      selected.subscription === 'active' &&
      !!selected.paidUntil &&
      new Date(selected.paidUntil).getTime() > new Date().getTime(),
    [selected],
  );

  // Loại thay đổi khi chọn 1 gói so với gói đang dùng (so theo sortOrder).
  const changeTypeFor = (plan: IPlan): 'current' | 'renew' | 'upgrade' | 'downgrade' => {
    if (!currentPlan || currentPlan.key === plan.key) return 'current';
    // Hết hạn/locked → coi như mua mới (renew) dù gói thấp hơn.
    if (!inTerm) return 'renew';
    return (currentPlan.sortOrder ?? 0) > (plan.sortOrder ?? 0) ? 'downgrade' : 'upgrade';
  };

  const isDowngrade = (plan: IPlan) => changeTypeFor(plan) === 'downgrade';
  const isUpgrade = (plan: IPlan) => changeTypeFor(plan) === 'upgrade';

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
    setPaymentAmount(0);
    setPaymentPriceNote(undefined);
    stopListeningPaymentResult();

    if (ev.status === 'success') {
      const amount = paymentAmount || paymentPlan?.cycles[cycleMonths] || 0;
      const updated = subscriptions.find((s) => selected && String(s._id) === String(selected._id));
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

  /** Lên lịch hạ gói (downgrade): không qua thanh toán, pendingPlanKey lưu cuối chu kỳ. */
  const scheduleDowngrade = async (plan: IPlan) => {
    if (!selected) return;
    setPaying(true);
    try {
      const result = await pay(selected._id, cycleMonths, plan.key);
      if (result.success) {
        toast.success('Đã lên lịch hạ gói — gói mới áp dụng khi hết hạn chu kỳ hiện tại.', {
          position: 'top-right',
        });
        void refresh();
      }
    } finally {
      setPaying(false);
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

    // Downgrade giữa chu kỳ: không thanh toán, chỉ lưu lịch hạ gói.
    if (isDowngrade(plan)) {
      await scheduleDowngrade(plan);
      return;
    }

    // Upgrade / renew: mở modal thanh toán.
    const isUpgradePlan = isUpgrade(plan);
    setPaymentPlan(plan);
    setCheckoutUrl('');
    setQrCodeData('');
    setPaymentAmount(0);
    setPaymentPriceNote(isUpgradePlan ? 'Giá hôm nay (pro-rate)' : undefined);
    stopListeningPaymentResult();
    setPaymentOpen(true);

    // Tạo link theo phương thức đang chọn.
    setPaying(true);
    try {
      if (paymentMethod === 'payos') {
        const res = await createPayosUrl(selected._id, cycleMonths, plan.key);
        if (res.success && res.data) {
          setPaymentAmount(res.data.amount);
          setCheckoutUrl(res.data.checkoutUrl || '');
          setQrCodeData(res.data.qrCodeData || '');
          if (res.data.transactionId) {
            listenPaymentResult(res.data.transactionId, handlePaymentResult);
          }
        }
      } else {
        const res = await createVnpayUrl(selected._id, cycleMonths, plan.key);
        if (res.success && res.data) {
          setPaymentAmount(res.data.amount);
          setCheckoutUrl(res.data.checkoutUrl || '');
          if (res.data.transactionId) {
            listenPaymentResult(res.data.transactionId, handlePaymentResult);
          }
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

  /** Thanh toán đơn đang chờ: khởi tạo lại link PayOS với đúng transaction cũ. */
  const resumePendingPayment = async () => {
    if (!pendingOrder || !selected) return;
    setPaymentPlan(plans.find((p) => p.key === pendingOrder.planKey));
    setCheckoutUrl('');
    setQrCodeData('');
    setPaymentAmount(pendingOrder.amount);
    setPaymentPriceNote(undefined);
    stopListeningPaymentResult();
    setPaymentOpen(true);

    setPaying(true);
    try {
      const res = await createPayosUrl(
        selected._id,
        pendingOrder.cycleMonths,
        pendingOrder.planKey,
        pendingOrder._id,
      );
      if (res.success && res.data) {
        setPaymentAmount(res.data.amount);
        setCheckoutUrl(res.data.checkoutUrl || '');
        setQrCodeData(res.data.qrCodeData || '');
        if (res.data.transactionId) {
          listenPaymentResult(res.data.transactionId, handlePaymentResult);
        }
      } else {
        setPaymentOpen(false);
      }
    } finally {
      setPaying(false);
    }
  };

  /** Huỷ đơn đang chờ: huỷ link trên PayOS + đánh dấu giao dịch cancelled. */
  const handleCancelPendingOrder = async () => {
    if (!pendingOrder) return;
    await cancelPendingPayment(pendingOrder._id);
  };

  // Tự mở modal thanh toán khi vào từ upsell (?plan=<key>&cycle=<n>) với gói đề xuất.
  const autoOpenRef = useRef(false);
  useEffect(() => {
    const planKey = searchParams.get('plan');
    if (autoOpenRef.current || !planKey) return;
    const cycle = Number(searchParams.get('cycle') || 1);
    const plan = plans.find((p) => p.key === planKey);
    if (!plan || !selected) return; // chờ pricing + subscription load
    autoOpenRef.current = true;
    const nextCycle = [1, 3, 6, 12].includes(cycle) ? cycle : 1;
    setSearchParams({}, { replace: true });
    const t = window.setTimeout(() => {
      setCycleMonths(nextCycle as 1 | 3 | 6 | 12);
      void openPayDialog(plan);
    }, 250);
    return () => window.clearTimeout(t);
  }, [plans, selected, searchParams, setSearchParams, openPayDialog]);

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
  const paidTransactionCount = transactions.filter((t) => t.status === 'paid').length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="min-h-screen bg-slate-50 p-4 text-slate-800 md:p-8">
        <BillingHeader
          onUpgrade={() => plansRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        />

        <div className="mt-6 space-y-6">
          {/* GÓI ĐANG SỬ DỤNG + THÔNG TIN CHUYỂN KHOẢN */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CurrentPlanCard
              selected={selected}
              currentPlan={currentPlan}
              subscriptions={subscriptions}
              onRestaurantChange={setRestaurantId}
              onViewInvoices={() => historyRef.current?.scrollIntoView({ behavior: 'smooth' })}
              activeCount={activeCount}
              currentMonthBilling={currentMonthBilling}
              paidTransactionCount={paidTransactionCount}
            />
            <PaymentMethodCard
              selected={selected}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              onRenew={() =>
                openPayDialog(currentPlan && !currentPlan.contactOnly ? currentPlan : undefined)
              }
            />
          </div>

          {/* NÂNG CẤP GÓI */}
          <PlansSection
            plans={plans}
            isLoading={isLoading}
            cycleMonths={cycleMonths}
            onCycleChange={setCycleMonths}
            selectedPlanForPrice={selectedPlanForPrice}
            currentPlan={currentPlan}
            cycleSavingPct={cycleSavingPct}
            changeTypeFor={changeTypeFor}
            onSelectPlan={openPayDialog}
            containerRef={plansRef}
            pendingOrder={
              pendingOrder
                ? {
                    planName: pendingOrder.planName ?? 'Gói dịch vụ',
                    code: pendingOrder.transactionId ?? pendingOrder._id,
                    amount: pendingOrder.amount,
                  }
                : null
            }
            onResumePayment={resumePendingPayment}
            onCancelPendingOrder={handleCancelPendingOrder}
          />

          {/* LỊCH SỬ THANH TOÁN */}
          <TransactionHistory
            transactions={transactions}
            isLoading={isLoading}
            containerRef={historyRef}
          />
        </div>

        {/* MODAL THANH TOÁN */}
        <PaymentDialog
          open={paymentOpen}
          onOpenChange={(val) => {
            setPaymentOpen(val);
            if (!val) {
              setPaymentAmount(0);
              setPaymentPriceNote(undefined);
            }
          }}
          planName={paymentPlan?.name ?? currentPlan?.name ?? 'Gói dịch vụ'}
          cycleText={cycleText}
          restaurantName={selected?.name ?? ''}
          price={
            paymentAmount ||
            paymentPlan?.cycles[cycleMonths] ||
            currentPlan?.cycles[cycleMonths] ||
            0
          }
          priceNote={paymentPriceNote}
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
