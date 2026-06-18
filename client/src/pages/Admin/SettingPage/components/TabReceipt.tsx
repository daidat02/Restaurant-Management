import { CustomInput } from '@/components/FormInput';
import { CustomSelect } from '@/components/SelectCustom';
import type { IReceiptConfig } from '@/types/setting.type';
import { Receipt } from 'lucide-react';

const paperSizeOptions = [
  { value: '80mm', label: 'Khổ giấy 80mm (Mặc định)' },
  { value: '58mm', label: 'Khổ giấy 58mm' },
];

export const TabReceipt = ({
  data,
  onChange,
}: {
  data: IReceiptConfig;
  onChange: (val: any) => void;
}) => (
  <div className="space-y-4 animate-fade-in overflow-y-auto pr-1 custom-scrollbar">
    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
      <Receipt size={16} className="text-cerulean-blue-600" />
      <h4 className="text-sm font-bold text-slate-900">Thiết lập Hóa đơn & Định mức tài chính</h4>
    </div>
    <div className="grid grid-cols-3 gap-4">
      <CustomInput
        type="number"
        label="Thuế VAT (%)"
        value={data?.vat}
        onChange={(e) => onChange({ ...data, vat: e.target.value })}
      />
      <CustomInput
        type="number"
        label="Phí phục vụ (%)"
        value={data?.serviceFee}
        onChange={(e) => onChange({ ...data, serviceFee: e.target.value })}
      />
      <CustomInput
        type="number"
        label="Phí giao hàng (Delivery)"
        value={data?.deleveryFee || '0'}
        onChange={(e) => onChange({ ...data, deliveryFee: e.target.value })}
      />
    </div>

    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
      <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
        Tự động hóa & In ấn
      </span>

      <div className="flex items-center justify-between py-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-slate-800">
            Tự động in hóa đơn khi thanh toán
          </span>
        </div>
        <input
          type="checkbox"
          checked={data?.autoPrintOnCheckout}
          onChange={(e) => onChange({ ...data, autoPrintOnCheckout: e.target.checked })}
          className="w-4 h-4 accent-cerulean-blue-600 cursor-pointer shrink-0"
        />
      </div>

      <div className="flex items-center justify-between py-1 border-t border-slate-200/60 pt-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-slate-800">
            Tự động in cuống vé xuống quầy bếp
          </span>
        </div>
        <input
          type="checkbox"
          checked={data?.autoPrintToKitchen}
          onChange={(e) => onChange({ ...data, autoPrintToKitchen: e.target.checked })}
          className="w-4 h-4 accent-cerulean-blue-600 cursor-pointer shrink-0"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-slate-200/60 pt-3">
        <CustomInput
          type="number"
          label="Số lượng bản in hóa đơn"
          value={data?.printCount || 1}
          onChange={(e) => onChange({ ...data, printCount: Number(e.target.value) })}
        />
        {/* 🛠️ ĐÃ FIX: Cập nhật chính xác vào trường paperSize */}
        <CustomSelect
          options={paperSizeOptions}
          value={data?.paperSize || '80mm'}
          label="Khổ giấy in nhiệt"
          onChange={(val) => onChange({ ...data, paperSize: val })}
          className="w-full"
          triggerClass="!rounded-lg"
        />
      </div>
    </div>

    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
      <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
        Tùy chọn hiển thị hiển thị trên Bill
      </span>
      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100">
          <span className="text-xs font-semibold text-slate-800">Hiển thị Logo</span>
          <input
            type="checkbox"
            checked={data?.showLogo}
            onChange={(e) => onChange({ ...data, showLogo: e.target.checked })}
            className="accent-cerulean-blue-600"
          />
        </div>
        <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100">
          <span className="text-xs font-semibold text-slate-800">Tên nhân viên</span>
          <input
            type="checkbox"
            checked={data?.showStaffName}
            onChange={(e) => onChange({ ...data, showStaffName: e.target.checked })}
            className="accent-cerulean-blue-600"
          />
        </div>
        <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100">
          <span className="text-xs font-semibold text-slate-800">Thông tin Wifi</span>
          <input
            type="checkbox"
            checked={data?.showWifiInfo}
            onChange={(e) => onChange({ ...data, showWifiInfo: e.target.checked })}
            className="accent-cerulean-blue-600"
          />
        </div>
      </div>

      {data?.showWifiInfo && (
        <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded-lg border border-slate-100 mt-2 animate-fade-in">
          <CustomInput
            label="Tên mạng Wifi (SSID)"
            value={data?.wifiName || ''}
            onChange={(e) => onChange({ ...data, wifiName: e.target.value })}
          />
          <CustomInput
            label="Mật khẩu Wifi"
            value={data?.wifiPassword || ''}
            onChange={(e) => onChange({ ...data, wifiPassword: e.target.value })}
          />
        </div>
      )}
    </div>

    <CustomInput
      label="Lời chúc chân hóa đơn"
      value={data?.footerText}
      onChange={(e) => onChange({ ...data, footerText: e.target.value })}
    />
  </div>
);
