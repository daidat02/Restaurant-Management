import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CheckCircle2, CreditCard, Loader2, ReceiptText } from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ITransaction } from '@/types/subscription.type';

const CYCLE_OPTIONS: { months: 1 | 3 | 6 | 12; suffix: string }[] = [
  { months: 1, suffix: '' },
  { months: 3, suffix: ' (tiết kiệm ~5%)' },
  { months: 6, suffix: ' (tiết kiệm ~11%)' },
  { months: 12, suffix: ' (tiết kiệm ~17%)' },
];

const fmtVND = (n: number) => `${n.toLocaleString('vi-VN')}đ`;
const fmtDate = (d: Date | string) =>
  format(new Date(d), 'dd/MM/yyyy', { locale: vi });

export default function BillingPage() {
  const {
    subscriptions,
    transactions,
    pricing,
    isLoading,
    pay,
    refresh,
  } = useSubscription();

  const [restaurantId, setRestaurantId] = useState('');
  const [cycleMonths, setCycleMonths] = useState<1 | 3 | 6 | 12>(1);
  const [paying, setPaying] = useState(false);
  const [lastPayment, setLastPayment] = useState<{ restaurantName: string; amount: number; paidUntil: string } | null>(null);

  // Nhà hàng mặc định: ưu tiên nhà hàng bị khoá hoặc sắp hết hạn
  const defaultRestaurant = useMemo(() => {
    if (subscriptions.length === 0) return undefined;
    const priority =
      subscriptions.find((s) => s.subscription === 'locked') ||
      subscriptions.find((s) => s.subscription === 'trial' && s.daysLeft <= 7) ||
      subscriptions[0];
    return priority;
  }, [subscriptions]);

  const selected = subscriptions.find((s) => String(s._id) === restaurantId) || defaultRestaurant;
  const price = pricing?.cycles[String(cycleMonths) as '1' | '3' | '6' | '12'];

  const handleSelectRestaurant = (id: string) => {
    setRestaurantId(id);
    setLastPayment(null);
  };

  const handlePay = async () => {
    if (!selected) return;
    setPaying(true);
    try {
      const result = await pay(selected._id, cycleMonths);
      if (result.success && result.data) {
        setLastPayment({
          restaurantName: selected.name,
          amount: result.data.transaction.amount,
          paidUntil: result.data.paidUntil,
        });
      } else {
        await refresh();
      }
    } finally {
      setPaying(false);
    }
  };

  const newPaidUntil = useMemo(() => {
    const base = selected?.paidUntil && new Date(selected.paidUntil).getTime() > Date.now()
      ? new Date(selected.paidUntil)
      : new Date();
    return new Date(base.getTime() + cycleMonths * 30 * 24 * 3600 * 1000);
  }, [selected, cycleMonths]);

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
                Xem lịch sử giao dịch
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

  return (
    <div className="h-full overflow-y-auto">
      <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8">
        <div className="mb-6 border-b border-slate-200 pb-5">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-950">
            Thanh Toán & Gia Hạn
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Trả phí theo từng nhà hàng — mở lại hoặc gia hạn ngay trong vài giây.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* ---- FORM THANH TOÁN ---- */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                <CreditCard className="h-5 w-5 text-cerulean-blue-600" /> Chọn nhà hàng & chu kỳ
              </h2>

              {subscriptions.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  {isLoading ? 'Đang tải danh sách nhà hàng...' : 'Bạn chưa có nhà hàng nào để thanh toán.'}
                </p>
              ) : (
                <div className="space-y-5">
                  {/* Chọn nhà hàng */}
                  <div>
                    <p className="mb-1.5 text-sm font-semibold text-slate-700">Nhà hàng</p>
                    <Select value={selected?._id} onValueChange={handleSelectRestaurant}>
                      <SelectTrigger className="w-full h-11">
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
                  </div>

                  {/* Chọn chu kỳ */}
                  <div>
                    <p className="mb-1.5 text-sm font-semibold text-slate-700">Chu kỳ thanh toán</p>
                    <div className="grid grid-cols-2 gap-3">
                      {CYCLE_OPTIONS.map((opt) => {
                        const p = pricing?.cycles[String(opt.months) as '1' | '3' | '6' | '12'];
                        const active = cycleMonths === opt.months;
                        return (
                          <button
                            key={opt.months}
                            type="button"
                            onClick={() => setCycleMonths(opt.months)}
                            className={`flex flex-col items-start rounded-xl border-2 p-3.5 text-left transition-colors ${
                              active
                                ? 'border-cerulean-blue-600 bg-cerulean-blue-50'
                                : 'border-slate-200 bg-white hover:border-cerulean-blue-300'
                            }`}
                          >
                            <span className={`text-sm font-bold ${active ? 'text-cerulean-blue-700' : 'text-slate-800'}`}>
                              {opt.months} tháng
                            </span>
                            <span className={`mt-1 text-base font-extrabold ${active ? 'text-cerulean-blue-700' : 'text-slate-900'}`}>
                              {p ? fmtVND(p) : '...'}
                            </span>
                            {opt.suffix && <span className="mt-0.5 text-[11px] text-emerald-600">{opt.suffix}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tổng tiền & ngày hết hạn */}
                  {selected && (
                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Tổng tiền cần thanh toán</span>
                        <span className="text-lg font-extrabold text-cerulean-blue-600">
                          {price ? fmtVND(price) : '...'}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-slate-500">Thanh toán tới ngày</span>
                        <span className="font-semibold text-slate-800">{fmtDate(newPaidUntil)}</span>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handlePay}
                    disabled={!selected || paying || !price}
                    className="h-12 w-full rounded-xl bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white font-semibold"
                  >
                    {paying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                    Thanh toán {price ? fmtVND(price) : ''}
                  </Button>
                  <p className="text-center text-[11px] text-slate-400">
                    Thanh toán mô phỏng (mock) — chưa nối cổng thanh toán thật.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ---- LỊCH SỬ GIAO DỊCH ---- */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <h2 className="flex items-center gap-2 border-b border-slate-100 px-6 py-4 text-lg font-bold text-slate-900">
                <ReceiptText className="h-5 w-5 text-cerulean-blue-600" /> Lịch sử giao dịch
              </h2>
              {transactions.length === 0 ? (
                <p className="p-6 text-sm text-slate-500">Chưa có giao dịch nào.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nhà hàng</TableHead>
                      <TableHead className="text-right">Số tiền</TableHead>
                      <TableHead className="text-right">Chu kỳ</TableHead>
                      <TableHead className="text-right">Ngày</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.slice(0, 12).map((t: ITransaction) => (
                      <TableRow key={t._id}>
                        <TableCell className="font-medium text-slate-800">
                          {typeof t.restaurant === 'object' ? t.restaurant.name : '—'}
                        </TableCell>
                        <TableCell className="text-right text-cerulean-blue-600 font-semibold">
                          {fmtVND(t.amount)}
                        </TableCell>
                        <TableCell className="text-right text-slate-500">{t.cycleMonths} tháng</TableCell>
                        <TableCell className="text-right text-slate-500">
                          {fmtDate(t.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
