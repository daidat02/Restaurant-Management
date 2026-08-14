import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  User,
  Lock,
  Mail,
  Phone,
  Building2,
  CheckCircle2,
  UserRound,
  ShieldCheck,
  CircleDollarSign,
  PowerCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { StatusTag } from '@/components/StatusTag';
import { CustomInput } from '@/components/FormInput';
import { FormSelect } from '@/components/FormSelect';
import { CustomTextarea } from '@/components/CustomTextArea';
import { CustomDatePicker } from '@/components/DatePickerCustom';
import { toast } from 'sonner';
import { useUser } from '@/hooks/use-user';
import { useAuth } from '@/hooks/use-auth';
import { useActiveRestaurantId } from '@/hooks/use-active-restaurant';
import { useRestaurant } from '@/hooks/use-restaurant';
import { extractId, formatVND } from '@/utils/helpers';
import type { EmployeeFormData, UserGender } from '@/types/user.type';
import { Stepper, StepProgressLabel, type WizardStepKey } from './components/Stepper';
import { cn } from '@/lib/utils';

const ADMIN_ROLE_OPTIONS = [
  { label: 'Quản lý (Manager)', value: 'manager' },
  { label: 'Nhân viên (Staff)', value: 'staff' },
];

const MANAGER_ROLE_OPTIONS = [{ label: 'Nhân viên (Staff)', value: 'staff' }];

const GENDER_OPTIONS = [
  { label: 'Nam', value: 'male' },
  { label: 'Nữ', value: 'female' },
  { label: 'Khác', value: 'other' },
];

const WIZARD_STEPS: WizardStepKey[] = ['account', 'hr', 'emergency'];

/** Kiểu lỗi theo field để hiển thị inline sát từng input */
type FieldErrors = {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  restaurant?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(0|\+84)[0-9]{9,10}$/;

export default function UserFormPage() {
  const navigate = useNavigate();
  const params = useParams();
  const { createUser, editUser, fetchUserById } = useUser();
  const { user: currentUser } = useAuth();
  const { restaurants, fetchRestaurants } = useRestaurant();
  // Chi nhánh đang làm việc (manager/staff) — nguồn DUY NHẤT cho default của form tạo mới
  const activeRestaurantId = useActiveRestaurantId();

  const isEditing = !!params.id;
  const userId = params.id as string | undefined;

  const [activeTab, setActiveTab] = useState<WizardStepKey>('account');
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<string>(
    () => (isEditing ? '' : currentUser?.role === 'admin' ? 'manager' : 'staff'),
  );
  const [restaurantSelected, setRestaurantSelected] = useState<string>(
    () => (isEditing ? '' : currentUser?.role !== 'admin' ? activeRestaurantId : ''),
  );
  // Admin chỉ có 1 chi nhánh → dùng luôn chi nhánh đó làm default (không cần chọn tay)
  const effectiveRestaurantId = restaurantSelected || (restaurants.length === 1 ? restaurants[0]._id : '');
  const [address, setAddress] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [position, setPosition] = useState('');
  const [gender, setGender] = useState<UserGender>('male');
  const [birthday, setBirthday] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState('');
  const [isActive, setIsActive] = useState(true);

  const backPath = currentUser?.role === 'admin' ? '/admin/customers' : '/manager/staff';

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  useEffect(() => {
    if (isEditing && userId) {
      fetchUserById(userId)
        .then((user) => {
          if (user) {
            setName(user.name || '');
            setEmail(user.email || '');
            setPhone(user.phone || '');
            setRole(user.role || 'staff');
            setAddress(user.address || '');
            setEmployeeCode(user.employeeCode || '');
            setPosition(user.position || '');
            setGender(user.gender || 'male');
            setBirthday(user.birthday ? user.birthday.split('T')[0] : '');
            setNationalId(user.nationalId || '');
            setHireDate(user.hireDate ? user.hireDate.split('T')[0] : '');
            setBaseSalary(user.baseSalary ? String(user.baseSalary) : '');
            setEmergencyContactName(user.emergencyContact?.name || '');
            setEmergencyContactPhone(user.emergencyContact?.phone || '');
            setEmergencyContactRelation(user.emergencyContact?.relation || '');
            setIsActive(user.isActive !== undefined ? user.isActive : true);
            if (currentUser?.role === 'admin') {
              const rid = user.restaurantIds?.[0] || user.restaurant;
              setRestaurantSelected(extractId(rid));
            }
          }
        })
        .catch((err) => {
          const msg = err.message || 'Không tải được thông tin người dùng';
          setError(msg);
          toast.error(msg);
        })
        .finally(() => setIsLoading(false));
    }
  }, [isEditing, userId, currentUser, fetchUserById]);

  const filteredRoleOptions = useMemo(() => {
    if (currentUser?.role === 'admin') return ADMIN_ROLE_OPTIONS;
    return MANAGER_ROLE_OPTIONS;
  }, [currentUser?.role]);

  const defaultManagerRestaurant = activeRestaurantId;

  const activeIndex = WIZARD_STEPS.indexOf(activeTab);

  // ---- Inline validation theo bước ----
  const validateStep = (step: WizardStepKey): boolean => {
    const errors: FieldErrors = {};
    let valid = true;

    if (step === 'account') {
      if (!name.trim()) {
        errors.name = 'Vui lòng nhập họ và tên.';
        valid = false;
      } else if (name.trim().length < 2) {
        errors.name = 'Họ và tên phải có ít nhất 2 ký tự.';
        valid = false;
      }

      if (!email.trim()) {
        errors.email = 'Vui lòng nhập địa chỉ email.';
        valid = false;
      } else if (!EMAIL_RE.test(email.trim())) {
        errors.email = 'Email không hợp lệ.';
        valid = false;
      }

      if (!phone.trim()) {
        errors.phone = 'Vui lòng nhập số điện thoại.';
        valid = false;
      } else if (!PHONE_RE.test(phone.trim().replace(/\s/g, ''))) {
        errors.phone = 'SĐT không hợp lệ (VD: 0901234567, +84901234567).';
        valid = false;
      }

      if (!isEditing && !password.trim()) {
        errors.password = 'Vui lòng nhập mật khẩu.';
        valid = false;
      } else if (password && password.length < 6) {
        errors.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
        valid = false;
      }

      if ((!isEditing || password) && password !== confirmPassword) {
        errors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
        valid = false;
      }

      if (role !== 'admin' && !effectiveRestaurantId) {
        errors.restaurant = 'Vui lòng chọn chi nhánh cho tài khoản.';
        valid = false;
      }
    }

    setFieldErrors(errors);
    if (!valid) {
      setError(null);
      toast.error('Vui lòng kiểm tra lại các trường được đánh dấu đỏ.');
    }
    return valid;
  };

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const goToStep = (index: number) => {
    setActiveTab(WIZARD_STEPS[index]);
    setError(null);
    setFieldErrors({});
  };

  const handleNext = () => {
    const current = WIZARD_STEPS[activeIndex];
    if (!validateStep(current)) return;
    goToStep(activeIndex + 1);
  };

  const handleSubmit = async () => {
    setError(null);

    // Validate lại toàn bộ, ưu tiên đưa người dùng về bước dính lỗi đầu tiên
    if (!validateStep('account')) {
      setActiveTab('account');
      return;
    }
    if (!validateStep('emergency')) {
      setActiveTab('emergency');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalRestaurant =
        currentUser?.role === 'admin' ? effectiveRestaurantId : defaultManagerRestaurant;

      const payload: EmployeeFormData = {
        name,
        email,
        phone,
        role: role as 'staff' | 'manager',
        restaurant: finalRestaurant,
        address: address || undefined,
        employeeCode: employeeCode || undefined,
        position: position || undefined,
        gender,
        birthday: birthday || undefined,
        nationalId: nationalId || undefined,
        hireDate: hireDate || undefined,
        baseSalary: baseSalary ? Number(baseSalary) : undefined,
        emergencyContact:
          emergencyContactName || emergencyContactPhone || emergencyContactRelation
            ? {
                name: emergencyContactName || undefined,
                phone: emergencyContactPhone || undefined,
                relation: emergencyContactRelation || undefined,
              }
            : undefined,
      };

      if (password.trim()) {
        payload.password = password;
      }

      if (isEditing) {
        payload.isActive = isActive;
      }

      let success = false;
      if (isEditing && userId) {
        const updated = await editUser(userId, payload);
        if (updated) success = true;
      } else {
        const created = await createUser(payload);
        if (created) success = true;
      }

      if (success) {
        toast.success(isEditing ? 'Cập nhật thành công' : 'Tạo nhân viên thành công');
        navigate(backPath);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Có lỗi xảy ra');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedRestaurantName = useMemo(() => {
    return restaurants.find((r) => r._id === effectiveRestaurantId)?.name || 'Chưa chọn nhà hàng';
  }, [restaurants, effectiveRestaurantId]);

  const salaryDisplay = baseSalary
    ? formatVND(Number(baseSalary))
    : null;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center min-h-[400px]">
        <span className="relative flex h-12 w-12 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-2xl bg-cerulean-blue-200 opacity-60" />
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-cerulean-blue-600 text-white shadow-lg shadow-cerulean-blue-200">
            <Loader2 className="h-5 w-5 animate-spin" />
          </span>
        </span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="min-h-screen bg-slate-50 p-4 text-slate-800 md:p-8">
        {/* HEADER (giống restaurant detail, không cố định) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            aria-label="Quay lại danh sách nhân viên"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:text-cerulean-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Nhân Viên</h1>
            <p className="text-sm text-slate-500">
              {isEditing ? 'Chỉnh sửa thông tin nhân viên của chi nhánh.' : 'Thêm nhân viên mới cho chi nhánh.'}
            </p>
          </div>
        </div>

        {/* BODY */}
        <div className="mx-auto mt-6 w-full max-w-4xl space-y-5">
          {/* Stepper tiến trình */}
          <div className="rounded-2xl border border-slate-200/80 bg-white px-3 py-4 shadow-sm sm:px-6">
            <Stepper
              steps={WIZARD_STEPS}
              currentIndex={activeIndex}
              onStepClick={activeIndex > 0 ? goToStep : undefined}
            />
          </div>

          {/* Summary card */}
          <div className="flex flex-col gap-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cerulean-blue-600 to-cerulean-blue-800 text-lg font-bold uppercase text-white shadow-lg shadow-cerulean-blue-200">
                {name ? name.charAt(0) : <User className="h-7 w-7 text-white/80" />}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-bold text-slate-900">
                    {name || 'Tên nhân viên mới'}
                  </h2>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                      role === 'manager'
                        ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-100'
                        : 'bg-cerulean-blue-50 text-cerulean-blue-700 ring-1 ring-cerulean-blue-100',
                    )}
                  >
                    <ShieldCheck className="h-3 w-3" />
                    {role === 'manager' ? 'Quản lý' : 'Nhân viên'}
                  </span>
                  {isEditing && <StatusTag status={isActive ? 'Active' : 'Inactive'} />}
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  {email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      {email}
                    </span>
                  )}
                  {phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {phone}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="grid w-full shrink-0 grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs sm:grid-cols-3 md:w-auto md:min-w-64">
              <div className="flex flex-col items-center gap-1 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-500">
                  <Building2 className="h-3.5 w-3.5 text-cerulean-blue-500" />
                  Chi nhánh
                </span>
                <span className="max-w-28 truncate font-semibold text-slate-900">
                  {selectedRestaurantName}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-500">
                  <UserRound className="h-3.5 w-3.5 text-cerulean-blue-500" />
                  Mã NV
                </span>
                <span className="max-w-28 truncate font-mono font-semibold text-slate-900">
                  {employeeCode || '—'}
                </span>
              </div>
              {salaryDisplay && (
                <div className="col-span-2 flex flex-col items-center gap-1 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100 sm:col-span-1">
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-500">
                    <CircleDollarSign className="h-3.5 w-3.5 text-cerulean-blue-500" />
                    Lương cơ bản
                  </span>
                  <span className="max-w-28 truncate font-semibold text-emerald-600">
                    {salaryDisplay}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Form content */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-8">
            {activeTab === 'account' && (
              <section className="space-y-6" aria-labelledby="step-account-title">
                <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cerulean-blue-50 text-cerulean-blue-600">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 id="step-account-title" className="font-semibold text-slate-900">
                      Thông tin cơ bản & Đăng nhập
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Quản lý thông tin xác thực và chi nhánh làm việc
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <CustomInput
                    label="Họ và tên *"
                    placeholder="Nguyễn Văn A"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      clearFieldError('name');
                    }}
                    error={fieldErrors.name}
                    autoComplete="name"
                  />

                  <FormSelect
                    label="Vai trò hệ thống *"
                    placeholder="Chọn vai trò"
                    options={filteredRoleOptions}
                    value={role}
                    onValueChange={(value) => setRole(value)}
                    disabled={isEditing}
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <CustomInput
                    type="email"
                    label="Địa chỉ Email *"
                    placeholder="example@gmail.com"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearFieldError('email');
                    }}
                    error={fieldErrors.email}
                    autoComplete="email"
                  />
                  <CustomInput
                    label="Số điện thoại *"
                    placeholder="090xxxxxxx"
                    required
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      clearFieldError('phone');
                    }}
                    error={fieldErrors.phone}
                    autoComplete="tel"
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <FormSelect
                    label="Nhà Hàng / Chi nhánh *"
                    placeholder={
                      currentUser?.role === 'admin' ? 'Chọn nhà hàng' : 'Chi nhánh trực thuộc'
                    }
                    options={restaurants.map((r) => ({ label: r.name, value: r._id }))}
                    value={effectiveRestaurantId}
                    onValueChange={(value) => {
                      setRestaurantSelected(value);
                      clearFieldError('restaurant');
                    }}
                    disabled={currentUser?.role !== 'admin' || isEditing}
                    error={fieldErrors.restaurant}
                  />
                </div>

                {isEditing && (
                  <div className="flex flex-col gap-4 rounded-xl border border-slate-200/60 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-cerulean-blue-600 ring-1 ring-slate-100">
                        <PowerCircle className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Trạng thái tài khoản</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {isActive
                            ? 'Tài khoản đang hoạt động bình thường.'
                            : 'Tài khoản bị tạm khóa, không thể đăng nhập.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'text-xs font-semibold',
                          isActive ? 'text-emerald-600' : 'text-rose-600',
                        )}
                      >
                        {isActive ? 'Hoạt động' : 'Tạm khóa'}
                      </span>
                      <Switch
                        checked={isActive}
                        onCheckedChange={setIsActive}
                        aria-label="Cập nhật trạng thái tài khoản"
                        className={cn(
                          'data-[state=checked]:bg-emerald-500',
                          !isActive && 'data-[state=unchecked]:bg-rose-400',
                        )}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-4 rounded-xl border border-slate-200/60 bg-slate-50 p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    <Lock className="h-4 w-4 text-cerulean-blue-600" />
                    <span>Bảo mật mật khẩu</span>
                  </div>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <CustomInput
                      type="password"
                      label={isEditing ? 'Mật khẩu mới (Để trống nếu không đổi)' : 'Mật khẩu *'}
                      placeholder={isEditing ? '••••••••' : 'Nhập mật khẩu'}
                      required={!isEditing}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearFieldError('password');
                      }}
                      error={fieldErrors.password}
                      autoComplete="new-password"
                    />
                    <CustomInput
                      type="password"
                      label="Xác nhận mật khẩu"
                      placeholder="••••••••"
                      required={!isEditing || !!password}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        clearFieldError('confirmPassword');
                      }}
                      error={fieldErrors.confirmPassword}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <CustomTextarea
                  label="Địa chỉ thường trú"
                  placeholder="Nhập địa chỉ đầy đủ (Số nhà, đường, phường/xã...)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </section>
            )}

            {activeTab === 'hr' && (
              <section className="space-y-6" aria-labelledby="step-hr-title">
                <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cerulean-blue-50 text-cerulean-blue-600">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 id="step-hr-title" className="font-semibold text-slate-900">
                      Thông tin nhân sự & Hợp đồng
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Các chỉ số phục vụ quản lý nhân sự, tính lương và hợp đồng
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <CustomInput
                    label="Mã nhân viên"
                    placeholder="VD: NV001"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                  />
                  <CustomInput
                    label="Chức danh / Vị trí"
                    placeholder="VD: Bếp trưởng, Phục vụ, Thu ngân..."
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <FormSelect
                    label="Giới tính"
                    placeholder="Chọn giới tính"
                    options={GENDER_OPTIONS}
                    value={gender}
                    onValueChange={(value) => setGender(value as UserGender)}
                  />
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Ngày sinh</label>
                    <CustomDatePicker value={birthday} onChange={setBirthday} className="w-full" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Ngày vào làm
                    </label>
                    <CustomDatePicker value={hireDate} onChange={setHireDate} className="w-full" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <CustomInput
                    label="Số CCCD / CMND"
                    placeholder="12 chữ số"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                  />
                  <CustomInput
                    type="number"
                    label="Lương cơ bản (VNĐ)"
                    placeholder="VD: 7000000"
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(e.target.value)}
                  />
                </div>
              </section>
            )}

            {activeTab === 'emergency' && (
              <section className="space-y-6" aria-labelledby="step-emergency-title">
                <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cerulean-blue-50 text-cerulean-blue-600">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 id="step-emergency-title" className="font-semibold text-slate-900">
                      Thông tin người liên hệ khẩn cấp
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Sử dụng trong các trường hợp sự cố hoặc thông báo đặc biệt
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 md:grid-cols-3 md:p-6">
                  <CustomInput
                    label="Tên người liên hệ"
                    placeholder="Nguyễn Văn A"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                  />
                  <CustomInput
                    type="tel"
                    label="Số điện thoại"
                    placeholder="090xxxxxxx"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  />
                  <CustomInput
                    label="Mối quan hệ"
                    placeholder="Vợ, Chồng, Cha, Mẹ..."
                    value={emergencyContactRelation}
                    onChange={(e) => setEmergencyContactRelation(e.target.value)}
                  />
                </div>
              </section>
            )}

            {error && (
              <div
                role="alert"
                className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600"
              >
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-600" />
                <span>{error}</span>
              </div>
            )}

          {/* Action bar dưới form (nằm trong card form) */}
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <div className="hidden sm:block">
              <StepProgressLabel currentIndex={activeIndex} total={WIZARD_STEPS.length} />
            </div>

            <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
              {activeIndex > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => goToStep(activeIndex - 1)}
                  className="rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Quay lại
                </Button>
              ) : (
                <span className="sm:hidden">
                  <StepProgressLabel currentIndex={activeIndex} total={WIZARD_STEPS.length} />
                </span>
              )}

              {activeIndex < WIZARD_STEPS.length - 1 && (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="rounded-xl bg-cerulean-blue-600 px-6 text-white shadow-sm shadow-cerulean-blue-200 transition-all hover:bg-cerulean-blue-700 active:scale-[0.98]"
                >
                  Tiếp theo
                </Button>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Nút lưu cố định góc phải dưới (như restaurant detail) — bước cuối khi tạo mới; mọi bước khi chỉnh sửa */}
      {(isEditing || activeIndex === WIZARD_STEPS.length - 1) && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="fixed bottom-6 right-6 z-50 flex h-11 items-center gap-2 rounded-2xl bg-cerulean-blue-600 px-5 text-sm font-semibold text-white shadow-xl shadow-cerulean-blue-300/60 transition hover:bg-cerulean-blue-700 disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {isEditing ? 'Lưu cập nhật' : 'Hoàn tất tạo'}
        </button>
      )}
    </div>
  );
}