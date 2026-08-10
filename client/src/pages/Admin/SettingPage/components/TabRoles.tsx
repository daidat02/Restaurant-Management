import { useState } from 'react';
import { Boxes, Crown, Menu as MenuIcon, MoreHorizontal, Plus, Settings2, Shield, ShoppingCart, User, UserCog, Users, Wallet } from 'lucide-react';
import { SettingCard, PermissionToggle } from './settings-ui';

/** Tab "Phân quyền & Vai trò" — admin/manager. */
export default function TabRoles({ onDirty }: { onDirty: () => void }) {
  const defaultPerms: Record<string, boolean> = {
    sales: true,
    payment: true,
    inventory: true,
    menu: true,
    staff: false,
    system: false,
  };
  const [perms, setPerms] = useState(defaultPerms);

  const togglePerm = (key: string, v: boolean) => {
    setPerms((p) => ({ ...p, [key]: v }));
    onDirty();
  };

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {/* Vai trò hệ thống */}
      <SettingCard
        title="Vai trò hệ thống"
        description="Quản lý vai trò và quyền của nhân viên"
        badge={
          <button
            onClick={onDirty}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-cerulean-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-cerulean-blue-700"
          >
            <Plus className="h-4 w-4" /> Vai trò mới
          </button>
        }
      >
        <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-slate-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <Crown className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-gray-900">Superadmin</p>
                <p className="text-xs text-slate-500">Toàn quyền hệ thống</p>
              </div>
            </div>
            <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-700">
              Toàn quyền
            </span>
          </div>
        </div>
        <div className="mt-3 flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cerulean-blue-100 text-cerulean-blue-700">
                <Shield className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-gray-900">Admin</p>
                <p className="text-xs text-slate-500">Quản lý toàn bộ hoạt động cửa hàng</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                Chủ cửa hàng
              </span>
              <button
                className="text-slate-400 transition hover:text-cerulean-blue-600"
                onClick={onDirty}
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <UserCog className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-gray-900">Manager</p>
                <p className="text-xs text-slate-500">Quản lý quầy, bếp và nhân viên</p>
              </div>
            </div>
            <button className="text-slate-400 transition hover:text-cerulean-blue-600" onClick={onDirty}>
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-slate-600">
                <User className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-gray-900">Staff</p>
                <p className="text-xs text-slate-500">Nhân viên quầy / bếp</p>
              </div>
            </div>
            <button className="text-slate-400 transition hover:text-cerulean-blue-600" onClick={onDirty}>
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
        </div>
      </SettingCard>

      {/* Quyền chi tiết */}
      <SettingCard title="Quyền chi tiết — Admin" description="Bật/tắt từng quyền cho vai trò">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PermissionToggle
            icon={<ShoppingCart className="h-4 w-4" />}
            label="Bán hàng"
            checked={perms.sales}
            onChange={(v) => togglePerm('sales', v)}
          />
          <PermissionToggle
            icon={<Wallet className="h-4 w-4" />}
            label="Thanh toán"
            checked={perms.payment}
            onChange={(v) => togglePerm('payment', v)}
          />
          <PermissionToggle
            icon={<Boxes className="h-4 w-4" />}
            label="Kho & tồn"
            checked={perms.inventory}
            onChange={(v) => togglePerm('inventory', v)}
          />
          <PermissionToggle
            icon={<MenuIcon className="h-4 w-4" />}
            label="Menu món ăn"
            checked={perms.menu}
            onChange={(v) => togglePerm('menu', v)}
          />
          <PermissionToggle
            icon={<Users className="h-4 w-4" />}
            label="Nhân viên"
            checked={perms.staff}
            onChange={(v) => togglePerm('staff', v)}
          />
          <PermissionToggle
            icon={<Settings2 className="h-4 w-4" />}
            label="Cài đặt hệ thống"
            checked={perms.system}
            onChange={(v) => togglePerm('system', v)}
          />
        </div>
      </SettingCard>
    </div>
  );
}