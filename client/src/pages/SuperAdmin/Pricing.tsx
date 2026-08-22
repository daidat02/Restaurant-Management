import { useEffect, useState } from 'react';
import { Save, Plus, Trash2, CreditCard, GripVertical, Check, Info } from 'lucide-react';
import { toast } from 'sonner';

import { getPricingConfig, updatePricingConfig } from '@/api/superadmin.api';
import type { IPlan } from '@/types/subscription.type';
import { formatVND } from '@/utils/helpers';
import { FEATURE_CATALOG } from '@/constants/feature-catalog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const CYCLE_OPTIONS: { months: 1 | 3 | 6 | 12; label: string }[] = [
  { months: 1, label: '1 tháng' },
  { months: 3, label: '3 tháng' },
  { months: 6, label: '6 tháng' },
  { months: 12, label: '12 tháng' },
];

const LIMIT_FIELDS: { key: keyof IPlan['limits']; label: string }[] = [
  { key: 'tables', label: 'Bàn' },
  { key: 'items', label: 'Món' },
  { key: 'staff', label: 'Nhân viên' },
  { key: 'daily_orders', label: 'Đơn/ngày' },
  { key: 'group_chats', label: 'Nhóm chat' },
];

function newPlan(): IPlan {
  return {
    key: '',
    name: '',
    description: '',
    badge: '',
    isPopular: false,
    isActive: true,
    contactOnly: false,
    priceMonthly: 0,
    cycles: { 1: 0, 3: 0, 6: 0, 12: 0 },
    features: [],
    featureKeys: [],
    limits: { tables: 0, items: 0, staff: 0, daily_orders: 0, group_chats: 0 },
    sortOrder: 0,
  };
}

export default function SuperAdminPricing() {
  const [plans, setPlans] = useState<IPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getPricingConfig()
      .then((res) => setPlans(res?.plans ?? []))
      .catch((err: any) => {
        toast.error(err.message || 'Lỗi khi tải cấu hình gói', { position: 'top-right' });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const updatePlan = (index: number, patch: Partial<IPlan>) => {
    setPlans((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const updateCycle = (index: number, months: 1 | 3 | 6 | 12, value: number) => {
    setPlans((prev) =>
      prev.map((p, i) => (i === index ? { ...p, cycles: { ...p.cycles, [months]: value } } : p)),
    );
  };

  const updateLimit = (index: number, key: keyof IPlan['limits'], value: number) => {
    setPlans((prev) =>
      prev.map((p, i) => (i === index ? { ...p, limits: { ...p.limits, [key]: value } } : p)),
    );
  };

  const toggleFeatureKey = (index: number, key: string) => {
    const keys = plans[index].featureKeys ?? [];
    updatePlan(
      index,
      keys.includes(key)
        ? { featureKeys: keys.filter((k) => k !== key) }
        : { featureKeys: [...keys, key] },
    );
  };

  const addPlan = () => {
    setPlans((prev) => [...prev, { ...newPlan(), sortOrder: prev.length + 1 }]);
  };

  const removePlan = (index: number) => {
    setPlans((prev) => prev.filter((_, i) => i !== index));
  };

  const addFeature = (index: number) => {
    updatePlan(index, { features: [...plans[index].features, ''] });
  };

  const updateFeature = (index: number, fIndex: number, value: string) => {
    const features = [...plans[index].features];
    features[fIndex] = value;
    updatePlan(index, { features });
  };

  const removeFeature = (index: number, fIndex: number) => {
    updatePlan(index, { features: plans[index].features.filter((_, i) => i !== fIndex) });
  };

  const handleSave = async () => {
    const blankName = plans.some((p) => !p.name.trim());
    if (blankName) {
      toast.error('Tất cả các gói phải có tên!', { position: 'top-right' });
      return;
    }
    const invalidCycle = plans.find(
      (p) =>
        !p.contactOnly &&
        p.priceMonthly > 0 &&
        CYCLE_OPTIONS.some((c) => !p.cycles[c.months] || p.cycles[c.months] <= 0),
    );
    if (invalidCycle) {
      toast.error(`Gói "${invalidCycle.name}": giá chu kỳ phải là số > 0!`, {
        position: 'top-right',
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await updatePricingConfig({ plans });
      setPlans(res?.plans ?? plans);
      toast.success('Cập nhật gói dịch vụ thành công!', { position: 'top-right' });
    } catch (err: any) {
      toast.error(err.message || 'Cập nhật gói thất bại', { position: 'top-right' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8">
        <div className="mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-950">
              Gói Cước &amp; Giá
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Cấu hình các gói dịch vụ (tên, giá theo chu kỳ, tính năng, giới hạn) — áp dụng cho
              toàn bộ chủ trên nền tảng
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-sm text-slate-500">
            Đang tải danh sách gói...
          </div>
        ) : (
          <div className="max-w-5xl space-y-4">
            {/* Ghi chú sử dụng */}
            <div className="flex items-start gap-2 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-cerulean-blue-600" />
              <p className="text-xs text-slate-500">
                Gói "Liên hệ" không cần nhập giá — trang thanh toán sẽ hiển thị "Liên hệ bán hàng".
                Số 0 trong giới hạn có nghĩa là không giới hạn. "Tính năng được cấp" là quyền truy
                cập thật, còn "Tính năng" chỉ hiển thị trên card bán hàng.
              </p>
            </div>

            {plans.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
                Chưa có gói nào. Bấm "Thêm gói mới" để tạo gói đầu tiên.
              </div>
            )}

            {plans.map((plan, index) => (
              <div
                key={plan._id ?? `new-${index}`}
                className="rounded-2xl border border-slate-200/80 bg-white shadow-sm"
              >
                {/* Đầu gói */}
                <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-5 w-5 text-slate-300" />
                    <div className="relative w-52">
                      <Input
                        value={plan.name}
                        onChange={(e) => updatePlan(index, { name: e.target.value })}
                        placeholder="Tên gói (vd: Pro)"
                        className="h-9 rounded-xl border-slate-200 text-sm font-bold text-slate-900"
                      />
                    </div>
                    {plan.key && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                        key: {plan.key}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <Switch
                        checked={plan.isActive}
                        onCheckedChange={(v) => updatePlan(index, { isActive: v })}
                        className="data-[state=checked]:bg-cerulean-blue-600"
                      />
                      Hiển thị
                    </label>

                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <Switch
                        checked={plan.isPopular}
                        onCheckedChange={(v) => updatePlan(index, { isPopular: v })}
                        className="data-[state=checked]:bg-cerulean-blue-600"
                      />
                      Nổi bật
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <Switch
                        checked={plan.priceMonthly === 0 && !plan.contactOnly}
                        onCheckedChange={(isFree) => {
                          if (isFree) {
                            updatePlan(index, {
                              priceMonthly: 0,
                              contactOnly: false,
                              cycles: { 1: 0, 3: 0, 6: 0, 12: 0 },
                            });
                          }
                        }}
                        className="data-[state=checked]:bg-cerulean-blue-600"
                      />
                      Gói "Miễn Phí"
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <Switch
                        checked={plan.contactOnly}
                        onCheckedChange={(v) => updatePlan(index, { contactOnly: v })}
                        className="data-[state=checked]:bg-cerulean-blue-600"
                      />
                      Gói "Liên hệ"
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePlan(index)}
                      className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 px-5 py-5 lg:grid-cols-2">
                  {/* Mô tả & badge */}
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Mô tả</Label>
                      <Textarea
                        value={plan.description}
                        onChange={(e) => updatePlan(index, { description: e.target.value })}
                        rows={2}
                        placeholder="Mô tả ngắn hiển thị trên card gói"
                        className="rounded-xl border-slate-200 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-600">
                          Giá niêm yết /tháng (đ)
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          value={plan.priceMonthly || ''}
                          onChange={(e) =>
                            updatePlan(index, { priceMonthly: Number(e.target.value) })
                          }
                          placeholder="vd: 690000"
                          className="h-9 rounded-xl border-slate-200 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-600">
                          Badge nổi bật
                        </Label>
                        <Input
                          value={plan.badge}
                          onChange={(e) => updatePlan(index, { badge: e.target.value })}
                          placeholder="vd: PHỔ BIẾN NHẤT"
                          className="h-9 rounded-xl border-slate-200 text-sm"
                        />
                      </div>
                    </div>
                    <p className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                      <CreditCard className="h-3.5 w-3.5 text-cerulean-blue-600" />
                      Niêm yết: {plan.contactOnly ? 'Liên hệ' : formatVND(plan.priceMonthly)}/tháng
                    </p>
                  </div>

                  {/* Giá theo chu kỳ */}
                  <div>
                    <Label className="text-xs font-semibold text-slate-600">
                      Giá theo chu kỳ (tổng tiền mỗi kỳ, đ)
                    </Label>
                    <div className="mt-1.5 grid grid-cols-2 gap-2.5">
                      {CYCLE_OPTIONS.map((c) => (
                        <div key={c.months} className="relative">
                          <Input
                            type="number"
                            min={0}
                            disabled={plan.contactOnly}
                            value={plan.cycles[c.months] || ''}
                            onChange={(e) => updateCycle(index, c.months, Number(e.target.value))}
                            placeholder={plan.contactOnly ? 'Liên hệ' : '0'}
                            className={cn(
                              'h-9 rounded-xl border-slate-200 text-sm pl-8',
                              plan.contactOnly && 'bg-slate-50 text-slate-400',
                            )}
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                            {c.months}
                          </span>
                        </div>
                      ))}
                    </div>
                    {!plan.contactOnly && (
                      <p className="mt-1.5 text-[11px] text-slate-400">
                        Hiển thị trên trang thanh toán:{' '}
                        {CYCLE_OPTIONS.map((c) => plan.cycles[c.months]).some((v) => v > 0)
                          ? `${formatVND(plan.cycles[1])} / ${formatVND(plan.cycles[3])} / ${formatVND(plan.cycles[6])} / ${formatVND(plan.cycles[12])}`
                          : 'chưa nhập giá'}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] font-medium text-slate-500">
                      Chu kỳ: {CYCLE_OPTIONS.map((c) => c.label).join(' · ')}
                    </p>
                  </div>

                  {/* Giới hạn */}
                  <div>
                    <Label className="text-xs font-semibold text-slate-600">
                      Giới hạn theo gói (0 = không giới hạn)
                    </Label>
                    <div className="mt-1.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                      {LIMIT_FIELDS.map((f) => (
                        <div key={f.key} className="relative">
                          <Input
                            type="number"
                            min={0}
                            value={plan.limits[f.key] || ''}
                            onChange={(e) => updateLimit(index, f.key, Number(e.target.value))}
                            className="h-9 rounded-xl border-slate-200 text-sm pl-8"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-400">
                            {f.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tính năng */}
                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-600">
                        Tính năng (features)
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addFeature(index)}
                        className="h-7 gap-1 rounded-lg px-2 text-[11px] font-semibold text-cerulean-blue-600 hover:bg-cerulean-blue-50"
                      >
                        <Plus className="h-3.5 w-3.5" /> Thêm tính năng
                      </Button>
                    </div>
                    <div className="mt-1.5 space-y-2">
                      {plan.features.map((f, fIndex) => (
                        <div key={fIndex} className="flex items-center gap-2">
                          <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                          <Input
                            value={f}
                            onChange={(e) => updateFeature(index, fIndex, e.target.value)}
                            placeholder="Tính năng hiển thị trên card gói"
                            className="h-8 rounded-lg border-slate-200 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => removeFeature(index, fIndex)}
                            className="text-slate-300 transition hover:text-rose-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {plan.features.length === 0 && (
                        <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
                          Chưa có tính năng nào
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quyền tính năng (featureKeys) */}
                  <div className="lg:col-span-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-semibold text-slate-600">
                          Tính năng được cấp (featureKeys)
                        </Label>
                        <p className="text-[11px] text-slate-400">
                          Quyền truy cập THẬT (gate menu/route/action). Khác với "Tính năng" ở trên
                          chỉ là mô tả trên card bán hàng.
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {FEATURE_CATALOG.map((f) => {
                        const checked = (plan.featureKeys ?? []).includes(f.key);
                        return (
                          <label
                            key={f.key}
                            className={cn(
                              'flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 transition',
                              checked
                                ? 'border-cerulean-blue-300 bg-cerulean-blue-50/60'
                                : 'border-slate-200 bg-white hover:border-cerulean-blue-200',
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleFeatureKey(index, f.key)}
                              className="h-4 w-4 rounded border-slate-300 text-cerulean-blue-600 focus:ring-cerulean-blue-500"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-slate-700">
                                {f.label}
                              </p>
                              <p className="text-[10px] text-slate-400">{f.group}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Thêm gói mới — full width, ngang hàng với card gói phía trên */}
            <Button
              onClick={addPlan}
              variant="outline"
              className="h-12 w-full rounded-2xl border-dashed border-slate-300 bg-white text-sm font-semibold text-slate-500 hover:border-cerulean-blue-400 hover:bg-cerulean-blue-50/40 hover:text-cerulean-blue-600"
            >
              <Plus className="h-4 w-4" /> Thêm gói mới
            </Button>
          </div>
        )}
      </div>

      {/* ══════════ ACTION BAR: LƯU THAY ĐỔI (FIXED) — đồng bộ với trang Cài Đặt ══════════ */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="fixed bottom-6 right-6 z-50 flex h-11 items-center gap-2 rounded-2xl bg-cerulean-blue-600 px-5 text-sm font-semibold text-white shadow-xl shadow-cerulean-blue-300/60 transition hover:bg-cerulean-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Save className="h-4 w-4" />
        {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
      </button>
    </div>
  );
}
