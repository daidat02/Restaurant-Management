import type { IUser } from '@/types/user.type';
import type { useMessaging } from '@/hooks/use-messaging';
import { cn } from '@/lib/utils';
import { type ConversationT } from '../MessagePage';
import { formatTime, roleLabelOf } from '@/utils/helpers';

/* ============================================================================
 * SUB-COMPONENT: ConversationList (danh sách cuộn bên trái, gồm 2 chế độ)
 * ========================================================================== */
type ActiveTabT = ReturnType<typeof useMessaging>['activeTab'];

interface ConversationListProps {
  isLoading: boolean;
  activeTab: ActiveTabT;
  conversations: ConversationT[];
  filteredConversations: ConversationT[];
  filteredInternalUsers: IUser[];
  activeConversationId: string | null | undefined;
  onlineUserIds: Set<string>;
  unreadMap: Record<string, number>;
  typingMap: ReturnType<typeof useMessaging>['typingMap'];
  isAdmin: boolean;
  restaurantNameMap: Record<string, string>;
  convName: (conv: ConversationT) => string;
  directConversationOf: (userId: string) => ConversationT | undefined;
  onPickDirectUser: (userId: string) => void;
  onOpenConversation: (id: string) => void;
}

export const ConversationList = ({
  isLoading,
  activeTab,
  conversations,
  filteredConversations,
  filteredInternalUsers,
  activeConversationId,
  onlineUserIds,
  unreadMap,
  typingMap,
  isAdmin,
  restaurantNameMap,
  convName,
  directConversationOf,
  onPickDirectUser,
  onOpenConversation,
}: ConversationListProps) => (
  <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto p-2">
    {isLoading && conversations.length === 0 && (
      <div className="py-8 text-center text-xs text-slate-400">Đang tải...</div>
    )}

    {activeTab === 'noi-bo' ? (
      <>
        {filteredInternalUsers.map((u) => {
          const conv = directConversationOf(u._id);
          return (
            <InternalUserListItem
              key={u._id}
              user={u}
              conv={conv}
              isOnline={onlineUserIds.has(u._id)}
              unread={conv ? (unreadMap[conv._id] ?? 0) : 0}
              isSelected={conv ? activeConversationId === conv._id : false}
              isAdmin={isAdmin}
              restaurantNameMap={restaurantNameMap}
              onClick={() => onPickDirectUser(u._id)}
            />
          );
        })}
        {!isLoading && filteredInternalUsers.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-400">Không có nhân viên nào</div>
        )}
      </>
    ) : (
      <>
        {filteredConversations.map((chat) => {
          const otherId = chat.otherMember?.userId;
          const isTyping =
            chat.type === 'group'
              ? (typingMap[chat._id]?.size ?? 0) > 0
              : (typingMap[chat._id]?.size ?? 0) > 0;
          return (
            <ConversationListItem
              key={chat._id}
              chat={chat}
              name={convName(chat)}
              isSelected={activeConversationId === chat._id}
              isOnline={otherId ? onlineUserIds.has(otherId) : false}
              unread={unreadMap[chat._id] ?? 0}
              isTyping={isTyping}
              isAdmin={isAdmin}
              onClick={() => onOpenConversation(chat._id)}
            />
          );
        })}
        {!isLoading && filteredConversations.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-400">
            Không tìm thấy cuộc hội thoại nào
          </div>
        )}
      </>
    )}
  </div>
);
// Nhà hàng chính của user (restaurantIds[0]) dùng để nhóm danh sách khi tạo 1-1
const restaurantIdOf = (u: IUser): string => {
  const first = u.restaurantIds?.[0];
  if (!first) return 'other';
  return typeof first === 'string' ? first : String(first._id);
};

/* ============================================================================
 * SUB-COMPONENT: InternalUserListItem (item danh bạ tab "Nội Bộ")
 * ========================================================================== */

interface InternalUserListItemProps {
  user: IUser;
  conv?: ConversationT;
  isOnline: boolean;
  unread: number;
  isSelected: boolean;
  isAdmin: boolean;
  restaurantNameMap: Record<string, string>;
  onClick: () => void;
}

const InternalUserListItem = ({
  user,
  conv,
  isOnline,
  unread,
  isSelected,
  isAdmin,
  restaurantNameMap,
  onClick,
}: InternalUserListItemProps) => {
  const displayName = user.name || 'Thành viên';
  const rid = restaurantIdOf(user);

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex w-full gap-3 rounded-xl p-3 text-left transition-all',
        isSelected
          ? 'border border-cerulean-blue-100 bg-cerulean-blue-50'
          : 'hover:bg-slate-200/50',
      )}
    >
      {/* Avatar khởi đầu tên */}
      <div className="relative shrink-0 self-start">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cerulean-blue-100 bg-cerulean-blue-50 text-xs font-bold uppercase text-cerulean-blue-600">
          {displayName.charAt(0)}
        </div>
        {isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-baseline justify-between">
          <h4 className="truncate pr-2 text-xs font-bold text-slate-800">{displayName}</h4>
          <span className="whitespace-nowrap text-[10px] text-slate-400">
            {conv ? formatTime(conv.lastMessage?.createdAt ?? conv.updatedAt) : ''}
          </span>
        </div>
        <p
          className={cn(
            'truncate text-[11px]',
            conv?.lastMessage ? 'text-slate-500' : 'italic text-slate-400',
          )}
        >
          {conv?.lastMessage?.text || 'Bắt đầu trò chuyện'}
        </p>
        <span className="mt-1 inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-600">
          {roleLabelOf(user.role)}
        </span>
        {isAdmin && rid !== 'other' && restaurantNameMap[rid] && (
          <span className="ml-1 mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
            {restaurantNameMap[rid]}
          </span>
        )}
      </div>

      {/* Số tin chưa đọc của hội thoại 1-1 */}
      {unread > 0 && (
        <span className="absolute bottom-3 right-3 flex h-4 min-w-4 animate-bounce items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-sm">
          {unread}
        </span>
      )}
    </button>
  );
};

/* ============================================================================
 * SUB-COMPONENT: ConversationListItem (item cho tab "Tất cả" / "Nhóm")
 * ========================================================================== */

interface ConversationListItemProps {
  chat: ConversationT;
  name: string;
  isSelected: boolean;
  isOnline: boolean;
  unread: number;
  isTyping: boolean;
  isAdmin: boolean;
  onClick: () => void;
}

export const ConversationListItem = ({
  chat,
  name,
  isSelected,
  isOnline,
  unread,
  isTyping,
  isAdmin,
  onClick,
}: ConversationListItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      'group relative flex w-full gap-3 rounded-xl p-3 text-left transition-all',
      isSelected ? 'border border-cerulean-blue-100 bg-cerulean-blue-50' : 'hover:bg-slate-200/50',
    )}
  >
    {/* Avatar */}
    <div className="relative shrink-0 self-start">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-200 text-xs font-bold uppercase text-slate-600">
        {name.charAt(0)}
      </div>
      {isOnline && (
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
      )}
    </div>

    {/* Content Preview */}
    <div className="min-w-0 flex-1">
      <div className="mb-0.5 flex items-baseline justify-between">
        <h4 className="truncate pr-2 text-xs font-bold text-slate-800">{name}</h4>
        <span className="whitespace-nowrap text-[10px] text-slate-400">
          {formatTime(chat.lastMessage?.createdAt ?? chat.updatedAt)}
        </span>
      </div>
      <p className="truncate text-[11px] text-slate-500">
        {isTyping ? 'đang gõ...' : chat.lastMessage?.text || 'Bắt đầu trò chuyện'}
      </p>
      <span
        className={cn(
          'mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold',
          chat.type === 'group' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600',
        )}
      >
        {chat.type === 'group' ? 'Nhóm' : roleLabelOf(chat.otherMember?.role)}
      </span>
      {isAdmin && chat.restaurantName && (
        <span className="ml-1 mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
          {chat.restaurantName}
        </span>
      )}
    </div>

    {/* Số tin chưa đọc */}
    {unread > 0 && (
      <span className="absolute bottom-3 right-3 flex h-4 min-w-4 animate-bounce items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-sm">
        {unread}
      </span>
    )}
  </button>
);
