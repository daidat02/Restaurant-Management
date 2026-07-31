import { useState } from 'react';
import { ChefHat, Loader2, KeyRound, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { verifyKitchenCode } from '@/api/setting.api';
import { setKdsSession, type KdsSession } from '@/utils/kds-session';

interface KdsGateProps {
  onSuccess: (session: KdsSession) => void;
}

export function KdsGate({ onSuccess }: KdsGateProps) {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || isVerifying) return;

    setIsVerifying(true);
    try {
      const result = await verifyKitchenCode(code.trim());
      const session = setKdsSession({
        token: result.token,
        restaurantId: result.restaurantId,
        restaurantName: result.restaurantName,
      });
      toast.success('Xác thực mã nhà bếp thành công', { position: 'top-right' });
      onSuccess(session);
    } catch (error) {
      const err = error as { message?: string };
      toast.error(err?.message || 'Mã nhà bếp không hợp lệ', { position: 'top-right' });
      setCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f8f9fc] px-4 select-none">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg border border-gray-200"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cerulean-blue-600 text-white shadow-md">
          <ChefHat className="h-7 w-7" />
        </div>

        <h1 className="mt-5 text-center text-lg font-black tracking-wide text-gray-900 uppercase">
          Màn Hình Nhà Bếp
        </h1>
        <p className="mt-1 text-center text-xs text-gray-500">
          Nhập mã nhà bếp do quản lý cấp để bắt đầu phiên làm việc 8 giờ
        </p>

        <div className="mt-6">
          <label className="text-xs font-semibold text-slate-700">Mã nhà bếp</label>
          <div className="relative mt-1.5">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="••••••"
              maxLength={6}
              autoFocus
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm font-mono tracking-[0.4em] text-slate-800 shadow-sm focus:border-cerulean-blue-500 focus:outline-none focus:ring-2 focus:ring-cerulean-blue-100"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!code.trim() || isVerifying}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-cerulean-blue-600 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-cerulean-blue-700 disabled:cursor-not-allowed disabled:bg-cerulean-blue-300 active:scale-[0.98]"
        >
          {isVerifying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang xác thực...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Vào bếp
            </>
          )}
        </button>
      </form>
    </div>
  );
}
