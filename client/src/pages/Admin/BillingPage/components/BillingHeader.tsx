import { CreditCard } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface BillingHeaderProps {
  onUpgrade: () => void;
}

export function BillingHeader({ onUpgrade }: BillingHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 md:text-3xl">
          Thanh Toán &amp; Gói Dịch Vụ
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Quản lý gói đang dùng, nâng cấp và xem lịch sử thanh toán.
        </p>
      </div>
      <Button
        onClick={onUpgrade}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-cerulean-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-cerulean-blue-200 transition hover:bg-cerulean-blue-700"
      >
        <CreditCard className="h-4 w-4" /> Nâng cấp gói
      </Button>
    </div>
  );
}