import { Globe, ShieldAlert, Store, KeyRound, Sliders } from 'lucide-react';
import { CustomInput } from '@/components/FormInput';
import type { IRestaurant } from '@/types/restaurant.type';

// --- COMPONENT CON 2: TAB PROFILE ---
export const TabProfile = ({
  data,
  onChange,
}: {
  data: IRestaurant;
  onChange: (val: any) => void;
}) => (
  <div className="space-y-4 animate-fade-in">
    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
      <Store size={16} className="text-cerulean-blue-600" />
      <h4 className="text-sm font-bold text-slate-900">Hồ sơ Nhà Hàng</h4>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <CustomInput
        label="Tên nhà hàng / Chi nhánh"
        value={data?.name}
        onChange={(e) => onChange({ ...data, name: e.target.value })}
      />
      <CustomInput
        label="Số điện thoại Hotline"
        value={data?.phone}
        onChange={(e) => onChange({ ...data, phone: e.target.value })}
      />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <CustomInput
        label="Giờ hoạt động"
        value={data?.operatingHours}
        onChange={(e) => onChange({ ...data, time: e.target.value })}
      />
      <CustomInput
        type="number"
        label="Sức chứa (Khách tối đa)"
        value={data?.capacity}
        onChange={(e) => onChange({ ...data, capacity: e.target.value })}
      />
    </div>
    <div className="flex flex-col space-y-1.5">
      <label className="text-xs font-semibold text-slate-700">Địa chỉ chi nhánh</label>
      <textarea
        rows={3}
        value={data?.address}
        onChange={(e) => onChange({ ...data, address: e.target.value })}
        className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-cerulean-blue-500 text-slate-800 shadow-sm resize-none"
      />
    </div>
  </div>
);

// --- COMPONENT CON 7: TAB SECURITY ---
export const TabSecurity = () => (
  <div className="space-y-4 animate-fade-in">
    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
      <KeyRound size={16} className="text-cerulean-blue-600" />
      <h4 className="text-sm font-bold text-slate-900">Đổi mật khẩu tài khoản</h4>
    </div>
    <div className="flex flex-col gap-3">
      <CustomInput type="password" label="Mật khẩu hiện tại" placeholder="********" />
      <CustomInput type="password" label="Mật khẩu mới" placeholder="********" />
      <CustomInput type="password" label="Xác nhận mật khẩu mới" placeholder="********" />
    </div>
  </div>
);

// --- COMPONENT CON 8: TAB SYSTEM ---
export const TabSystem = ({ data, onChange }: { data: any; onChange: (val: any) => void }) => (
  <div className="space-y-4 animate-fade-in">
    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
      <Sliders size={16} className="text-cerulean-blue-600" />
      <h4 className="text-sm font-bold text-slate-900">Tham số hệ thống</h4>
    </div>
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
        <div className="flex items-center gap-2">
          <Globe className="text-slate-500" size={16} />
          <span className="text-xs font-semibold text-slate-800">Chế độ bảo trì chuỗi</span>
        </div>
        <input type="checkbox" className="w-4 h-4 accent-cerulean-blue-600 cursor-pointer" />
      </div>
      <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-slate-500" size={16} />
          <span className="text-xs font-semibold text-slate-800">
            Yêu cầu xác thực OTP khi sửa đổi hóa đơn lịch sử
          </span>
        </div>
        <input
          type="checkbox"
          defaultChecked
          className="w-4 h-4 accent-cerulean-blue-600 cursor-pointer"
        />
      </div>
      <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-slate-800">
            Tự động đẩy đơn xuống màn hình bếp (KDS)
          </span>
        </div>
        <input
          type="checkbox"
          checked={data.autoPushKDS}
          onChange={(e) => onChange({ ...data, autoPushKDS: e.target.checked })}
          className="w-4 h-4 accent-cerulean-blue-600 cursor-pointer shrink-0"
        />
      </div>
    </div>
  </div>
);
