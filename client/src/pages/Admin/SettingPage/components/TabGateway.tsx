import { useEffect, useState } from 'react';
import { Loader2, Save, CreditCard, ShieldCheck } from 'lucide-react';
import { CustomInput } from '@/components/FormInput';
import { getGatewayConfig, saveGatewayConfig } from '@/api/setting.api';
import type { IGatewayInput, IGatewaySanitized } from '@/types/setting.type';
import { toast } from 'sonner';

const MASK = '••••••••••••••••';

const emptyConfig: IGatewaySanitized = {
  payos: { clientId: '', hasApiKey: false, hasChecksumKey: false },
  vnpay: { merchant: '', accountName: '', accountNumber: '', hasApiKey: false, hasChecksumKey: false },
};

/**
 * Tab Cấu Hình Thanh Toán Hệ Thống — chỉ Super Admin (Ticket 07).
 * Self-contained: tự tải/lưu dữ liệu riêng, key nhạy cảm luôn được che.
 */
const TabGateway = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [original, setOriginal] = useState<IGatewaySanitized>(emptyConfig);
  const [form, setForm] = useState<IGatewayInput>({
    payos: { clientId: '', apiKey: '', checksumKey: '' },
    vnpay: { merchant: '', accountName: '', accountNumber: '', apiKey: '', checksumKey: '' },
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getGatewayConfig();
        if (!mounted) return;
        setOriginal(data);
        setForm({
          payos: {
            clientId: data.payos?.clientId || '',
            apiKey: data.payos?.hasApiKey ? MASK : '',
            checksumKey: data.payos?.hasChecksumKey ? MASK : '',
          },
          vnpay: {
            merchant: data.vnpay?.merchant || '',
            accountName: data.vnpay?.accountName || '',
            accountNumber: data.vnpay?.accountNumber || '',
            apiKey: data.vnpay?.hasApiKey ? MASK : '',
            checksumKey: data.vnpay?.hasChecksumKey ? MASK : '',
          },
        });
      } catch (error) {
        console.error(error);
        toast.error('Không tải được cấu hình cổng thanh toán', { position: 'top-right' });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await saveGatewayConfig(form);
      setOriginal(updated);
      setForm({
        payos: {
          clientId: updated.payos?.clientId || '',
          apiKey: updated.payos?.hasApiKey ? MASK : '',
          checksumKey: updated.payos?.hasChecksumKey ? MASK : '',
        },
        vnpay: {
          merchant: updated.vnpay?.merchant || '',
          accountName: updated.vnpay?.accountName || '',
          accountNumber: updated.vnpay?.accountNumber || '',
          apiKey: updated.vnpay?.hasApiKey ? MASK : '',
          checksumKey: updated.vnpay?.hasChecksumKey ? MASK : '',
        },
      });
      toast.success('Đã lưu cấu hình cổng thanh toán hệ thống', { position: 'top-right' });
    } catch (error) {
      console.error(error);
      toast.error('Lưu cấu hình thất bại', { position: 'top-right' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 size={20} className="animate-spin mr-2" />
        <span className="text-sm">Đang tải cấu hình...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
        <CreditCard size={15} className="text-cerulean-blue-600" />
        <h4 className="text-sm font-bold text-slate-900">Cấu Hình Thanh Toán Hệ Thống</h4>
      </div>

      {/* ===== PAYOS ===== */}
      <div className="rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-cerulean-blue-600" />
          <h5 className="text-sm font-semibold text-slate-800">Cổng PayOS</h5>
          {original.payos?.hasApiKey && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
              Đã cấu hình key
            </span>
          )}
        </div>
        <CustomInput
          label="Client ID"
          placeholder="Ví dụ: 6ab0b2c4-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          value={form.payos.clientId}
          onChange={(e) => setForm({ ...form, payos: { ...form.payos, clientId: e.target.value } })}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <CustomInput
            type="password"
            label="API Key"
            placeholder={original.payos?.hasApiKey ? 'Đã lưu — nhập để thay mới' : 'Nhập API Key'}
            value={form.payos.apiKey}
            onChange={(e) => setForm({ ...form, payos: { ...form.payos, apiKey: e.target.value } })}
          />
          <CustomInput
            type="password"
            label="Checksum Key"
            placeholder={original.payos?.hasChecksumKey ? 'Đã lưu — nhập để thay mới' : 'Nhập Checksum Key'}
            value={form.payos.checksumKey}
            onChange={(e) =>
              setForm({ ...form, payos: { ...form.payos, checksumKey: e.target.value } })
            }
          />
        </div>
      </div>

      {/* ===== VNPAY ===== */}
      <div className="rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-cerulean-blue-600" />
          <h5 className="text-sm font-semibold text-slate-800">Cổng VNPay</h5>
          {original.vnpay?.hasApiKey && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
              Đã cấu hình key
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <CustomInput
            label="Mã Merchant / Terminal"
            placeholder="Ví dụ: TESTMERCHANT01"
            value={form.vnpay.merchant}
            onChange={(e) => setForm({ ...form, vnpay: { ...form.vnpay, merchant: e.target.value } })}
          />
          <CustomInput
            label="Tên tài khoản"
            placeholder="Tên người nhận"
            value={form.vnpay.accountName}
            onChange={(e) =>
              setForm({ ...form, vnpay: { ...form.vnpay, accountName: e.target.value } })
            }
          />
          <CustomInput
            label="Số tài khoản"
            placeholder="Số tài khoản nhận"
            value={form.vnpay.accountNumber}
            onChange={(e) =>
              setForm({ ...form, vnpay: { ...form.vnpay, accountNumber: e.target.value } })
            }
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <CustomInput
            type="password"
            label="API Key"
            placeholder={original.vnpay?.hasApiKey ? 'Đã lưu — nhập để thay mới' : 'Nhập API Key'}
            value={form.vnpay.apiKey}
            onChange={(e) => setForm({ ...form, vnpay: { ...form.vnpay, apiKey: e.target.value } })}
          />
          <CustomInput
            type="password"
            label="Checksum Key"
            placeholder={original.vnpay?.hasChecksumKey ? 'Đã lưu — nhập để thay mới' : 'Nhập Checksum Key'}
            value={form.vnpay.checksumKey}
            onChange={(e) =>
              setForm({ ...form, vnpay: { ...form.vnpay, checksumKey: e.target.value } })
            }
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="flex items-center gap-2 bg-cerulean-blue-600 hover:bg-cerulean-blue-700 disabled:bg-cerulean-blue-400 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-md transition-all active:scale-[0.98]"
        >
          <Save size={14} className={saving ? 'animate-spin' : ''} />
          {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
        </button>
      </div>
    </div>
  );
};

export default TabGateway;
