import { useEffect, useState } from 'react';
import { Save, RotateCcw, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

import { getPricingConfig, updatePricingConfig } from '@/api/superadmin.api';
import type { IPricingConfig } from '@/types/superadmin.type';
import { formatVND } from '@/utils/helpers';

import { Button } from '@/components/ui/button';

const CYCLE_OPTIONS = [
  { months: 1, label: '1 tháng' },
  { months: 3, label: '3 tháng' },
  { months: 6, label: '6 tháng' },
  { months: 12, label: '12 tháng' },
];

export default function SuperAdminPricing() {
  const [config, setConfig] = useState<IPricingConfig | null>(null);
  const [cycles, setCycles] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getPricingConfig()
      .then((res) => {
        setConfig(res ?? null);
        const initial: Record<string, string> = {};
        for (const opt of CYCLE_OPTIONS) {
          const val = (res?.cycles as any)?.[String(opt.months)];
          initial[String(opt.months)] = val != null ? String(val) : '';
        }
        setCycles(initial);
      })
      .catch((err: any) => {
        toast.error(err.message || 'Lỗi khi tải cấu hình giá', { position: 'top-right' });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    const parsed: Record<string, number> = {};
    for (const opt of CYCLE_OPTIONS) {
      const raw = cycles[String(opt.months)];
      const value = Number(raw);
      if (!raw || !Number.isFinite(value) || value <= 0) {
        toast.error(`Giá chu kỳ ${opt.label} không hợp lệ (phải là số > 0)`, {
          position: 'top-right',
        });
        return;
      }
      parsed[String(opt.months)] = value;
    }

    setIsSaving(true);
    try {
      const res = await updatePricingConfig(parsed);
      setConfig(res ?? null);
      toast.success('Cập nhật giá thành công!', { position: 'top-right' });
    } catch (err: any) {
      toast.error(err.message || 'Cập nhật giá thất bại', { position: 'top-right' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!config) return;
    const initial: Record<string, string> = {};
    for (const opt of CYCLE_OPTIONS) {
      const val = (config.cycles as any)?.[String(opt.months)];
      initial[String(opt.months)] = val != null ? String(val) : '';
    }
    setCycles(initial);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-950">
              Gói Cước &amp; Giá
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Cấu hình giá thanh toán theo chu kỳ — áp dụng cho toàn bộ chủ trên nền tảng
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-sm text-slate-500">
            Đang tải cấu hình giá...
          </div>
        ) : (
          <div className="max-w-3xl">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <CreditCard className="h-5 w-5 text-cerulean-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Giá chu kỳ thanh toán</h3>
                  <p className="text-xs text-slate-400">
                    Đơn vị tiền tệ: {config?.currency || 'VND'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {CYCLE_OPTIONS.map((opt) => {
                  const key = String(opt.months);
                  const current = Number((config?.cycles as any)?.[key]) || 0;
                  return (
                    <div
                      key={key}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-slate-200/80 bg-slate-50/50"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">{opt.label}</p>
                        <p className="text-xs text-slate-400">
                          Giá hiện tại:{' '}
                          <span className="font-semibold text-emerald-600">
                            {formatVND(current)}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            value={cycles[key] ?? ''}
                            onChange={(e) =>
                              setCycles((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            placeholder="0"
                            className="w-36 pl-3 pr-12 py-2 h-9 rounded-xl border border-slate-200 focus:outline-none focus:border-cerulean-blue-500 text-sm bg-white"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                            đ
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 mt-6">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 rounded-xl border-slate-200 text-slate-600"
                >
                  <RotateCcw className="h-4 w-4" />
                  Khôi phục giá hiện tại
                </Button>
              </div>
            </div>

            <div className="mt-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm text-[11px] text-slate-400">
              💡 <span className="font-semibold text-slate-500">Ghi chú:</span> Thay đổi giá chỉ áp
              dụng cho các thanh toán mới. Nhà hàng đã trả trước giữ nguyên đến hết{' '}
              <span className="font-semibold">paidUntil</span> hiện tại. Mọi thay đổi được ghi vào
              audit log.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
