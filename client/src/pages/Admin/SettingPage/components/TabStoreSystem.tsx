import { useCallback, useEffect, useState } from 'react';
import { Printer, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { SettingCard, Field, TextArea, ToggleRow } from './settings-ui';
import type { ISetting } from '@/types/setting.type';
import type { IRestaurant } from '@/types/restaurant.type';

interface TabStoreSystemProps {
  setting: ISetting | null;
  restaurant?: IRestaurant | null;
  isAdmin?: boolean;
  editSetting: (id: string, data: Partial<ISetting>) => Promise<ISetting | undefined>;
  updateRestaurant?: (
    id: string,
    data: Partial<Omit<IRestaurant, 'id' | 'createdAt'>>,
  ) => Promise<boolean>;
  generateKitchenCode?: (settingId: string) => Promise<{ kitchenCode: string } | undefined>;
  registerSave: (key: string, handler?: () => Promise<boolean>) => void;
  onDirty: () => void;
}

/** Tab "Cửa hàng & Hệ thống" — admin/manager. Dữ liệu cửa hàng từ Restaurant, cấu hình từ useSetting. */
export default function TabStoreSystem({
  setting,
  restaurant,
  isAdmin = true,
  editSetting,
  updateRestaurant,
  generateKitchenCode,
  registerSave,
  onDirty,
}: TabStoreSystemProps) {
  const rc = setting?.receiptConfig;
  const sc = setting?.systemConfig;
  const mc = setting?.menuConfig;

  const [storeName, setStoreName] = useState(restaurant?.name ?? '');
  const [description, setDescription] = useState(restaurant?.description ?? '');
  const [phone, setPhone] = useState(restaurant?.phone ?? '');
  const [zaloPersonal, setZaloPersonal] = useState('');
  const [zaloOa, setZaloOa] = useState('');
  const [email, setEmail] = useState(restaurant?.email ?? '');
  const [address, setAddress] = useState(restaurant?.address ?? '');
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [vat, setVat] = useState(String(rc?.vat ?? 0));
  const [serviceFee, setServiceFee] = useState(String(rc?.serviceFee ?? 0));
  const [footerText, setFooterText] = useState(rc?.footerText ?? 'Cảm ơn quý khách! Hẹn gặp lại.');
  const [autoPrint, setAutoPrint] = useState(rc?.autoPrintOnCheckout ?? true);
  const [printKitchen, setPrintKitchen] = useState(rc?.autoPrintToKitchen ?? true);
  const [allowTakeAway, setAllowTakeAway] = useState(mc?.allowToGo ?? true);
  const [requireOtp, setRequireOtp] = useState(sc?.requireOtpForVoid ?? true);
  const [maintenance, setMaintenance] = useState(sc?.maintenanceMode ?? false);
  const [autoDailyReport, setAutoDailyReport] = useState(false);
  const [kitchenCode, setKitchenCode] = useState(sc?.kitchenCode ?? '');
  const [generatingCode, setGeneratingCode] = useState(false);

  const storeInitial = storeName || restaurant?.name || '?';
  const subscriptionLabel = restaurant?.subscription
    ? restaurant.subscription === 'active'
      ? 'Đang hoạt động'
      : restaurant.subscription === 'trial'
        ? 'Dùng thử'
        : 'Bị khoá'
    : restaurant
      ? restaurant.status === 'inactive'
        ? 'Ngưng hoạt động'
        : 'Hoạt động'
      : '—';

  // Đồng bộ lại form khi nhà hàng / cấu hình vừa tải xong (async).
  useEffect(() => {
    setStoreName(restaurant?.name ?? '');
    setDescription(restaurant?.description ?? '');
    setPhone(restaurant?.phone ?? '');
    setEmail(restaurant?.email ?? '');
    setAddress(restaurant?.address ?? '');
    setVat(String(rc?.vat ?? 0));
    setServiceFee(String(rc?.serviceFee ?? 0));
    setFooterText(rc?.footerText ?? 'Cảm ơn quý khách! Hẹn gặp lại.');
    setAutoPrint(rc?.autoPrintOnCheckout ?? true);
    setPrintKitchen(rc?.autoPrintToKitchen ?? true);
    setAllowTakeAway(mc?.allowToGo ?? true);
    setRequireOtp(sc?.requireOtpForVoid ?? true);
    setMaintenance(sc?.maintenanceMode ?? false);
    setKitchenCode(sc?.kitchenCode ?? '');
  }, [restaurant, rc, sc, mc]);

  const handleGenerateCode = async () => {
    if (!setting?._id) {
      toast.error('Chưa có cấu hình nhà hàng để tạo mã bếp', { position: 'top-right' });
      return;
    }
    setGeneratingCode(true);
    const result = await generateKitchenCode?.(setting._id);
    setGeneratingCode(false);
    if (result?.kitchenCode) {
      setKitchenCode(result.kitchenCode);
      toast.success(`Mã bếp mới: ${result.kitchenCode}`, { position: 'top-right' });
    }
  };

  const handleSave = useCallback(async () => {
    let ok = true;
    // Chỉ admin mới được cập nhật thông tin nhà hàng (tên, liên hệ, địa chỉ...)
    if (isAdmin && restaurant?._id) {
      const resOk = await updateRestaurant?.(restaurant._id, {
        name: storeName.trim() || restaurant.name,
        description: description.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
      });
      ok = ok && !!resOk;
    }
    if (!setting?._id) {
      toast.error('Chưa có cấu hình nhà hàng để lưu', { position: 'top-right' });
      return false;
    }
    const settingOk = await editSetting(setting._id, {
      receiptConfig: {
        vat: Number(vat) || 0,
        serviceFee: Number(serviceFee) || 0,
        deleveryFee: rc?.deleveryFee ?? 0,
        footerText,
        autoPrintOnCheckout: autoPrint,
        autoPrintToKitchen: printKitchen,
        printCount: rc?.printCount ?? 1,
        paperSize: rc?.paperSize ?? '80mm',
        showLogo: rc?.showLogo ?? true,
        showStaffName: rc?.showStaffName ?? true,
        showWifiInfo: rc?.showWifiInfo ?? false,
        ...(rc?.wifiName ? { wifiName: rc.wifiName } : {}),
        ...(rc?.wifiPassword ? { wifiPassword: rc.wifiPassword } : {}),
      },
      systemConfig: {
        autoPushKDS: sc?.autoPushKDS ?? true,
        maintenanceMode: maintenance,
        requireOtpForVoid: requireOtp,
        ...(sc?.kitchenCode ? { kitchenCode: sc.kitchenCode } : {}),
      },
      menuConfig: {
        allowToGo: allowTakeAway,
        autoHideOut: mc?.autoHideOut ?? false,
      },
    });
    return ok && !!settingOk;
  }, [
    restaurant,
    updateRestaurant,
    storeName,
    description,
    phone,
    email,
    address,
    setting,
    rc,
    sc,
    mc,
    vat,
    serviceFee,
    footerText,
    autoPrint,
    printKitchen,
    requireOtp,
    maintenance,
    allowTakeAway,
    editSetting,
    isAdmin,
  ]);

  useEffect(() => {
    registerSave('store', handleSave);
    return () => registerSave('store', undefined);
  }, [registerSave, handleSave]);

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {/* Thông tin cửa hàng */}
      <SettingCard
        title="Thông tin cửa hàng"
        description="Tên gọi, logo và mô tả hiển thị trên hệ thống"
        badge={
          !isAdmin ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
              Chỉ admin chỉnh sửa
            </span>
          ) : (
            <span className="rounded-full bg-cerulean-blue-50 px-2.5 py-1 text-[11px] font-semibold text-cerulean-blue-700">
              Bắt buộc
            </span>
          )
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cerulean-blue-100 text-xl font-extrabold text-cerulean-blue-700">
              {storeInitial.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Logo cửa hàng</p>
              <p className="text-xs text-slate-400">JPG, PNG hoặc SVG · tối đa 2MB</p>
            </div>
            <button
              onClick={onDirty}
              disabled={!isAdmin}
              className="ml-auto rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-cerulean-blue-300 hover:text-cerulean-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Tải ảnh lên
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              className="sm:col-span-2"
              label="Tên cửa hàng"
              required
              disabled={!isAdmin}
              value={storeName}
              onChange={(e) => {
                setStoreName(e.target.value);
                onDirty();
              }}
            />
            <TextArea
              className="sm:col-span-2"
              label="Mô tả ngắn"
              placeholder="Mô tả ngắn gọn về cửa hàng của bạn"
              disabled={!isAdmin}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                onDirty();
              }}
            />
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600">Favicon</label>
              <div className="mt-1.5 flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[10px] font-extrabold text-cerulean-blue-600 shadow-sm">
                  {storeInitial.charAt(0).toUpperCase()}
                </span>
                <p className="text-xs text-slate-400">Biểu tượng hiển thị trên tab trình duyệt</p>
                <button
                  onClick={onDirty}
                  disabled={!isAdmin}
                  className="ml-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:text-cerulean-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      </SettingCard>

      {/* Liên hệ & Mạng xã hội */}
      <SettingCard
        title="Liên hệ & Mạng xã hội"
        description="Thông tin khách hàng có thể liên hệ, kết nối"
        badge={
          !isAdmin && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
              Chỉ admin
            </span>
          )
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Số điện thoại"
            type="tel"
            disabled={!isAdmin}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              onDirty();
            }}
          />
          <Field
            label="Zalo cá nhân"
            disabled={!isAdmin}
            value={zaloPersonal}
            onChange={(e) => {
              setZaloPersonal(e.target.value);
              onDirty();
            }}
          />
          <Field
            label="Zalo OA (đơn vị)"
            placeholder="https://zalo.me/officialsite"
            disabled={!isAdmin}
            value={zaloOa}
            onChange={(e) => {
              setZaloOa(e.target.value);
              onDirty();
            }}
          />
          <Field
            label="Email"
            type="email"
            disabled={!isAdmin}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              onDirty();
            }}
          />
          <Field
            className="sm:col-span-2"
            label="Địa chỉ"
            disabled={!isAdmin}
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              onDirty();
            }}
          />
          <Field
            label="Facebook"
            placeholder="facebook.com/lasen.restaurant"
            disabled={!isAdmin}
            value={facebook}
            onChange={(e) => {
              setFacebook(e.target.value);
              onDirty();
            }}
          />
          <Field
            label="Instagram"
            placeholder="instagram.com/lasen"
            disabled={!isAdmin}
            value={instagram}
            onChange={(e) => {
              setInstagram(e.target.value);
              onDirty();
            }}
          />
        </div>
      </SettingCard>

      {/* Hoá đơn & In ấn */}
      <SettingCard title="Hoá đơn & In ấn" description="Cấu hình mẫu hoá đơn và máy in hoá đơn">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Thuế VAT (%)"
            type="number"
            value={vat}
            onChange={(e) => {
              setVat(e.target.value);
              onDirty();
            }}
          />
          <Field
            label="Phí phục vụ (%)"
            type="number"
            value={serviceFee}
            onChange={(e) => {
              setServiceFee(e.target.value);
              onDirty();
            }}
          />
          <Field
            label="Giờ mở cửa"
            value={restaurant?.operatingHours ?? 'Chưa cấu hình'}
            disabled
          />
          <Field label="Trạng thái" value={subscriptionLabel} disabled />
          <Field
            className="sm:col-span-2"
            label="Lời chúc / chân trang hoá đơn"
            value={footerText}
            onChange={(e) => {
              setFooterText(e.target.value);
              onDirty();
            }}
          />
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 sm:col-span-2">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
                <Printer className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Máy in hoá đơn chính</p>
                <p className="text-xs text-slate-400">EPSON TM-T82IV · 80mm</p>
              </div>
            </div>
            <button
              onClick={onDirty}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:text-cerulean-blue-600"
            >
              Kết nối / Đổi
            </button>
          </div>
          <div className="sm:col-span-2">
            <ToggleRow
              title="Tự động in hoá đơn sau khi thanh toán"
              description="In ngay tại máy in thu ngân"
              checked={autoPrint}
              onChange={(v) => {
                setAutoPrint(v);
                onDirty();
              }}
            />
          </div>
          <div className="sm:col-span-2">
            <ToggleRow
              title="In bản sao hoá đơn cho bếp"
              description="Tự động gửi món tới máy in bếp"
              checked={printKitchen}
              onChange={(v) => {
                setPrintKitchen(v);
                onDirty();
              }}
            />
          </div>
        </div>
      </SettingCard>

      {/* Cấu hình hệ thống */}
      <SettingCard title="Cấu hình hệ thống" description="Các thiết lập chung cho cửa hàng">
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Mã bếp (KDS)</p>
            <p className="text-xs text-slate-400">
              Mã kết nối cho màn hình bếp. Tạo mới sẽ vô hiệu mã cũ.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <code className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold tracking-widest text-cerulean-blue-700 shadow-sm">
              {kitchenCode || 'Chưa có mã'}
            </code>
            <button
              type="button"
              onClick={handleGenerateCode}
              disabled={generatingCode}
              className="flex h-10 items-center gap-2 rounded-xl border border-cerulean-blue-200 bg-white px-4 text-xs font-semibold text-cerulean-blue-700 transition hover:bg-cerulean-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${generatingCode ? 'animate-spin' : ''}`} />
              Tạo mã mới
            </button>
          </div>
        </div>
        <div className="flex flex-col divide-y divide-slate-100">
          <ToggleRow
            title="Hỗ trợ bàn / chờ lấy (take-away)"
            description="Cho phép bán mang về tại quầy"
            checked={allowTakeAway}
            onChange={(v) => {
              setAllowTakeAway(v);
              onDirty();
            }}
          />
          <ToggleRow
            title="Chỉnh sửa hoá đơn cần xác nhận OTP"
            description="Chống sửa hoá đơn trái phép"
            checked={requireOtp}
            onChange={(v) => {
              setRequireOtp(v);
              onDirty();
            }}
          />
          <ToggleRow
            title="Chế độ bảo trì"
            description="Tạm ẩn cửa hàng khi bảo trì"
            checked={maintenance}
            onChange={(v) => {
              setMaintenance(v);
              onDirty();
            }}
          />
          <ToggleRow
            title="Tự động xuất báo cáo cuối ngày"
            description="Gửi báo cáo doanh thu mỗi ngày"
            checked={autoDailyReport}
            onChange={(v) => {
              setAutoDailyReport(v);
              onDirty();
            }}
          />
        </div>
      </SettingCard>
    </div>
  );
}
