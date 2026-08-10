import { useState } from 'react';
import { Landmark, PlugZap, Zap } from 'lucide-react';
import { SettingCard, Field, ToggleSwitch } from './settings-ui';
import { usePayment } from '@/hooks/use-payment';

/** Tab "Nền tảng" — super-admin. Cấu hình cổng thanh toán PayOS / VNPay. */
export default function TabPlatform({ onDirty }: { onDirty: () => void }) {
  const { checkPayOSConnection } = usePayment();
  const [payosEnabled, setPayosEnabled] = useState(true);
  const [payosClientId, setPayosClientId] = useState('ac5f8d91-xxxx-xxxx-xxxx-3f3f7b2e1a11');
  const [payosApiKey, setPayosApiKey] = useState('ak_live_xxxxxxxxxxxx');
  const [payosChecksumKey, setPayosChecksumKey] = useState('sk_live_xxxxxxxxxxxx');
  const [payosConnected, setPayosConnected] = useState(false);

  const handleCheckConnection = async () => {
    const ok = await checkPayOSConnection({
      clientId: payosClientId.trim(),
      apiKey: payosApiKey.trim(),
      checksumKey: payosChecksumKey.trim(),
    });
    setPayosConnected(ok);
  };

  const [vnpayEnabled, setVnpayEnabled] = useState(false);
  const [vnpayMerchant, setVnpayMerchant] = useState('VNP00000001');
  const [vnpayAccountName, setVnpayAccountName] = useState('CÔNG TY TNHH LÁ SEN');
  const [vnpayAccountNumber, setVnpayAccountNumber] = useState('1012 3456 789');
  const [vnpayApiKey, setVnpayApiKey] = useState('');
  const [vnpayChecksumKey, setVnpayChecksumKey] = useState('');

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {/* PayOS */}
      <div className="rounded-2xl border border-cerulean-blue-200 bg-white p-6 shadow-card">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cerulean-blue-600 text-white shadow-md shadow-cerulean-blue-200">
              <Zap className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-gray-900">Cổng PayOS</h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Cổng thanh toán mặc định cho toàn nền tảng
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
            value={payosClientId}
            disabled={!payosEnabled}
            onChange={(e) => {
              setPayosClientId(e.target.value);
              onDirty();
            }}
          />
          <Field
            label="API Key"
            type="password"
            value={payosApiKey}
            disabled={!payosEnabled}
            onChange={(e) => {
              setPayosApiKey(e.target.value);
              onDirty();
            }}
          />
          <Field
            label="Checksum Key"
            type="password"
            value={payosChecksumKey}
            disabled={!payosEnabled}
            onChange={(e) => {
              setPayosChecksumKey(e.target.value);
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
          {payosConnected && payosEnabled && (
            <div className="flex items-center gap-2 rounded-xl bg-cerulean-blue-50 px-4 py-2.5 text-xs font-medium text-cerulean-blue-700 sm:col-span-2">
              ✓ Đã kết nối — nhà hàng có thể kích hoạt QR PayOS ngay.
            </div>
          )}
        </div>
      </div>

      {/* VNPay */}
      <SettingCard
        title="Cổng VNPay"
        description="Cổng thanh toán qua cổng VNPay (tuỳ chọn)"
        badge={
          <span className="rounded-full bg-cerulean-blue-50 px-2.5 py-1 text-[11px] font-semibold text-cerulean-blue-700">
            Tuỳ chọn
          </span>
        }
        className={!vnpayEnabled ? 'relative opacity-60' : 'relative'}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Landmark className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-gray-900">Kích hoạt VNPay</p>
              <p className="text-xs text-slate-400">Bật để nhà hàng dùng VNPay thay PayOS</p>
            </div>
          </div>
          <ToggleSwitch
            checked={vnpayEnabled}
            onChange={(v) => {
              setVnpayEnabled(v);
              onDirty();
            }}
          />
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Merchant"
            value={vnpayMerchant}
            disabled={!vnpayEnabled}
            onChange={(e) => {
              setVnpayMerchant(e.target.value);
              onDirty();
            }}
          />
          <Field
            label="Số tài khoản"
            value={vnpayAccountNumber}
            disabled={!vnpayEnabled}
            onChange={(e) => {
              setVnpayAccountNumber(e.target.value);
              onDirty();
            }}
          />
          <Field
            label="Chủ tài khoản"
            value={vnpayAccountName}
            disabled={!vnpayEnabled}
            onChange={(e) => {
              setVnpayAccountName(e.target.value);
              onDirty();
            }}
          />
          <Field
            label="API Key"
            type="password"
            value={vnpayApiKey}
            disabled={!vnpayEnabled}
            onChange={(e) => {
              setVnpayApiKey(e.target.value);
              onDirty();
            }}
          />
          <div className="sm:col-span-2">
            <Field
              label="Checksum Key"
              type="password"
              value={vnpayChecksumKey}
              disabled={!vnpayEnabled}
              onChange={(e) => {
                setVnpayChecksumKey(e.target.value);
                onDirty();
              }}
            />
          </div>
        </div>
      </SettingCard>
    </div>
  );
}