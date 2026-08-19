import type { RefObject } from 'react';

import { DataTable } from '@/components/TableData';
import { StatusTag } from '@/components/StatusTag';
import type { ITransaction } from '@/types/subscription.type';

import { fmtDate, fmtTime, fmtVND } from './billing-utils';

interface TransactionHistoryProps {
  transactions: ITransaction[];
  isLoading: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
}

export function TransactionHistory({ transactions, isLoading, containerRef }: TransactionHistoryProps) {
  return (
    <div ref={containerRef} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-5">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Lịch sử thanh toán</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Toàn bộ giao dịch nâng cấp và gia hạn của nhà hàng
          </p>
        </div>
        <span className="rounded-full bg-cerulean-blue-50 px-3 py-1 text-xs font-semibold text-cerulean-blue-700">
          {transactions.length} giao dịch
        </span>
      </div>
      <DataTable
        data={transactions}
        isLoading={isLoading}
        emptyMessage="Chưa có hoá đơn nào."
        minWidth="900px"
        getRowKey={(t) => t._id}
        striped
        columns={[
          {
            header: 'Mã giao dịch',
            render: (t) => (
              <span className="font-mono text-xs text-cerulean-blue-700">#{t.transactionId}</span>
            ),
          },
          {
            header: 'Nhà hàng',
            render: (t) => (
              <span className="text-slate-700">
                {typeof t.restaurant === 'object' ? t.restaurant.name : '—'}
              </span>
            ),
          },
          {
            header: 'Gói dịch vụ',
            render: (t) => (
              <div className="flex flex-col">
                <span className="font-semibold text-slate-800">
                  {t.planName || 'Gói mặc định'}
                </span>
                <span className="text-xs text-slate-400">
                  {t.cycleMonths === 1 ? '1 tháng' : `${t.cycleMonths} tháng`}
                </span>
              </div>
            ),
          },
          {
            header: 'Ngày tạo',
            render: (t) => (
              <div className="flex flex-col">
                <span className="text-slate-700">{fmtDate(t.createdAt)}</span>
                <span className="text-xs text-slate-400">{fmtTime(t.createdAt)}</span>
              </div>
            ),
          },
          {
            header: 'Hạn sử dụng',
            render: (t) => (
              <span className="text-slate-600">{t.paidUntil ? fmtDate(t.paidUntil) : '—'}</span>
            ),
          },
          {
            header: 'Số tiền',
            render: (t) => <span className="font-bold text-gray-900">{fmtVND(t.amount)}</span>,
          },
          {
            header: 'Trạng thái',
            render: (t) => <StatusTag status={t.status} />,
          },
        ]}
      />
    </div>
  );
}