import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  RefreshCw,
  Users,
  Printer,
  Store,
  Settings2,
  Table2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createRestaurant } from '@/api/restaurants.api';
import { getProfileMe, switchTenant } from '@/api/auth.api';
import { createStaffUser } from '@/api/auth.api';
import { getOrCreateSetting, generateKitchenCode } from '@/api/setting.api';
import { createTable } from '@/api/table.api';
import { useAppDispatch } from '@/hooks/redux-hook';
import { updateUserInfo } from '@/redux/slices/authSlice';
import { BrandLogo } from '@/pages/Landing/Navbar';
import type { IRestaurant } from '@/types/restaurant.type';
import type { ITable } from '@/types/table.type';

const APP_URL = import.meta.env.VITE_BASE_URL;

const STEPS = ['Thông tin nhà hàng', 'Cấu hình cơ sở', 'Tạo nhân sự', 'Bàn & QR'];

const STEP_META = [
  { icon: Store, title: 'Thông tin nhà hàng', desc: 'Điền thông tin cơ bản để mở cơ sở đầu tiên.' },
  { icon: Settings2, title: 'Cấu hình cơ sở', desc: 'Khởi tạo cấu hình mặc định và mã nhà bếp.' },
  { icon: Users, title: 'Tạo nhân sự', desc: 'Thêm quản lý, nhân viên làm việc tại cơ sở.' },
  { icon: Table2, title: 'Bàn & QR', desc: 'Tạo bàn và mã QR để khách gọi món.' },
];

interface UserCreated {
  name: string;
  email: string;
  role: string;
}

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // B1 — thông tin nhà hàng
  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [rName, setRName] = useState('');
  const [rAddress, setRAddress] = useState('');
  const [rEmail, setREmail] = useState('');
  const [rPhone, setRPhone] = useState('');
  const [rCapacity, setRCapacity] = useState('100');
  const [rHours, setRHours] = useState('08:00 - 22:00');

  // B2 — cấu hình
  const [kitchenCode, setKitchenCode] = useState('');

  // B3 — nhân sự
  const [uRole, setURole] = useState<'staff' | 'manager'>('manager');
  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uPhone, setUPhone] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [createdUsers, setCreatedUsers] = useState<UserCreated[]>([]);

  // B4 — bàn
  const [tStart, setTStart] = useState('1');
  const [tCount, setTCount] = useState('4');
  const [tCapacity, setTCapacity] = useState('2');
  const [tables, setTables] = useState<ITable[]>([]);

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await createRestaurant({
        name: rName,
        address: rAddress,
        email: rEmail,
        phone: rPhone,
        capacity: Number(rCapacity),
        operatingHours: rHours,
        status: 'active',
      });
      const newRestaurant = result as unknown as IRestaurant;
      if (!newRestaurant?._id) throw new Error('Không nhận được dữ liệu nhà hàng mới');
      setRestaurant(newRestaurant);
      // KHÔNG refresh restaurantIds ngay đây: guard OnboardingRoute (live) thấy admin đã có
      // nhà hàng sẽ đá về /admin giữa chừng wizard. Chỉ refresh khi handleFinish.
      // Chuyển sang cơ sở mới để token hoạt động trên tenant vừa tạo
      await switchTenant(newRestaurant._id, dispatch);
      toast.success('Tạo nhà hàng thành công', { position: 'top-right' });
      setStep(1);
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi tạo nhà hàng', { position: 'top-right' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetup = async () => {
    if (!restaurant?._id) return;
    setSubmitting(true);
    try {
      // Khởi tạo setting mặc định cho tenant mới (get-or-create)
      const setting = await getOrCreateSetting('restaurant', 'Restaurant', restaurant._id);
      if (setting?._id) {
        // Sinh mã nhà bếp
        const kd = await generateKitchenCode(setting._id);
        setKitchenCode(kd?.kitchenCode || '');
      }
      toast.success('Cấu hình cơ sở hoàn tất', { position: 'top-right' });
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi cấu hình cơ sở', { position: 'top-right' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegenKitchenCode = async () => {
    if (!restaurant?._id) return;
    try {
      const setting = await getOrCreateSetting('restaurant', 'Restaurant', restaurant._id);
      if (setting?._id) {
        const kd = await generateKitchenCode(setting._id);
        setKitchenCode(kd?.kitchenCode || '');
        toast.success('Đã tạo mã nhà bếp mới', { position: 'top-right' });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi tạo mã nhà bếp', { position: 'top-right' });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const user = await createStaffUser({
        name: uName,
        email: uEmail,
        phone: uPhone || undefined,
        password: uPassword,
        role: uRole,
      });
      setCreatedUsers((prev) => [
        ...prev,
        { name: user?.name || uName, email: user?.email || uEmail, role: user?.role || uRole },
      ]);
      setUName('');
      setUEmail('');
      setUPhone('');
      setUPassword('');
      toast.success('Tạo nhân sự thành công', { position: 'top-right' });
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi tạo nhân sự', { position: 'top-right' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTables = async () => {
    if (!restaurant?._id) return;
    setSubmitting(true);
    try {
      const start = Number(tStart);
      const count = Number(tCount);
      const cap = Number(tCapacity);
      const created: ITable[] = [];
      for (let i = 0; i < count; i++) {
        const table = await createTable({
          restaurant: restaurant._id,
          tableNumber: start + i,
          capacity: cap,
          status: 'available',
        });
        created.push(table as unknown as ITable);
      }
      setTables(created);
      toast.success(`Đã tạo ${created.length} bàn`, { position: 'top-right' });
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi tạo bàn', { position: 'top-right' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = async () => {
    // Làm mới restaurantIds từ server trước khi sang /admin để guard không quay lại /onboarding
    try {
      const profile = await getProfileMe();
      if (profile && Array.isArray(profile.restaurantIds)) {
        dispatch(updateUserInfo({ restaurantIds: profile.restaurantIds }));
      }
    } catch {
      // Vẫn cho đi tiếp; nếu cần, interceptor NEEDS_ONBOARDING sẽ phòng vệ.
    }
    toast.success('Hoàn tất khởi tạo cơ sở mới', { position: 'top-right' });
    navigate('/admin');
  };

  const goBack = () => {
    if (step === 0) navigate('/admin/restaurants');
    else setStep((s) => s - 1);
  };

  const StepIcon = STEP_META[step].icon;
  const currentMeta = STEP_META[step];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white text-gray-900 font-sans antialiased">
      {/* Decorative blobs — đồng bộ với landing page */}
      <div className="pointer-events-none absolute -top-32 right-0 h-[480px] w-[480px] rounded-full bg-cerulean-blue-50 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 top-64 h-[360px] w-[360px] rounded-full bg-slate-50 blur-3xl" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <BrandLogo />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cerulean-blue-200 bg-cerulean-blue-50 px-3 py-1 text-xs font-semibold text-cerulean-blue-700">
            <Sparkles className="h-3.5 w-3.5" />
            Khởi tạo cơ sở mới
          </span>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        {/* Stepper */}
        <div className="mb-10">
          <div className="flex items-center justify-between">
            {STEPS.map((label, i) => {
              const Meta = STEP_META[i].icon;
              const isDone = i < step;
              const isActive = i === step;
              return (
                <div key={label} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-2">
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200 ${
                        isDone
                          ? 'bg-emerald-100 text-emerald-600'
                          : isActive
                            ? 'bg-cerulean-blue-600 text-white shadow-lg shadow-cerulean-blue-200'
                            : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isDone ? <Check className="h-5 w-5" /> : <Meta className="h-5 w-5" />}
                    </span>
                    <span
                      className={`hidden text-xs font-semibold sm:block ${
                        isActive ? 'text-cerulean-blue-700' : isDone ? 'text-slate-600' : 'text-slate-400'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`mx-3 mb-5 h-0.5 flex-1 rounded-full sm:mb-6 ${
                        isDone ? 'bg-emerald-300' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step intro */}
        <div className="mb-6 flex items-start gap-4">
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cerulean-blue-50 text-cerulean-blue-600 sm:flex">
            <StepIcon className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
              {currentMeta.title}
            </h1>
            <p className="mt-1 text-sm text-slate-500 sm:text-base">{currentMeta.desc}</p>
          </div>
        </div>

        {/* B1 — Thông tin nhà hàng */}
        {step === 0 && (
          <form
            onSubmit={handleCreateRestaurant}
            className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(30,64,175,0.06)] lg:p-8"
          >
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-gray-900">Tên nhà hàng *</Label>
              <Input value={rName} onChange={(e) => setRName(e.target.value)} placeholder="VD: NhamNhi Cơ Sở 3" required className="h-11 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-900">Email nhà hàng</Label>
                <Input type="email" value={rEmail} onChange={(e) => setREmail(e.target.value)} placeholder="restaurant@gmail.com" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-900">Số điện thoại</Label>
                <Input value={rPhone} onChange={(e) => setRPhone(e.target.value)} placeholder="095xxxxxxx" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-900">Sức chứa tối đa</Label>
                <Input type="number" value={rCapacity} onChange={(e) => setRCapacity(e.target.value)} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-900">Giờ hoạt động</Label>
                <Input value={rHours} onChange={(e) => setRHours(e.target.value)} className="h-11 rounded-xl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-gray-900">Địa chỉ *</Label>
              <Input value={rAddress} onChange={(e) => setRAddress(e.target.value)} placeholder="Số nhà, đường, phường/xã..." required className="h-11 rounded-xl" />
            </div>
            <Button type="submit" disabled={submitting} className="h-11 w-full rounded-xl bg-cerulean-blue-600 text-white font-semibold hover:bg-cerulean-blue-700">
              Tạo nhà hàng & tiếp tục <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        )}

        {/* B2 — Cấu hình */}
        {step === 1 && (
          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(30,64,175,0.06)] lg:p-8">
            <p className="text-sm text-slate-600 sm:text-base">
              Đang khởi tạo cấu hình mặc định (quản lý đơn, thanh toán, thực đơn) cho{' '}
              <b className="text-gray-900">{restaurant?.name}</b>.
            </p>
            <div className="rounded-2xl border border-dashed border-cerulean-blue-200 bg-cerulean-blue-50/40 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Mã nhà bếp (KDS)</p>
                  <p className="text-xs text-slate-500">Dùng để vào màn hình nhà bếp của cơ sở này</p>
                </div>
                <div className="flex items-center gap-2">
                  {kitchenCode && (
                    <span className="rounded-xl bg-white px-4 py-2 font-mono text-2xl font-bold tracking-widest text-cerulean-blue-700 ring-1 ring-cerulean-blue-200">
                      {kitchenCode}
                    </span>
                  )}
                  <Button variant="outline" size="icon" onClick={handleRegenKitchenCode} title="Tạo mã mới" className="rounded-xl border-slate-200">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <Button onClick={handleSetup} disabled={submitting || !!kitchenCode} className="h-11 w-full rounded-xl bg-cerulean-blue-600 text-white font-semibold hover:bg-cerulean-blue-700">
              <RefreshCw className="mr-2 h-4 w-4" /> Khởi tạo cấu hình & sinh mã bếp
            </Button>
            {kitchenCode && (
              <Button onClick={() => setStep(2)} disabled={submitting} className="h-11 w-full rounded-xl bg-cerulean-blue-600 text-white font-semibold hover:bg-cerulean-blue-700">
                Tiếp tục tạo nhân sự <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* B3 — Tạo nhân sự */}
        {step === 2 && (
          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(30,64,175,0.06)] lg:p-8">
            <form onSubmit={handleCreateUser} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-900">Vai trò</Label>
                  <Select value={uRole} onValueChange={(v) => setURole(v as 'staff' | 'manager')}>
                    <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Quản lý (Manager)</SelectItem>
                      <SelectItem value="staff">Nhân viên (Staff)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-900">Họ tên *</Label>
                  <Input value={uName} onChange={(e) => setUName(e.target.value)} placeholder="Tên nhân sự" required className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-900">Email *</Label>
                  <Input type="email" value={uEmail} onChange={(e) => setUEmail(e.target.value)} placeholder="nhanvien@gmail.com" required className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-900">Mật khẩu *</Label>
                  <Input type="password" value={uPassword} onChange={(e) => setUPassword(e.target.value)} placeholder="Ít nhất 6 ký tự" required className="h-11 rounded-xl" />
                </div>
              </div>
              <Button type="submit" disabled={submitting} className="h-11 w-full rounded-xl bg-cerulean-blue-600 text-white font-semibold hover:bg-cerulean-blue-700">
                <Plus className="mr-2 h-4 w-4" /> Thêm nhân sự
              </Button>
            </form>

            {createdUsers.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                  <Users className="h-4 w-4 text-cerulean-blue-600" /> Đã tạo ({createdUsers.length})
                </p>
                <ul className="space-y-2">
                  {createdUsers.map((u, i) => (
                    <li key={i} className="flex items-center justify-between rounded-xl bg-white px-4 py-2.5 text-sm ring-1 ring-slate-100">
                      <span className="font-medium text-gray-900">{u.name}</span>
                      <span className="text-slate-400">{u.email}</span>
                      <span className="rounded-full bg-cerulean-blue-50 px-2.5 py-0.5 text-xs font-semibold text-cerulean-blue-700">
                        {u.role}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              onClick={() => setStep(3)}
              disabled={submitting}
              className="h-11 w-full rounded-xl border-slate-200 bg-white font-semibold text-slate-700"
              variant="outline"
            >
              Bỏ qua & tiếp tục <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* B4 — Bàn & QR */}
        {step === 3 && (
          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(30,64,175,0.06)] lg:p-8">
            {tables.length === 0 ? (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-gray-900">Số bàn bắt đầu</Label>
                    <Input type="number" value={tStart} onChange={(e) => setTStart(e.target.value)} className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-gray-900">Số lượng bàn</Label>
                    <Input type="number" value={tCount} onChange={(e) => setTCount(e.target.value)} className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-gray-900">Số chỗ / bàn</Label>
                    <Input type="number" value={tCapacity} onChange={(e) => setTCapacity(e.target.value)} className="h-11 rounded-xl" />
                  </div>
                </div>
                <Button onClick={handleCreateTables} disabled={submitting} className="h-11 w-full rounded-xl bg-cerulean-blue-600 text-white font-semibold hover:bg-cerulean-blue-700">
                  <Plus className="mr-2 h-4 w-4" /> Tạo bàn & QR
                </Button>
              </>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {tables.map((t) => (
                    <div key={t._id} className="flex flex-col items-center rounded-2xl border border-slate-200 bg-cerulean-blue-50/30 p-4 text-center transition-all duration-200 hover:border-cerulean-blue-200 hover:shadow-[0_8px_30px_rgba(30,64,175,0.08)]">
                      <QRCodeSVG
                        value={`${APP_URL}/scan-to-order?restaurantId=${restaurant?._id}&tableId=${t._id}`}
                        level="H"
                        size={110}
                        className="rounded-lg"
                      />
                      <p className="mt-3 text-sm font-bold text-gray-900">Bàn {t.tableNumber}</p>
                      <p className="text-xs text-slate-400">
                        <Printer className="mr-1 inline h-3 w-3" />
                        {t.capacity} chỗ
                      </p>
                    </div>
                  ))}
                </div>
                <Button onClick={handleFinish} className="h-11 w-full rounded-xl bg-cerulean-blue-600 text-white font-semibold hover:bg-cerulean-blue-700">
                  <Check className="mr-2 h-4 w-4" /> Hoàn tất & vào quản trị
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Điều hướng */}
        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" onClick={goBack} className="text-slate-500 hover:text-gray-900 hover:bg-slate-100">
            <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
          </Button>
          {restaurant && (
            <span className="text-sm text-slate-400">
              Cơ sở: <b className="text-gray-900">{restaurant.name}</b>
            </span>
          )}
        </div>
      </main>
    </div>
  );
}
