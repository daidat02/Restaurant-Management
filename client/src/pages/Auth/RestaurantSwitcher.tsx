import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/hooks/redux-hook';
import { switchTenant } from '@/api/auth.api';
import { getRestaurantById } from '@/api/restaurants.api';
import { extractId } from '@/utils/helpers';
import type { IRestaurant } from '@/types/restaurant.type';

interface Option {
  id: string;
  name: string;
}

// Màn hình chọn nhà hàng dành cho admin/manager có nhiều hơn 1 nhà hàng
export default function RestaurantSwitcher() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const ids = (user?.restaurantIds || []).map((r) => extractId(r)).filter(Boolean);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const r = (await getRestaurantById(id)) as IRestaurant | undefined;
            return { id, name: r?.name || `Nhà hàng ${id.slice(-4)}` };
          } catch {
            return { id, name: `Nhà hàng ${id.slice(-4)}` };
          }
        }),
      );
      if (!cancelled) setOptions(results);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.restaurantIds]);

  const handleSelect = async (id: string) => {
    setSwitchingId(id);
    setLoading(true);
    const result = await switchTenant(id, dispatch);
    setLoading(false);
    setSwitchingId(null);
    if (!result.success) {
      toast.error(result.message || 'Không chuyển được nhà hàng', { position: 'top-right' });
      return;
    }
    if (user?.role === 'admin') navigate('/admin');
    else if (user?.role === 'manager') navigate('/manager');
    else navigate('/staff');
  };

  const homePath = user?.role === 'admin' ? '/admin' : user?.role === 'manager' ? '/manager' : '/staff';

  return (
    <div className="min-h-screen w-full bg-[#f8f9fc] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-cerulean-blue-600 rounded-xl text-white">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-900">Chọn nhà hàng</h1>
              <p className="text-xs text-gray-500 font-medium">
                Bạn quản lý nhiều nhà hàng — hãy chọn nơi muốn làm việc
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {options.length === 0 && (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
            {options.map((opt) => (
              <button
                key={opt.id}
                disabled={loading}
                onClick={() => handleSelect(opt.id)}
                className="group flex items-center justify-between gap-3 w-full px-4 py-4 rounded-xl border border-gray-200 hover:border-cerulean-blue-500 hover:bg-cerulean-blue-50 transition-colors text-left disabled:opacity-60"
              >
                <span className="flex items-center gap-3">
                  <span className="h-9 w-9 rounded-lg bg-cerulean-blue-100 text-cerulean-blue-700 flex items-center justify-center font-bold">
                    {opt.name.charAt(0)}
                  </span>
                  <span className="text-sm font-bold text-gray-900">{opt.name}</span>
                </span>
                {switchingId === opt.id && <Loader2 className="h-4 w-4 animate-spin text-cerulean-blue-600" />}
              </button>
            ))}
          </div>

          <button
            onClick={() => navigate(homePath)}
            className="mt-6 w-full text-center text-xs text-gray-400 hover:text-gray-600 font-medium"
          >
            Quay lại
          </button>
        </div>
      </div>
    </div>
  );
}
