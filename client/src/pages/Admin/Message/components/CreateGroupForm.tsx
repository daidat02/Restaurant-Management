/* ============================================================================
 * SUB-COMPONENT: CreateGroupForm
 * ========================================================================== */

import { X } from 'lucide-react';

interface CreateGroupFormProps {
  isAdmin: boolean;
  restaurantNameMap: Record<string, string>;
  groupRestaurantId: string;
  onGroupRestaurantChange: (id: string) => void;
  groupName: string;
  onGroupNameChange: (name: string) => void;
  createError: string;
  isCreating: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export const CreateGroupForm = ({
  isAdmin,
  restaurantNameMap,
  groupRestaurantId,
  onGroupRestaurantChange,
  groupName,
  onGroupNameChange,
  createError,
  isCreating,
  onClose,
  onSubmit,
}: CreateGroupFormProps) => (
  <div className="space-y-2.5 border-b border-slate-100 bg-cerulean-blue-50/50 p-3">
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold text-slate-600">Tạo nhóm</span>
      <button
        type="button"
        onClick={onClose}
        className="text-slate-400 hover:text-slate-600"
        aria-label="Đóng tạo hội thoại"
      >
        <X size={14} />
      </button>
    </div>

    <div className="space-y-2">
      {isAdmin && (
        <select
          value={groupRestaurantId}
          onChange={(e) => onGroupRestaurantChange(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-cerulean-blue-500"
        >
          {Object.entries(restaurantNameMap).map(([rid, rname]) => (
            <option key={rid} value={rid}>
              {rname}
            </option>
          ))}
        </select>
      )}
      <input
        type="text"
        value={groupName}
        onChange={(e) => onGroupNameChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit();
        }}
        placeholder="Tên nhóm..."
        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-cerulean-blue-500"
      />
    </div>

    {createError && <p className="text-[10px] text-red-500">{createError}</p>}
    <button
      type="button"
      onClick={onSubmit}
      disabled={isCreating}
      className="w-full rounded-lg bg-cerulean-blue-600 py-1.5 text-[11px] font-bold text-white transition-all hover:bg-cerulean-blue-700 disabled:bg-slate-200"
    >
      {isCreating ? 'Đang tạo...' : 'Tạo nhóm'}
    </button>
  </div>
);
