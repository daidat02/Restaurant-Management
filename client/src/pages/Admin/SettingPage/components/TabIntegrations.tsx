import { CustomInput } from '@/components/FormInput';
import { CustomSelect } from '@/components/SelectCustom';
import type { IBankAccountConfig, IPayOSConfig } from '@/types/setting.type';
import {
  CreditCard,
  Landmark,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { checkConectPayOS } from '@/api/payment.api';
import { useState, useEffect, useMemo } from 'react';

const paymentOptions = [
  {
    value: 'none',
    label: 'Chịu thu tiền mặt / Quẹt thẻ tại quầy (Không chuyển khoản)',
  },
  {
    value: 'bank_transfer',
    label: 'Chuyển khoản Ngân hàng thủ công (Quét VietQR Tĩnh)',
  },
  {
    value: 'payos',
    label: 'Cổng thanh toán tự động PayOS (Mã QR biến động)',
  },
];

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'failed';

export const TabIntegrations = ({
  data,
  bankAccount,
  paymentMethodType,
  onChange,
  onSelectMethod,
  onConnectVerified,
}: {
  data: IPayOSConfig;
  bankAccount: IBankAccountConfig;
  paymentMethodType: 'none' | 'bank_transfer' | 'payos';
  onChange: (updatedData: { integrations?: any; bankAccount?: any }) => void;
  onSelectMethod: (val: 'none' | 'bank_transfer' | 'payos') => void;
  onConnectVerified: (isValid: boolean) => void;
}) => {
  const payOSData = data || { clientId: '', apiKey: '', checksumKey: '' };

  const [clientId, setClientId] = useState(() => payOSData.clientId || '');
  const [apiKey, setApiKey] = useState(() => payOSData.apiKey || '');
  const [checksumKey, setChecksumKey] = useState(() => payOSData.checksumKey || '');

  const [connectStatus, setConnectStatus] = useState<ConnectionStatus>('idle');
  const [connectMsg, setConnectMsg] = useState<string>('');

  // Kiểm tra xem dữ liệu trên ô input hiện tại có trùng khớp hoàn toàn với cấu hình cũ lúc nạp vào không
  const isUsingOldConfig = useMemo(() => {
    return (
      clientId === (payOSData.clientId || '') &&
      apiKey === (payOSData.apiKey || '') &&
      checksumKey === (payOSData.checksumKey || '')
    );
  }, [clientId, apiKey, checksumKey, payOSData]);

  useEffect(() => {
    if (paymentMethodType === 'payos') {
      const currentClientId = payOSData.clientId || '';
      const currentApiKey = payOSData.apiKey || '';
      const currentChecksumKey = payOSData.checksumKey || '';

      setClientId(currentClientId);
      setApiKey(currentApiKey);
      setChecksumKey(currentChecksumKey);

      if (currentApiKey.includes('••••') && currentChecksumKey.includes('••••')) {
        setConnectStatus('success');
        setConnectMsg('Đang sử dụng cấu hình cũ đã kết nối thành công.');
        onConnectVerified(true); // Cấu hình cũ mặc định hợp lệ, không cần lưu lại
      } else {
        setConnectStatus('idle');
        onConnectVerified(false);
      }
    } else {
      onConnectVerified(true);
    }
  }, [paymentMethodType]);

  const handleFieldChange = (updatedFields: {
    clientId?: string;
    apiKey?: string;
    checksumKey?: string;
  }) => {
    // Khi gõ chữ mới, đưa trạng thái kết nối về ban đầu và KHÓA nút lưu ở cha lại
    setConnectStatus('idle');
    setConnectMsg('');
    onConnectVerified(false);

    let nextClientId = clientId;
    let nextApiKey = apiKey;
    let nextChecksumKey = checksumKey;

    if (updatedFields.clientId !== undefined) {
      setClientId(updatedFields.clientId);
      nextClientId = updatedFields.clientId;
    }

    if (updatedFields.apiKey !== undefined) {
      const val = updatedFields.apiKey;
      const cleanVal =
        val.includes('••••') && val !== '••••••••••••••••'
          ? val.replace('••••••••••••••••', '')
          : val;

      setApiKey(cleanVal);
      nextApiKey = cleanVal;
    }

    if (updatedFields.checksumKey !== undefined) {
      const val = updatedFields.checksumKey;
      const cleanVal =
        val.includes('••••') && val !== '••••••••••••••••'
          ? val.replace('••••••••••••••••', '')
          : val;

      setChecksumKey(cleanVal);
      nextChecksumKey = cleanVal;
    }

    onChange({
      integrations: {
        clientId: nextClientId,
        apiKey: nextApiKey,
        checksumKey: nextChecksumKey,
      },
    });
  };

  const handleBankChange = (fields: any) => {
    onChange({
      bankAccount: { ...bankAccount, ...fields },
    });
  };

  const handleVerifyConnection = async () => {
    if (!clientId || !apiKey || !checksumKey) {
      setConnectStatus('failed');
      setConnectMsg('Vui lòng điền đầy đủ thông tin trước khi kiểm tra.');
      onConnectVerified(false);
      return;
    }

    setConnectStatus('testing');
    setConnectMsg('Đang gửi yêu cầu xác thực tới cổng PayOS...');

    try {
      const response = await checkConectPayOS({
        clientId,
        apiKey,
        checksumKey,
      });

      if (response || response?.data || response?.code === 200) {
        setConnectStatus('success');
        setConnectMsg(
          response?.message ||
            response?.data?.message ||
            'Kết nối PayOS thành công! Bạn có thể lưu cấu hình mới ngay bây giờ.',
        );
        onConnectVerified(true); // ✅ MỞ KHÓA nút Lưu ở Component Cha
      } else {
        setConnectStatus('failed');
        setConnectMsg(
          response?.message ||
            response?.data?.message ||
            'Kết nối thất bại. Vui lòng kiểm tra lại bộ Key.',
        );
        onConnectVerified(false);
      }
    } catch (error: any) {
      setConnectStatus('failed');
      setConnectMsg(
        error?.response?.data?.message ||
          'Không thể kết nối đến máy chủ Backend hoặc sai thông tin xác thực PayOS.',
      );
      onConnectVerified(false);
    }
  };

  return (
    <div className="space-y-5 pb-4 text-left">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
        <CreditCard size={16} className="text-blue-600" />
        <h4 className="text-sm font-bold text-slate-900">
          Cấu hình phương thức thanh toán chuyển khoản
        </h4>
      </div>

      <CustomSelect
        options={paymentOptions}
        value={paymentMethodType}
        label="Chọn hình thức chuyển khoản"
        onChange={(val: any) => onSelectMethod(val)}
        className="w-full"
      />

      <div className="min-h-[100px]">
        {/* TRƯỜNG HỢP: PAYOS */}
        {paymentMethodType === 'payos' && (
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
            <div className="flex items-start gap-2">
              <ShieldCheck size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-800 block mb-0.5">
                  Tích hợp cổng PayOS
                </span>
                <p className="text-[11px] text-slate-400">
                  Hệ thống tự động gạch nợ đơn hàng ngay khi khách thanh toán thành công.
                </p>
              </div>
            </div>

            <CustomInput
              label="Client ID"
              placeholder="Nhập Client ID từ PayOS Dashboard"
              value={clientId}
              onChange={(e: any) => handleFieldChange({ clientId: e.target.value })}
            />
            <CustomInput
              type="password"
              label="API Key"
              placeholder="Nhập API Key"
              value={apiKey}
              onChange={(e: any) => handleFieldChange({ apiKey: e.target.value })}
            />
            <CustomInput
              type="password"
              label="Checksum Key"
              placeholder="Nhập mã Checksum Key"
              value={checksumKey}
              onChange={(e: any) => handleFieldChange({ checksumKey: e.target.value })}
            />

            {/* --- NÚT BẤM VÀ THÔNG BÁO CONNECT --- */}
            <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="button"
                disabled={connectStatus === 'testing' || isUsingOldConfig}
                onClick={handleVerifyConnection}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed rounded-lg text-xs font-semibold shadow-sm transition-all shrink-0 h-8"
              >
                <RefreshCw
                  size={12}
                  className={connectStatus === 'testing' ? 'animate-spin' : ''}
                />
                {isUsingOldConfig
                  ? 'Đã kết nối'
                  : connectStatus === 'testing'
                    ? 'Đang kiểm tra...'
                    : 'Kiểm tra kết nối'}
              </button>

              {connectStatus !== 'idle' && (
                <div
                  className={`flex items-start gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium flex-1 ${
                    connectStatus === 'testing'
                      ? 'bg-blue-50 text-blue-700 border border-blue-100'
                      : connectStatus === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}
                >
                  {connectStatus === 'success' && (
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                  )}
                  {connectStatus === 'failed' && (
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  )}
                  <span>{connectMsg}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TRƯỜNG HỢP: CHUYỂN KHOẢN NGÂN HÀNG THỦ CÔNG */}
        {paymentMethodType === 'bank_transfer' && (
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
            {/* Giữ nguyên cụm bank như cũ */}
            <div className="flex items-start gap-2">
              <Landmark size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-800 block mb-0.5">
                  Tài khoản Ngân hàng nhận tiền
                </span>
                <p className="text-[11px] text-slate-400">
                  Hệ thống tự động tạo mã VietQR tĩnh. Thu ngân cần check tay app ngân hàng để xác
                  thực tiền vào.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <CustomInput
                label="Tên Ngân hàng"
                placeholder="Ví dụ: Vietcombank, Techcombank"
                value={bankAccount.bankName || ''}
                onChange={(e: any) => handleBankChange({ bankName: e.target.value })}
              />
              <CustomInput
                label="Mã BIN Ngân hàng"
                placeholder="6 chữ số (Ví dụ VCB: 970436)"
                value={bankAccount.bin || ''}
                onChange={(e: any) => handleBankChange({ bin: e.target.value })}
              />
            </div>
            <CustomInput
              label="Số tài khoản"
              placeholder="Nhập số tài khoản ngân hàng"
              value={bankAccount.accountNumber || ''}
              onChange={(e: any) => handleBankChange({ accountNumber: e.target.value })}
            />
            <CustomInput
              label="Tên chủ tài khoản"
              placeholder="Ví dụ: NGUYEN VAN A (In hoa không dấu)"
              value={bankAccount.accountName || ''}
              onChange={(e: any) => handleBankChange({ accountName: e.target.value.toUpperCase() })}
            />
          </div>
        )}

        {/* TRƯỜNG HỢP: KHÔNG DÙNG */}
        {paymentMethodType === 'none' && (
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-center">
            <p className="text-xs text-amber-700 font-medium">
              Bạn đang tắt phương thức chuyển khoản. Khách hàng sẽ không thể quét mã QR để trả tiền.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
