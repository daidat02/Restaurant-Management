import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, ArrowRight, Check, Plus, RefreshCw, Users, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createRestaurant } from '@/api/restaurants.api';
import { switchTenant } from '@/api/auth.api';
import { createStaffUser } from '@/api/auth.api';
import { getOrCreateSetting, generateKitchenCode } from '@/api/setting.api';
import { createTable } from '@/api/table.api';
import { useAppDispatch } from '@/hooks/redux-hook';
import type { IRestaurant } from '@/types/restaurant.type';
import type { ITable } from '@/types/table.type';

const APP_URL = import.meta.env.VITE_BASE_URL;

const STEPS = ['Thông tin nhà hàng', 'Cấu hình cơ sở', 'Tạo nhân sự', 'Bàn & QR'];

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

  const handleFinish = () => {
    toast.success('Hoàn tất khởi tạo cơ sở mới', { position: 'top-right' });
    navigate('/admin');
  };

  const goBack = () => {
    if (step === 0) navigate('/admin/restaurants');
    else setStep((s) => s - 1);
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {/* Header + stepper */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Khởi tạo cơ sở mới</h1>
        <p className="text-sm text-slate-500">Wizard 4 bước đưa chi nhánh mới lên hoạt động</p>
        <div className="mt-4 space-y-2">
          <Progress value={((step + 1) / STEPS.length) * 100} className="h-2" />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {STEPS.map((label, i) => (
              <span
                key={label}
                className={`flex items-center gap-1 rounded-full px-3 py-1 font-medium ${
                  i === step
                    ? 'bg-cerulean-blue-600 text-white'
                    : i < step
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                }`}
              >
                {i < step && <Check className="h-3.5 w-3.5" />}
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* B1 — Thông tin nhà hàng */}
      {step === 0 && (
        <form onSubmit={handleCreateRestaurant} className="space-y-4 rounded-2xl border bg-white p-6">
          <div className="space-y-1.5">
            <Label>Tên nhà hàng *</Label>
            <Input value={rName} onChange={(e) => setRName(e.target.value)} placeholder="VD: NhamNhi Cơ Sở 3" required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Email nhà hàng</Label>
              <Input type="email" value={rEmail} onChange={(e) => setREmail(e.target.value)} placeholder="restaurant@gmail.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Số điện thoại</Label>
              <Input value={rPhone} onChange={(e) => setRPhone(e.target.value)} placeholder="095xxxxxxx" />
            </div>
            <div className="space-y-1.5">
              <Label>Sức chứa tối đa</Label>
              <Input type="number" value={rCapacity} onChange={(e) => setRCapacity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Giờ hoạt động</Label>
              <Input value={rHours} onChange={(e) => setRHours(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Địa chỉ *</Label>
            <Input value={rAddress} onChange={(e) => setRAddress(e.target.value)} placeholder="Số nhà, đường, phường/xã..." required />
          </div>
          <Button type="submit" disabled={submitting} className="w-full h-11 rounded-xl">
            Tạo nhà hàng & tiếp tục <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      )}

      {/* B2 — Cấu hình */}
      {step === 1 && (
        <div className="space-y-4 rounded-2xl border bg-white p-6">
          <p className="text-sm text-slate-600">
            Đang khởi tạo cấu hình mặc định (quản lý đơn, thanh toán, thực đơn) cho{' '}
            <b>{restaurant?.name}</b>.
          </p>
          <div className="rounded-xl border border-dashed p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Mã nhà bếp (KDS)</p>
                <p className="text-xs text-slate-400">Dùng để vào màn hình nhà bếp của cơ sở này</p>
              </div>
              <div className="flex items-center gap-2">
                {kitchenCode && (
                  <span className="rounded-lg bg-slate-100 px-4 py-2 font-mono text-2xl font-bold tracking-widest text-slate-800">
                    {kitchenCode}
                  </span>
                )}
                <Button variant="outline" size="icon" onClick={handleRegenKitchenCode} title="Tạo mã mới">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <Button onClick={handleSetup} disabled={submitting || !!kitchenCode} className="w-full h-11 rounded-xl">
            <RefreshCw className="mr-2 h-4 w-4" /> Khởi tạo cấu hình & sinh mã bếp
          </Button>
          {kitchenCode && (
            <Button onClick={() => setStep(2)} disabled={submitting} className="w-full h-11 rounded-xl">
              Tiếp tục tạo nhân sự <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* B3 — Tạo nhân sự */}
      {step === 2 && (
        <div className="space-y-4 rounded-2xl border bg-white p-6">
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Vai trò</Label>
                <Select value={uRole} onValueChange={(v) => setURole(v as 'staff' | 'manager')}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Quản lý (Manager)</SelectItem>
                    <SelectItem value="staff">Nhân viên (Staff)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Họ tên *</Label>
                <Input value={uName} onChange={(e) => setUName(e.target.value)} placeholder="Tên nhân sự" required />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" value={uEmail} onChange={(e) => setUEmail(e.target.value)} placeholder="nhanvien@gmail.com" required />
              </div>
              <div className="space-y-1.5">
                <Label>Mật khẩu *</Label>
                <Input type="password" value={uPassword} onChange={(e) => setUPassword(e.target.value)} placeholder="Ít nhất 6 ký tự" required />
              </div>
            </div>
            <Button type="submit" disabled={submitting} className="w-full h-11 rounded-xl">
              <Plus className="mr-2 h-4 w-4" /> Thêm nhân sự
            </Button>
          </form>

          {createdUsers.length > 0 && (
            <div className="rounded-xl border bg-slate-50 p-4">
              <p className="mb-2 flex items-center gap-1 text-sm font-semibold text-slate-700">
                <Users className="h-4 w-4" /> Đã tạo ({createdUsers.length})
              </p>
              <ul className="space-y-1">
                {createdUsers.map((u, i) => (
                  <li key={i} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                    <span className="font-medium">{u.name}</span>
                    <span className="text-slate-400">{u.email}</span>
                    <span className="rounded-full bg-cerulean-blue-100 px-2 py-0.5 text-xs font-medium text-cerulean-blue-700">
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
            className="w-full h-11 rounded-xl"
            variant="outline"
          >
            Bỏ qua & tiếp tục <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* B4 — Bàn & QR */}
      {step === 3 && (
        <div className="space-y-4 rounded-2xl border bg-white p-6">
          {tables.length === 0 ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Số bàn bắt đầu</Label>
                  <Input type="number" value={tStart} onChange={(e) => setTStart(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Số lượng bàn</Label>
                  <Input type="number" value={tCount} onChange={(e) => setTCount(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Số chỗ / bàn</Label>
                  <Input type="number" value={tCapacity} onChange={(e) => setTCapacity(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleCreateTables} disabled={submitting} className="w-full h-11 rounded-xl">
                <Plus className="mr-2 h-4 w-4" /> Tạo bàn & QR
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {tables.map((t) => (
                  <div key={t._id} className="flex flex-col items-center rounded-xl border p-3 text-center">
                    <QRCodeSVG
                      value={`${APP_URL}/scan-to-order?restaurantId=${restaurant?._id}&tableId=${t._id}`}
                      level="H"
                      size={120}
                    />
                    <p className="mt-2 text-sm font-semibold text-slate-700">Bàn {t.tableNumber}</p>
                  </div>
                ))}
              </div>
              <Button onClick={handleFinish} className="w-full h-11 rounded-xl">
                <Check className="mr-2 h-4 w-4" /> Hoàn tất & vào quản trị
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Điều hướng */}
      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={goBack} className="text-slate-500">
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
        </Button>
        {restaurant && (
          <span className="text-sm text-slate-400">
            Cơ sở: <b className="text-slate-600">{restaurant.name}</b>
          </span>
        )}
      </div>
    </div>
  );
}
