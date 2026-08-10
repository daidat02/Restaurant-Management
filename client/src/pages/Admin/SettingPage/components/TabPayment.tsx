import { useCallback, useEffect, useState } from 'react';
import { Banknote, Info, Landmark, PlugZap, QrCode, ScanLine, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { SettingCard, Field, SelectField, ToggleSwitch } from './settings-ui';
import { usePayment } from '@/hooks/use-payment';
import type { ISetting } from '@/types/setting.type';

interface TabPaymentProps {
  setting: ISetting | null;
  editSetting: (id: string, data: Partial<ISetting>) => Promise<ISetting | undefined>;
  changePaymentMethodType: (
    id: string,
    type: 'none' | 'bank_transfer' | 'payos',
    payload: Partial<ISetting>,
  ) => Promise<ISetting | undefined>;
  registerSave: (key: string, handler?: () => Promise<boolean>) => void;
  onDirty: () => void;
}

/** Map mã BIN ngân hàng để server tự sinh VietQR. */
const BANK_OPTIONS = [
  { bin: '970436', name: 'Vietcombank' },
  { bin: '970407', name: 'Techcombank' },
  { bin: '970415', name: 'VietinBank' },
  { bin: '970422', name: 'MB Bank' },
  { bin: '970449', name: 'Viettel Money' },
];

/** Tab "Thanh toán" — admin/manager. Bật PayOS → vô hiệu hoá Tài khoản ngân hàng. */
export default function TabPayment({
  setting,
  editSetting,
  changePaymentMethodType,
  registerSave,
  onDirty,
}: TabPaymentProps) {
  const method = setting?.paymentMethodType ?? 'none';
  const bank = setting?.bankAccount;
  const payOS = setting?.integrations?.payOS;
  const { checkPayOSConnection } = usePayment();

  const [cashEnabled, setCashEnabled] = useState(true);
  const [bankTransferEnabled, setBankTransferEnabled] = useState(method === 'bank_transfer');
  const [qrEnabled, setQrEnabled] = useState(method === 'payos');

  const [payosEnabled, setPayosEnabled] = useState(method === 'payos');
  const [clientId, setClientId] = useState(payOS?.clientId ?? '');
  const [apiKey, setApiKey] = useState(payOS?.hasApiKey ? '••••••••••••••••' : '');
  const [checksumKey, setChecksumKey] = useState(payOS?.hasChecksumKey ? '••••••••••••••••' : '');
  const [connected, setConnected] = useState(payOS?.hasApiKey ?? false);

  const [bankName, setBankName] = useState(bank?.bankName ?? 'Vietcombank');
  const [accountNumber, setAccountNumber] = useState(bank?.accountNumber ?? '');
  const [accountName, setAccountName] = useState(bank?.accountName ?? '');

  const payosChecked = payosEnabled && qrEnabled;

  const handleSave = useCallback(async () => {
    if (!setting?._id) {
      toast.error('Chưa có cấu hình nhà hàng để lưu', { position: 'top-right' });
      return false;
    }
    const id = setting._id;

    if (payosChecked) {
      // PayOS đang là phương thức chính: bắt buộc nhập đủ key mới (server mã hoá lại).
      if (!clientId.trim() || !apiKey.trim() || !checksumKey.trim()) {
        toast.error('Vui lòng nhập đầy đủ Client ID, API Key và Checksum Key PayOS', {
          position: 'top-right',
        });
        return false;
      }
      const ok = await changePaymentMethodType(id, 'payos', {
        integrations: {
          payOS: { clientId: clientId.trim(), apiKey: apiKey.trim(), checksumKey: checksumKey.trim() },
        },
      });
      return !!ok;
    }

    if (bankTransferEnabled) {
      const bankBin = BANK_OPTIONS.find((b) => b.name === bankName)?.bin || '';
      const ok = await changePaymentMethodType(id, 'bank_transfer', {
        bankAccount: {
          bankName,
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim(),
          bin: bankBin,
        },
      });
      return !!ok;
    }

    // Không bật phương thức nào → 'none'
    const ok = await editSetting(id, { paymentMethodType: 'none', integrations: null });
    return !!ok;
  }, [
    setting,
    payosChecked,
    bankTransferEnabled,
    clientId,
    apiKey,
    checksumKey,
    bankName,
    accountNumber,
    accountName,
    changePaymentMethodType,
    editSetting,
  ]);

  useEffect(() => {
    registerSave('payment', handleSave);
    return () => registerSave('payment', undefined);
  }, [registerSave, handleSave]);

  const handleCheckConnection = async () => {
    const missingOrMasked = [clientId, apiKey, checksumKey].some(
      (v) => !v.trim() || v.includes('•'),
    );
    if (missingOrMasked) {
      toast.error('Vui lòng nhập đầy đủ Client ID, API Key và Checksum Key PayOS để kiểm tra', {
        position: 'top-right',
      });
      return;
    }
    const ok = await checkPayOSConnection({
      clientId: clientId.trim(),
      apiKey: apiKey.trim(),
      checksumKey: checksumKey.trim(),
    });
    if (ok) setConnected(true);
  };

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {/* Phương thức thanh toán */}
      <SettingCard
        title="Phương thức thanh toán"
        description="Các hình thức khách có thể thanh toán tại cửa hàng"
      >
        <div className="flex flex-col divide-y divide-slate-100">
          <div className="py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Banknote className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900">Tiền mặt</p>
                <p className="text-xs text-slate-400">Thanh toán trực tiếp tại quầy</p>
              </div>
            </div>
            <ToggleSwitch
              checked={cashEnabled}
              onChange={(v) => {
                setCashEnabled(v);
                onDirty();
              }}
            />
          </div>
          <div className="py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                <Landmark className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900">Chuyển khoản ngân hàng</p>
                <p className="text-xs text-slate-400">Khách chuyển khoản qua tài khoản nhận tiền</p>
              </div>
            </div>
            <ToggleSwitch
              checked={bankTransferEnabled}
              onChange={(v) => {
                setBankTransferEnabled(v);
                onDirty();
              }}
            />
          </div>
          <div className="py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <ScanLine className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900">Quét mã QR (PayOS)</p>
                <p className="text-xs text-slate-400">Khách quét mã QR thanh toán tức thì</p>
              </div>
            </div>
            <ToggleSwitch
              checked={qrEnabled}
              onChange={(v) => {
                setQrEnabled(v);
                onDirty();
              }}
            />
          </div>
        </div>
      </SettingCard>

      {/* Cột phải: Tài khoản nhận tiền + PayOS */}
      <div className="flex flex-col gap-5">
        <SettingCard
          title="Tài khoản nhận tiền"
          description="Thông tin tài khoản ngân hàng nhận tiền"
          badge={
            payosChecked ? (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                Tạm vô hiệu
              </span>
            ) : (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                Đang dùng
              </span>
            )
          }
          className={payosChecked ? 'relative opacity-60' : 'relative'}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              label="Ngân hàng"
              value={payosChecked ? '' : bankName}
              disabled={payosChecked}
              onChange={(e) => {
                setBankName(e.target.value);
                onDirty();
              }}
            >
              <option value="">Chọn ngân hàng</option>
              {BANK_OPTIONS.map((b) => (
                <option key={b.bin} value={b.name}>
                  {b.name}
                </option>
              ))}
            </SelectField>
            <Field
              label="Số tài khoản"
              value={payosChecked ? '' : accountNumber}
              disabled={payosChecked}
              onChange={(e) => {
                setAccountNumber(e.target.value);
                onDirty();
              }}
            />
            <div className="sm:col-span-2">
              <Field
                label="Chủ tài khoản"
                value={payosChecked ? '' : accountName}
                disabled={payosChecked}
                onChange={(e) => {
                  setAccountName(e.target.value);
                  onDirty();
                }}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-dashed border-emerald-200 bg-emerald-50/60 px-4 py-3 sm:col-span-2">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
                  <QrCode className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">QR nhận tiền</p>
                  <p className="text-xs text-slate-500">Khách quét QR này để chuyển khoản</p>
                </div>
              </div>
              <button
                onClick={onDirty}
                disabled={payosChecked}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:text-cerulean-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Tải QR lên
              </button>
            </div>
          </div>
        </SettingCard>

        {payosChecked && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-700">
            <Info className="h-4 w-4 flex-none" /> PayOS đang bật — tài khoản ngân hàng đã tạm vô
            hiệu hoá.
          </div>
        )}

        <div className="rounded-2xl border border-cerulean-blue-200 bg-white p-6 shadow-card">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cerulean-blue-600 text-white shadow-md shadow-cerulean-blue-200">
                <Zap className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-gray-900">Tích hợp cổng PayOS</h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Thanh toán an toàn qua cổng thanh toán PayOS
                </p>
              </div>
            </div>
            <ToggleSwitch
              checked={payosEnabled}
              onChange={(v) => {
                setPayosEnabled(v);
                onDirty();
              }}
            />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Client ID"
              value={clientId}
              disabled={!payosEnabled}
              placeholder="Nhập Client ID PayOS"
              onChange={(e) => {
                setClientId(e.target.value);
                onDirty();
              }}
            />
            <Field
              label="API Key"
              type="password"
              value={apiKey}
              disabled={!payosEnabled}
              placeholder={payOS?.hasApiKey ? '•••••••••••••••• (giữ nguyên)' : 'Nhập API Key PayOS'}
              onChange={(e) => {
                setApiKey(e.target.value);
                onDirty();
              }}
            />
            <Field
              label="Checksum Key"
              type="password"
              value={checksumKey}
              disabled={!payosEnabled}
              placeholder={
                payOS?.hasChecksumKey ? '•••••••••••••••• (giữ nguyên)' : 'Nhập Checksum Key PayOS'
              }
              onChange={(e) => {
                setChecksumKey(e.target.value);
                onDirty();
              }}
            />
            <div className="flex items-end">
              <button
                onClick={handleCheckConnection}
                disabled={!payosEnabled}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-cerulean-blue-600 text-sm font-semibold text-white transition hover:bg-cerulean-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PlugZap className="h-4 w-4" /> Kiểm tra kết nối
              </button>
            </div>
            {connected && payosEnabled && (
              <div className="flex items-center gap-2 rounded-xl bg-cerulean-blue-50 px-4 py-2.5 text-xs font-medium text-cerulean-blue-700 sm:col-span-2">
                ✓ Đã kết nối thành công — khách có thể thanh toán QR ngay.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
