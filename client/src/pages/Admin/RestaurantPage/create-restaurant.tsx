import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, CreditCard, Gift, Loader2, MapPin, Store } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CustomInput } from '@/components/FormInput';
import { CustomTextarea } from '@/components/CustomTextArea';
import { FormSelect } from '@/components/FormSelect';
import { useRestaurant } from '@/hooks/use-restaurant';
import { useSubscription } from '@/hooks/use-subscription';
import { useUser } from '@/hooks/use-user';
import type { IPlan } from '@/types/subscription.type';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CYCLE_MONTHS: (1 | 3 | 6 | 12)[] = [1, 3, 6, 12];
const fmtVND = (n: number) => `${n.toLocaleString('vi-VN')}đ`;

const statusOptions = [
  { label: 'Đang hoạt động', value: 'active' },
  { label: 'Tạm dừng', value: 'inactive' },
];

/**
 * Trang tạo nhà hàng mới:
 * - Nhà hàng ĐẦU TIÊN → dùng thử 30 ngày (không hiển thị phần gói/thanh toán).
 * - Nhà hàng 2+ → chọn gói + chu kỳ, thanh toán mock rồi kích hoạt.
 * Kèm đầy đủ thông tin chi nhánh: quản lý, sức chứa, giờ hoạt động, mô tả, logo...
 */
export default function CreateRestaurantPage() {
  const navigate = useNavigate();
  const { createRestaurant } = useRestaurant();
  const { subscriptions, pricing, isLoading: subscriptionsLoading } = useSubscription();
  const { users, fetchUsersWithFilter } = useUser();

  // Thông tin nhà hàng
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState('active');
  const [capacity, setCapacity] = useState<number>(0);
  const [operatingHours, setOperatingHours] = useState('08:00 - 22:00');
  const [managerId, setManagerId] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // Gói & thanh toán (chỉ áp dụng cho nhà hàng 2+)
  const [selectedPlanKey, setSelectedPlanKey] = useState<string>('');
  const [cycleMonths, setCycleMonths] = useState<1 | 3 | 6 | 12>(1);
  const [submitting, setSubmitting] = useState(false);

  // Lấy danh sách tài khoản quản lý để gán cho chi nhánh mới
  useEffect(() => {
    fetchUsersWithFilter(['manager']);
  }, [fetchUsersWithFilter]);

  const isFirstRestaurant = subscriptions.length === 0;

  const plans = useMemo(() => (pricing?.plans ?? []).filter((p) => p.isActive !== false), [pricing]);
  const defaultPlan = useMemo(
    () => plans.find((p) => p.isPopular && !p.contactOnly) ?? plans.find((p) => !p.contactOnly),
    [plans],
  );

  // Gói mặc định: gói nổi bật (Pro)
  useEffect(() => {
    if (defaultPlan && !selectedPlanKey) {
      setSelectedPlanKey(defaultPlan.key);
      setCycleMonths(1);
    }
  }, [defaultPlan, selectedPlanKey]);

  const managerOptions = useMemo(() => {
    if (!users || users.length === 0) return [];
    return users.map((u) => ({
      label: `${u.name} (${u.role?.toUpperCase()})`,
      value: u._id,
    }));
  }, [users]);

  const selectedPlan = plans.find((p) => p.key === selectedPlanKey);
  const price = selectedPlan ? selectedPlan.cycles[cycleMonths] : 0;

  const totalLabel = useMemo(() => {
    if (!price) return '...';
    if (cycleMonths === 1) return `${fmtVND(price)}/tháng`;
    const perMonth = Math.round(price / cycleMonths);
    return `${fmtVND(price)} (${fmtVND(perMonth)}/tháng)`;
  }, [price, cycleMonths]);

  const cycleSavingPct = (months: number, p: number) => {
    if (!selectedPlan || selectedPlan.priceMonthly <= 0) return 0;
    return Math.max(0, Math.round((1 - p / months / selectedPlan.priceMonthly) * 100));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) {
      toast.error('Vui lòng nhập tên và địa chỉ nhà hàng');
      return;
    }
    if (!isFirstRestaurant && (!selectedPlan || !price)) {
      toast.error('Vui lòng chọn gói dịch vụ và chu kỳ thanh toán');
      return;
    }

    const payload: any = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      status: status as 'active' | 'inactive',
      capacity: Number(capacity) || 0,
      operatingHours,
      managerId: managerId || undefined,
      description: description.trim(),
      logoUrl: logoUrl.trim(),
    };
    if (!isFirstRestaurant) {
      payload.cycleMonths = cycleMonths;
      payload.planId = selectedPlan!.key;
    }

    setSubmitting(true);
    try {
      const ok = await createRestaurant(payload);
      if (ok) {
        toast.success(
          isFirstRestaurant
            ? 'Tạo nhà hàng thành công! Bạn đang dùng thử miễn phí 30 ngày.'
            : 'Tạo nhà hàng thành công! Chi nhánh đã được kích hoạt.',
        );
        navigate('/admin/restaurants');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="min-h-screen bg-slate-50 p-4 text-slate-800 md:p-8">
        {/* HEADER */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/restaurants')}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:text-cerulean-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Tạo nhà hàng mới</h1>
            <p className="text-sm text-slate-500">
              Điền thông tin chi nhánh và chọn gói dịch vụ để kích hoạt hệ thống.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* CỘT TRÁI: THÔNG TIN NHÀ HÀNG */}
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card md:p-6">
              <div className="mb-4 flex items-center gap-2">
                <Store className="h-5 w-5 text-cerulean-blue-600" />
                <h2 className="text-base font-bold text-gray-900">Thông tin chi nhánh</h2>
              </div>

              <div className="space-y-5">
                <CustomInput
                  value={name}
                  label="Tên nhà hàng *"
                  placeholder="VD: NhamNhi Cơ Sở 3"
                  required
                  onChange={(e) => setName(e.target.value)}
                />

                <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                  <CustomInput
                    type="email"
                    label="Địa chỉ email"
                    placeholder="restaurant@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <CustomInput
                    label="Số điện thoại liên hệ"
                    placeholder="095xxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="relative">
                  <CustomTextarea
                    label="Địa chỉ chi tiết *"
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                    value={address}
                    required
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                  <CustomInput
                    type="number"
                    label="Sức chứa (khách tối đa)"
                    placeholder="VD: 150"
                    value={capacity || ''}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                  />
                  <CustomInput
                    label="Giờ hoạt động"
                    placeholder="VD: 08:00 - 22:00"
                    value={operatingHours}
                    onChange={(e) => setOperatingHours(e.target.value)}
                  />
                </div>

                <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormSelect
                    label="Quản lý chi nhánh"
                    placeholder={managerOptions.length > 0 ? 'Chọn quản lý' : 'Đang tải danh sách...'}
                    options={managerOptions}
                    value={managerId}
                    disabled={managerOptions.length === 0}
                    onValueChange={(value) => setManagerId(value)}
                  />
                  <FormSelect
                    label="Trạng thái"
                    placeholder="Chọn trạng thái"
                    options={statusOptions}
                    value={status}
                    onValueChange={(value) => setStatus(value)}
                  />
                </div>

                <CustomTextarea
                  label="Mô tả / giới thiệu"
                  placeholder="Mô tả ngắn về không gian, món đặc trưng của chi nhánh..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />

                <CustomInput
                  label="Hình ảnh đại diện (URL)"
                  placeholder="https://.../logo-nham-nhi.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: GÓI & THANH TOÁN */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-cerulean-blue-600" />
                <h2 className="text-base font-bold text-gray-900">Gói dịch vụ & Thanh toán</h2>
              </div>

              {subscriptionsLoading ? (
                <div className="space-y-3">
                  <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
                </div>
              ) : isFirstRestaurant ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-cerulean-blue-100 bg-cerulean-blue-50/60 p-5 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-cerulean-blue-600 shadow-sm">
                    <Gift className="h-6 w-6" />
                  </span>
                  <p className="text-sm font-bold text-cerulean-blue-800">Miễn phí 30 ngày dùng thử</p>
                  <p className="text-xs leading-relaxed text-slate-500">
                    Nhà hàng đầu tiên của bạn được dùng thử tất cả tính năng trong 30 ngày. Sau đó chọn gói phù hợp
                    để tiếp tục sử dụng.
                  </p>
                </div>
              ) : plans.length === 0 ? (
                <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-500">
                  Chưa có gói dịch vụ nào được cấu hình. Vui lòng liên hệ quản trị viên.
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Danh sách gói */}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Chọn gói dịch vụ</p>
                    <div className="space-y-2">
                      {plans.map((plan: IPlan) => {
                        const active = selectedPlanKey === plan.key;
                        return (
                          <button
                            key={plan.key}
                            type="button"
                            onClick={() => {
                              setSelectedPlanKey(plan.key);
                              setCycleMonths(1);
                            }}
                            className={cn(
                              'relative w-full rounded-xl border-2 p-3 text-left transition-all',
                              active
                                ? 'border-cerulean-blue-600 bg-cerulean-blue-50'
                                : 'border-slate-200 bg-white hover:border-cerulean-blue-300',
                            )}
                          >
                            {plan.isPopular && (
                              <span className="absolute -top-2 right-2 rounded-full bg-cerulean-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                                {plan.badge || 'PHỔ BIẾN NHẤT'}
                              </span>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-gray-900">{plan.name}</span>
                              <span className="text-sm font-extrabold text-gray-900">
                                {plan.contactOnly ? 'Liên hệ' : `${fmtVND(plan.priceMonthly)}/tháng`}
                              </span>
                            </div>
                            <ul className="mt-2 space-y-1">
                              {plan.features.slice(0, 3).map((f) => (
                                <li key={f} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                  <Check className="h-3 w-3 shrink-0 text-emerald-500" /> {f}
                                </li>
                              ))}
                            </ul>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Chu kỳ theo gói */}
                  {selectedPlan && !selectedPlan.contactOnly && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Chu kỳ thanh toán
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {CYCLE_MONTHS.map((m) => {
                          const p = selectedPlan.cycles[m];
                          const active = cycleMonths === m;
                          const saving = m > 1 ? cycleSavingPct(m, p) : 0;
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setCycleMonths(m)}
                              className={cn(
                                'flex flex-col items-center rounded-xl border-2 px-1 py-2.5 transition-colors',
                                active
                                  ? 'border-cerulean-blue-600 bg-cerulean-blue-50'
                                  : 'border-slate-200 hover:border-cerulean-blue-300',
                              )}
                            >
                              <span className={cn('text-xs font-bold', active ? 'text-cerulean-blue-700' : 'text-slate-700')}>
                                {m} tháng
                              </span>
                              <span className={cn('mt-0.5 text-[11px] font-semibold', active ? 'text-cerulean-blue-700' : 'text-slate-500')}>
                                {fmtVND(p)}
                              </span>
                              {saving > 0 && (
                                <span className="mt-0.5 text-[10px] font-semibold text-emerald-600">tiết kiệm {saving}%</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tổng tiền */}
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-500">
                      {selectedPlan ? `Tổng tiền (${selectedPlan.name})` : 'Tổng tiền'}
                    </span>
                    <span className="text-base font-extrabold text-cerulean-blue-600">{totalLabel}</span>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting || (subscriptionsLoading ? true : isFirstRestaurant ? false : !price || !selectedPlan || selectedPlan.contactOnly)}
                className="mt-4 h-11 w-full rounded-xl bg-cerulean-blue-600 text-white font-semibold hover:bg-cerulean-blue-700"
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isFirstRestaurant ? (
                  <Gift className="mr-2 h-4 w-4" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                {isFirstRestaurant ? 'Tạo nhà hàng (Dùng thử 30 ngày)' : 'Thanh toán & Tạo nhà hàng'}
              </Button>

              {!isFirstRestaurant && !subscriptionsLoading && (
                <p className="mt-3 flex items-center justify-center gap-1 text-[11px] text-slate-400">
                  <MapPin className="h-3 w-3" /> Chi nhánh mới được kích hoạt ngay sau khi thanh toán
                </p>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}