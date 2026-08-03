import { useState } from 'react';
import { Globe, ShieldAlert, Store, KeyRound, Sliders, ChefHat, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
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
        onChange={(e) => onChange({ ...data, operatingHours: e.target.value })}
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
export const TabSystem = ({
  data,
  onChange,
  settingId,
  onGenerateKitchenCode,
}: {
  data: any;
  onChange: (val: any) => void;
  settingId?: string;
  onGenerateKitchenCode?: (settingId: string) => Promise<{ kitchenCode: string } | undefined>;
}) => {
  const [revealedCode, setRevealedCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!settingId || !onGenerateKitchenCode) return;
    setIsGenerating(true);
    try {
      const result = await onGenerateKitchenCode(settingId);
      if (result?.kitchenCode) {
        setRevealedCode(result.kitchenCode);
        setCopied(false);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!revealedCode) return;
    try {
      await navigator.clipboard.writeText(revealedCode);
      setCopied(true);
      toast.success('Đã sao chép mã nhà bếp', { position: 'top-right' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Không thể sao chép mã. Vui lòng sao chép thủ công.', { position: 'top-right' });
    }
  };

  return (
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
          <input
            type="checkbox"
            checked={data.maintenanceMode}
            onChange={(e) => onChange({ ...data, maintenanceMode: e.target.checked })}
            className="w-4 h-4 accent-cerulean-blue-600 cursor-pointer"
          />
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
            checked={data.requireOtpForVoid}
            onChange={(e) => onChange({ ...data, requireOtpForVoid: e.target.checked })}
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

        {/* Block Mã nhà bếp (KDS) */}
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
          <div className="flex items-center gap-2">
            <ChefHat className="text-cerulean-blue-600" size={16} />
            <span className="text-xs font-semibold text-slate-800">Mã nhà bếp (KDS)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Dùng để đăng nhập màn hình bếp tại /kds. Mã chỉ hiển thị đúng 1 lần sau khi tạo.
          </p>

          {revealedCode ? (
            <div className="mt-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-2xl font-bold tracking-[0.35em] text-cerulean-blue-600 bg-white border border-slate-200 rounded-lg px-4 py-2">
                  {revealedCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-cerulean-blue-600 hover:bg-cerulean-blue-700 rounded-lg transition-colors"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Đã sao chép' : 'Sao chép mã'}
                </button>
              </div>
              <p className="text-[11px] font-medium text-amber-600 mt-2 flex items-center gap-1">
                ⚠️ Mã chỉ hiển thị một lần này. Tạo mã mới sẽ vô hiệu hóa mã cũ.
              </p>
            </div>
          ) : (
            <button
              type="button"
              disabled={!settingId || isGenerating}
              onClick={handleGenerate}
              className="mt-3 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-cerulean-blue-600 hover:bg-cerulean-blue-700 disabled:bg-cerulean-blue-300 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isGenerating ? <KeyRound size={14} className="animate-spin" /> : <KeyRound size={14} />}
              {isGenerating ? 'Đang tạo...' : 'Tạo mã nhà bếp'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
