import { useEffect, useMemo } from 'react';

import AuditLogPanel from '@/components/AuditLogPanel';
import { useAuth } from '@/hooks/use-auth';
import { useRestaurant } from '@/hooks/use-restaurant';
import { useSubscription } from '@/hooks/use-subscription';

/**
 * Nhật Ký Hệ Thống — admin (toàn chuỗi, có tab Thanh Toán) / manager (chi nhánh mình).
 * Dữ liệu + filter render bởi AuditLogPanel dùng chung với SuperAdmin/Audit.
 */
export default function LogsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { restaurants, fetchRestaurants } = useRestaurant();
  const { subscriptions } = useSubscription();

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  // Admin: chỉ các chi nhánh đang thuê bao; manager: chi nhánh của mình (chỉ có 1)
  const ownerRestaurants = useMemo(() => {
    if (!isAdmin) return restaurants || [];
    const subMap = new Map(subscriptions.map((s) => [String(s._id), s]));
    return (restaurants || []).filter((r) => subMap.has(String(r._id)));
  }, [restaurants, subscriptions, isAdmin]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-950">
              Nhật Ký Hệ Thống
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isAdmin
                ? 'Audit hành động + lịch sử thanh toán của toàn chuỗi chi nhánh'
                : 'Audit hành động trong chi nhánh của bạn'}
            </p>
          </div>
        </div>

        <AuditLogPanel mode="chain" branches={isAdmin ? ownerRestaurants : restaurants} />
      </div>
    </div>
  );
}
