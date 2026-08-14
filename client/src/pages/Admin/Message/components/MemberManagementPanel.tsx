import type { useMessaging } from '@/hooks/use-messaging';
import type { IMember } from '@/types/message.type';
import type { IUser } from '@/types/user.type';
import { X } from 'lucide-react';
import type { ConversationT } from '../MessagePage';

const memberNameOf = (m: IMember): string => {
  if (typeof m.userId === 'object' && m.userId) return m.userId.name || 'Thành viên';
  if (m.name) return m.name;
  return typeof m.userId === 'string' && m.userId ? m.userId : 'Thành viên';
};

// Vai trò người dùng của member (từ populate hoặc field mới từ service view)
const userRoleOf = (m: IMember): string | undefined => {
  if (typeof m.userId === 'object' && m.userId?.role) return m.userId.role;
  return m.userRole;
};

const roleLabelOf = (role?: string): string => {
  if (role === 'admin') return 'Admin';
  if (role === 'manager') return 'Quản lý';
  if (role === 'staff') return 'Nhân viên';
  return role || 'Thành viên';
};

/* ============================================================================
 * SUB-COMPONENT: MemberManagementPanel
 * ========================================================================== */

interface MemberManagementPanelProps {
  currentChat: ConversationT;
  currentUserId: string;
  memberPickerUsers: IUser[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  memberError: string;
  isManagingMembers: boolean;
  onAddMembers: () => void;
  onRemoveMember: (userId: string) => void;
  onClose: () => void;
}

const MemberManagementPanel = ({
  currentChat,
  currentUserId,
  memberPickerUsers,
  selectedIds,
  onToggleSelect,
  memberError,
  isManagingMembers,
  onAddMembers,
  onRemoveMember,
  onClose,
}: MemberManagementPanelProps) => (
  <div className="absolute inset-y-0 right-0 z-20 flex w-[320px] max-w-full flex-col border-l border-slate-200 bg-white shadow-xl">
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
      <span className="text-xs font-bold text-slate-700">Quản lý thành viên</span>
      <button
        type="button"
        onClick={onClose}
        className="text-slate-400 hover:text-slate-600"
        aria-label="Đóng"
      >
        <X size={14} />
      </button>
    </div>

    <div className="flex-1 space-y-3 overflow-y-auto p-4">
      {/* Danh sách member hiện tại */}
      <div className="custom-scrollbar max-h-44 space-y-0.5 overflow-y-auto pr-1">
        <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">
          Thành viên ({currentChat.memberCount ?? 0})
        </p>
        {(currentChat.members ?? []).map((m) => {
          const name = memberNameOf(m);
          const isCreator = String(m.userId) === currentUserId;
          return (
            <div
              key={String(m.userId)}
              className="flex items-center justify-between rounded-lg px-1.5 py-1 hover:bg-slate-50"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-cerulean-blue-50 text-[9px] font-bold uppercase text-cerulean-blue-600">
                  {name.charAt(0) ?? '?'}
                </span>
                <span className="truncate text-[11px] text-slate-600">{name}</span>
                <span className="rounded bg-slate-100 px-1 text-[9px] font-bold text-slate-500">
                  {roleLabelOf(userRoleOf(m))}
                </span>
                {isCreator && (
                  <span className="rounded bg-cerulean-blue-50 px-1 text-[9px] font-bold text-cerulean-blue-600">
                    Creator
                  </span>
                )}
              </div>
              {!isCreator && (
                <button
                  type="button"
                  onClick={() => onRemoveMember(String(m.userId))}
                  disabled={isManagingMembers}
                  className="px-1 text-[10px] font-bold text-slate-400 hover:text-red-500"
                  aria-label={`Gỡ ${name}`}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Thêm member mới */}
      <div className="border-t border-slate-100 pt-3">
        <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">Thêm thành viên</p>
        {memberPickerUsers.length === 0 ? (
          <p className="text-[10px] text-slate-400">Không có thành viên nào để thêm</p>
        ) : (
          <div className="custom-scrollbar max-h-52 space-y-0.5 overflow-y-auto pr-1">
            {memberPickerUsers.map((u) => (
              <label
                key={u._id}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(u._id)}
                  onChange={() => onToggleSelect(u._id)}
                  className="accent-cerulean-blue-600"
                />
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-cerulean-blue-50 text-[9px] font-bold uppercase text-cerulean-blue-600">
                  {u.name?.charAt(0) ?? '?'}
                </span>
                <span className="flex-1 truncate text-[11px] text-slate-600">{u.name}</span>
                <span className="text-[9px] text-slate-400">{roleLabelOf(u.role)}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {memberError && <p className="text-[10px] text-red-500">{memberError}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onAddMembers}
          disabled={isManagingMembers || selectedIds.length === 0}
          className="flex-1 rounded-lg bg-cerulean-blue-600 py-1.5 text-[11px] font-bold text-white transition-all hover:bg-cerulean-blue-700 disabled:bg-slate-200"
        >
          {isManagingMembers ? 'Đang thêm...' : 'Thêm'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-700 transition-all hover:bg-slate-300"
        >
          Đóng
        </button>
      </div>
    </div>
  </div>
);

export default MemberManagementPanel;
