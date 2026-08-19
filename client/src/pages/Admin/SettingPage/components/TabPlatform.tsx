import { useCallback, useEffect, useState } from 'react';
import { Landmark, PlugZap, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { SettingCard, Field, ToggleSwitch } from './settings-ui';
import { usePayment } from '@/hooks/use-payment';
import { getGatewayConfig, saveGatewayConfig } from '@/api/setting.api';
import PlanGate from '@/components/PlanGate';

/** Ký hiệu che key — server giữ nguyên key cũ khi nhận giá trị này. */
const MASK = '••••••••••••••••';

interface TabPlatformProps {
  onDirty: () => void;
  registerSave: (key: string, handler?: () => Promise<boolean>) => void;
}

/** Tab "Nền tảng" — super-admin. Cấu hình cổng thanh toán PayOS / VNPay. */
export default function TabPlatform({ onDirty, registerSave }: TabPlatformProps) {
  const { checkPayOSConnection } = usePayment();

  const [loading, setLoading] = useState(true);
  const [payosEnabled, setPayosEnabled] = useState(true);
  const [payosClientId, setPayosClientId] = useState('');
  const [payosApiKey, setPayosApiKey] = useState('');
  const [payosChecksumKey, setPayosChecksumKey] = useState('');
  const [payosConnected, setPayosConnected] = useState(false);

  const [vnpayEnabled, setVnpayEnabled] = useState(false);
  const [vnpayMerchant, setVnpayMerchant] = useState('');
  const [vnpayAccountName, setVnpayAccountName] = useState('');
  const [vnpayAccountNumber, setVnpayAccountNumber] = useState('');
  const [vnpayApiKey, setVnpayApiKey] = useState('');
  const [vnpayChecksumKey, setVnpayChecksumKey] = useState('');

  // ---- TẢI cấu hình cổng thanh toán hệ thống từ server ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const gw = await getGatewayConfig();
        if (cancelled || !gw) return;
        // Key luôn được ẩn (••••) nếu đã có — người dùng nhập mới để thay đổi.
        setPayosEnabled(!!gw.payos?.clientId);
        setPayosClientId(gw.payos?.clientId ?? '');
        setPayosApiKey(gw.payos?.hasApiKey ? MASK : '');
        setPayosChecksumKey(gw.payos?.hasChecksumKey ? MASK : '');
        setPayosConnected(!!gw.payos?.hasApiKey);
        setVnpayEnabled(!!gw.vnpay?.merchant);
        setVnpayMerchant(gw.vnpay?.merchant ?? '');
        setVnpayAccountName(gw.vnpay?.accountName ?? '');
        setVnpayAccountNumber(gw.vnpay?.accountNumber ?? '');
        setVnpayApiKey(gw.vnpay?.hasApiKey ? MASK : '');
        setVnpayChecksumKey(gw.vnpay?.hasChecksumKey ? MASK : '');
      } catch (err) {
        console.error('[TabPlatform] Lỗi tải cấu hình cổng thanh toán:', err);
        toast.error('Không tải được cấu hình cổng thanh toán', { position: 'top-right' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- LƯU ----
  const handleSave = useCallback(async () => {
    try {
      const res = await saveGatewayConfig({
        payos: {
          clientId: payosClientId.trim(),
          // Key đang ẩn (••••) → gửi giá trị ẩn để server giữ nguyên key cũ.
          apiKey: payosApiKey,
          checksumKey: payosChecksumKey,
        },
        vnpay: {
          merchant: vnpayMerchant.trim(),
          accountName: vnpayAccountName.trim(),
          accountNumber: vnpayAccountNumber.trim(),
          apiKey: vnpayApiKey,
          checksumKey: vnpayChecksumKey,
        },
      });
      // Cập nhật cờ sau khi lưu để placeholder che key đúng trạng thái.
      setPayosApiKey(res.payos?.hasApiKey ? MASK : '');
      setPayosChecksumKey(res.payos?.hasChecksumKey ? MASK : '');
      setVnpayApiKey(res.vnpay?.hasApiKey ? MASK : '');
      setVnpayChecksumKey(res.vnpay?.hasChecksumKey ? MASK : '');
      toast.success('Đã lưu cấu hình cổng thanh toán hệ thống', { position: 'top-right' });
      return true;
    } catch (err) {
      const msg = (err as { message?: string })?.message || 'Lưu cấu hình cổng thanh toán thất bại';
      toast.error(msg, { position: 'top-right' });
      return false;
    }
  }, [
    payosClientId,
    payosApiKey,
    payosChecksumKey,
    vnpayMerchant,
    vnpayAccountName,
    vnpayAccountNumber,
    vnpayApiKey,
    vnpayChecksumKey,
  ]);

  useEffect(() => {
    registerSave('platform', handleSave);
    return () => registerSave('platform', undefined);
  }, [registerSave, handleSave]);

  const handleCheckConnection = async () => {
    if (!payosClientId.trim()) {
      toast.error('Vui lòng nhập Client ID', { position: 'top-right' });
      return;
    }
    if (
      !payosApiKey.trim() ||
      !payosChecksumKey.trim() ||
      payosApiKey.includes('•') ||
      payosChecksumKey.includes('•')
    ) {
      toast.error(
        'Vui lòng nhập đầy đủ API Key và Checksum Key để kiểm tra (key cũ đang được ẩn)',
        {
          position: 'top-right',
        },
      );
      return;
    }
    const ok = await checkPayOSConnection({
      clientId: payosClientId.trim(),
      apiKey: payosApiKey.trim(),
      checksumKey: payosChecksumKey.trim(),
    });
    if (ok) setPayosConnected(true);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-card">
        Đang tải cấu hình cổng thanh toán...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {/* PayOS */}
      <PlanGate
        featureKey="payos"
        fallbackMode="upsell"
        disabledTooltip="Tính năng Chuyển khoản QR PayOS không có trong gói hiện tại. Nâng gói để sử dụng."
      >
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
            placeholder="Nhập Client ID PayOS"
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
            placeholder={
              payosApiKey === MASK ? '•••••••••••••••• (giữ nguyên)' : 'Nhập API Key PayOS'
            }
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
            placeholder={
              payosChecksumKey === MASK
                ? '•••••••••••••••• (giữ nguyên)'
                : 'Nhập Checksum Key PayOS'
            }
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
      </PlanGate>

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
            placeholder="VD: VNP00000001"
            onChange={(e) => {
              setVnpayMerchant(e.target.value);
              onDirty();
            }}
          />
          <Field
            label="Số tài khoản"
            value={vnpayAccountNumber}
            disabled={!vnpayEnabled}
            placeholder="VD: 10123456789"
            onChange={(e) => {
              setVnpayAccountNumber(e.target.value);
              onDirty();
            }}
          />
          <Field
            label="Chủ tài khoản"
            value={vnpayAccountName}
            disabled={!vnpayEnabled}
            placeholder="Tên chủ tài khoản"
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
            placeholder={
              vnpayApiKey === MASK ? '•••••••••••••••• (giữ nguyên)' : 'Nhập API Key VNPay'
            }
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
              placeholder={
                vnpayChecksumKey === MASK
                  ? '•••••••••••••••• (giữ nguyên)'
                  : 'Nhập Checksum Key VNPay'
              }
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
