/* ============================================================================
 * SUB-COMPONENT: ChatHeader (thanh trên cùng khung chat)
 * ========================================================================== */

import { ArrowLeft, UserPlus, Users } from 'lucide-react';
import type { IMember } from '@/types/message.type';
import type { ConversationT } from '../MessagePage';

const memberNameOf = (m: IMember): string => {
  if (typeof m.userId === 'object' && m.userId) return m.userId.name || 'Thành viên';
  if (m.name) return m.name;
  return typeof m.userId === 'string' && m.userId ? m.userId : 'Thành viên';
};
const isGroupAdmin = (
  conv: { type: string; members?: Array<{ userId: unknown; role?: string }> },
  currentUserId: string,
): boolean => {
  if (conv.type !== 'group') return false;
  return (conv.members ?? []).some((m) => String(m.userId) === currentUserId && m.role === 'admin');
};

interface ChatHeaderProps {
  currentChat?: ConversationT;
  activeConversationId: string | null | undefined;
  showListOnMobile: boolean;
  onShowListOnMobile: () => void;
  convName: (conv: ConversationT) => string;
  currentUserId: string;
  currentOtherUserId?: string;
  onlineUserIds: Set<string>;
  isOtherTyping: boolean;
  isAdmin: boolean;
  onOpenMemberPanel: () => void;
}

export const ChatHeader = ({
  currentChat,
  activeConversationId,
  showListOnMobile,
  onShowListOnMobile,
  convName,
  currentUserId,
  currentOtherUserId,
  onlineUserIds,
  isOtherTyping,
  isAdmin,
  onOpenMemberPanel,
}: ChatHeaderProps) => (
  <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4">
    {currentChat ? (
      <div className="flex min-w-0 items-center gap-3">
        {activeConversationId && !showListOnMobile && (
          <button
            type="button"
            onClick={onShowListOnMobile}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 md:hidden"
            aria-label="Quay lại danh sách"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        {currentChat.type === 'group' ? (
          <>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-100 bg-purple-50 text-xs font-bold text-purple-600">
              <Users size={14} />
            </div>
            <div className="min-w-0 flex-1 flex-col">
              <span className="block truncate text-xs font-bold text-slate-800">
                {convName(currentChat)}
              </span>
              <span className="text-[10px] text-slate-400">
                {currentChat.memberCount} thành viên
                {isAdmin && currentChat.restaurantName && (
                  <span className="ml-1.5 text-cerulean-blue-600">
                    · {currentChat.restaurantName}
                  </span>
                )}
              </span>
            </div>
            {/* Avatar stack các member */}
            <div className="flex shrink-0 -space-x-1.5">
              {(currentChat.members ?? []).slice(0, 3).map((m) => {
                const name = memberNameOf(m);
                return (
                  <div
                    key={String(m.userId)}
                    title={name}
                    className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[8px] font-bold uppercase text-slate-600"
                  >
                    {name.charAt(0)}
                  </div>
                );
              })}
              {(currentChat.memberCount ?? 0) > 3 && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[8px] font-bold text-slate-500">
                  +{currentChat.memberCount - 3}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cerulean-blue-100 bg-cerulean-blue-50 text-xs font-bold text-cerulean-blue-600">
              {convName(currentChat).charAt(0)}
            </div>
            <div className="min-w-0 flex-col">
              <span className="block truncate text-xs font-bold text-slate-800">
                {convName(currentChat)}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                {isAdmin && currentChat.restaurantName && (
                  <span className="text-cerulean-blue-600">({currentChat.restaurantName})</span>
                )}
                {isOtherTyping ? (
                  <>
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cerulean-blue-500" />
                    đang gõ...
                  </>
                ) : currentOtherUserId && onlineUserIds.has(currentOtherUserId) ? (
                  <>
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                    Đang hoạt động
                  </>
                ) : (
                  'Ngoại tuyến'
                )}
              </span>
            </div>
          </>
        )}
      </div>
    ) : (
      <div />
    )}

    {/* Nút quản lý thành viên nhóm (creator/admin) */}
    <div className="flex items-center gap-1">
      {currentChat?.type === 'group' && isGroupAdmin(currentChat, currentUserId) && (
        <button
          type="button"
          onClick={onOpenMemberPanel}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-cerulean-blue-200 bg-cerulean-blue-50 px-2 py-1 text-[10px] font-bold text-cerulean-blue-600 transition-all hover:bg-cerulean-blue-100"
          aria-label="Thêm thành viên"
          title="Thêm/Quản lý thành viên"
        >
          <UserPlus size={13} />
        </button>
      )}
    </div>
  </div>
);
