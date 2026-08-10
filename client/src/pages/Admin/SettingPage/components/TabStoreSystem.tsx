import { useCallback, useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';
import { SettingCard, Field, TextArea, ToggleRow } from './settings-ui';
import type { ISetting } from '@/types/setting.type';

interface TabStoreSystemProps {
  setting: ISetting | null;
  editSetting: (id: string, data: Partial<ISetting>) => Promise<ISetting | undefined>;
  registerSave: (key: string, handler?: () => Promise<boolean>) => void;
  onDirty: () => void;
}

/** Tab "Cửa hàng & Hệ thống" — admin/manager. Dữ liệu thật qua useSetting. */
export default function TabStoreSystem({
  setting,
  editSetting,
  registerSave,
  onDirty,
}: TabStoreSystemProps) {
  const rc = setting?.receiptConfig;
  const sc = setting?.systemConfig;
  const mc = setting?.menuConfig;

  const [storeName, setStoreName] = useState('Nhà Hàng Lá Sen');
  const [description, setDescription] = useState(
    'Nhà hàng ẩm thực Việt Nam, chuyên các món truyền thống với nguyên liệu tươi ngon mỗi ngày.',
  );
  const [phone, setPhone] = useState('0903 111 222');
  const [zaloPersonal, setZaloPersonal] = useState('0903 111 222');
  const [zaloOa, setZaloOa] = useState('');
  const [email, setEmail] = useState('hello@lasen.vn');
  const [address, setAddress] = useState('123 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM');
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [vat, setVat] = useState(String(rc?.vat ?? 8));
  const [serviceFee, setServiceFee] = useState(String(rc?.serviceFee ?? 5));
  const [footerText, setFooterText] = useState(rc?.footerText ?? 'Cảm ơn quý khách! Hẹn gặp lại.');
  const [autoPrint, setAutoPrint] = useState(rc?.autoPrintOnCheckout ?? true);
  const [printKitchen, setPrintKitchen] = useState(rc?.autoPrintToKitchen ?? true);
  const [allowTakeAway, setAllowTakeAway] = useState(mc?.allowToGo ?? true);
  const [requireOtp, setRequireOtp] = useState(sc?.requireOtpForVoid ?? true);
  const [maintenance, setMaintenance] = useState(sc?.maintenanceMode ?? false);
  const [autoDailyReport, setAutoDailyReport] = useState(false);

  const handleSave = useCallback(async () => {
    if (!setting?._id) {
      toast.error('Chưa có cấu hình nhà hàng để lưu', { position: 'top-right' });
      return false;
    }
    const ok = await editSetting(setting._id, {
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
    return !!ok;
  }, [
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
          <span className="rounded-full bg-cerulean-blue-50 px-2.5 py-1 text-[11px] font-semibold text-cerulean-blue-700">
            Bắt buộc
          </span>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cerulean-blue-100 text-xl font-extrabold text-cerulean-blue-700">
              LS
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Logo cửa hàng</p>
              <p className="text-xs text-slate-400">JPG, PNG hoặc SVG · tối đa 2MB</p>
            </div>
            <button
              onClick={onDirty}
              className="ml-auto rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-cerulean-blue-300 hover:text-cerulean-blue-600"
            >
              Tải ảnh lên
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              className="sm:col-span-2"
              label="Tên cửa hàng"
              required
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
                  LS
                </span>
                <p className="text-xs text-slate-400">Biểu tượng hiển thị trên tab trình duyệt</p>
                <button
                  onClick={onDirty}
                  className="ml-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:text-cerulean-blue-600"
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
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Số điện thoại"
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              onDirty();
            }}
          />
          <Field
            label="Zalo cá nhân"
            value={zaloPersonal}
            onChange={(e) => {
              setZaloPersonal(e.target.value);
              onDirty();
            }}
          />
          <Field
            label="Zalo OA (đơn vị)"
            placeholder="https://zalo.me/officialsite"
            value={zaloOa}
            onChange={(e) => {
              setZaloOa(e.target.value);
              onDirty();
            }}
          />
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              onDirty();
            }}
          />
          <Field
            className="sm:col-span-2"
            label="Địa chỉ"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              onDirty();
            }}
          />
          <Field
            label="Facebook"
            placeholder="facebook.com/lasen.restaurant"
            value={facebook}
            onChange={(e) => {
              setFacebook(e.target.value);
              onDirty();
            }}
          />
          <Field
            label="Instagram"
            placeholder="instagram.com/lasen"
            value={instagram}
            onChange={(e) => {
              setInstagram(e.target.value);
              onDirty();
            }}
          />
        </div>
      </SettingCard>

      {/* Hoá đơn & In ấn */}
      <SettingCard
        title="Hoá đơn & In ấn"
        description="Cấu hình mẫu hoá đơn và máy in hoá đơn"
      >
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
          <Field label="Mã cửa hàng (KM000)" value="KM0001" disabled />
          <Field label="Chuỗi hoá đơn" value="L S — 001" disabled />
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
