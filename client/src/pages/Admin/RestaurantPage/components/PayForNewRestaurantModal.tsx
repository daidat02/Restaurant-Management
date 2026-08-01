import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRestaurant } from '@/hooks/use-restaurant';
import { useSubscription } from '@/hooks/use-subscription';

const CYCLE_OPTIONS = [1, 3, 6, 12] as const;
const fmtVND = (n: number) => `${n.toLocaleString('vi-VN')}đ`;

interface PayForNewRestaurantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

/**
 * Modal "Mở nhà hàng mới (trả phí)" — hiện khi chủ đã có nhà hàng (2+).
 * Thu thập thông tin cơ bản + chu kỳ, thanh toán mock, tạo nhà hàng ở trạng thái active.
 */
export function PayForNewRestaurantModal({ open, onOpenChange, onSuccess }: PayForNewRestaurantModalProps) {
  const { createRestaurant } = useRestaurant();
  const { pricing } = useSubscription();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [cycleMonths, setCycleMonths] = useState<1 | 3 | 6 | 12>(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setEmail('');
      setPhone('');
      setAddress('');
      setCycleMonths(1);
    }
  }, [open]);

  const price = pricing?.cycles[String(cycleMonths) as '1' | '3' | '6' | '12'];

  const totalLabel = useMemo(() => {
    if (!price) return '...';
    if (cycleMonths === 1) return `${fmtVND(price)}/tháng`;
    const perMonth = Math.round(price / cycleMonths);
    return `${fmtVND(price)} (${fmtVND(perMonth)}/tháng)`;
  }, [price, cycleMonths]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address) return;
    setSubmitting(true);
    try {
      const ok = await createRestaurant({
        name,
        email,
        phone,
        address,
        status: 'active',
        cycleMonths,
      });
      if (ok) {
        onOpenChange(false);
        onSuccess();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            Mở nhà hàng mới (trả phí)
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Từ nhà hàng thứ 2 trở đi, bạn cần thanh toán trước để kích hoạt. Nhà hàng sẽ hoạt động ngay sau khi thanh toán.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tên nhà hàng *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: NhamNhi Cơ Sở 3" required />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="restaurant@gmail.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Số điện thoại</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="095xxxxxxx" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Địa chỉ *</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Số nhà, đường, phường/xã..." required />
          </div>

          {/* Chọn chu kỳ */}
          <div>
            <Label className="mb-1.5 block">Chu kỳ thanh toán</Label>
            <div className="grid grid-cols-4 gap-2">
              {CYCLE_OPTIONS.map((m) => {
                const p = pricing?.cycles[String(m) as '1' | '3' | '6' | '12'];
                const active = cycleMonths === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setCycleMonths(m)}
                    className={`flex flex-col items-center rounded-xl border-2 px-2 py-2.5 transition-colors ${
                      active ? 'border-cerulean-blue-600 bg-cerulean-blue-50' : 'border-slate-200 hover:border-cerulean-blue-300'
                    }`}
                  >
                    <span className={`text-xs font-bold ${active ? 'text-cerulean-blue-700' : 'text-slate-700'}`}>
                      {m} tháng
                    </span>
                    <span className={`mt-0.5 text-[11px] font-semibold ${active ? 'text-cerulean-blue-700' : 'text-slate-500'}`}>
                      {p ? fmtVND(p) : '...'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-500">Tổng tiền</span>
            <span className="text-base font-extrabold text-cerulean-blue-600">{totalLabel}</span>
          </div>

          <Button
            type="submit"
            disabled={submitting || !price}
            className="h-11 w-full rounded-xl bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white font-semibold"
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
            Thanh toán & Tạo
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
