import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { X, Search, Send, User, Users, UserPlus, MessageSquarePlus, ArrowLeft, Loader2 } from 'lucide-react';
import { useMessaging } from '@/hooks/use-messaging';
import { useAppSelector } from '@/hooks/redux-hook';
import { getUsersWithFilter } from '@/api/user.api';
import { getMyRestaurants } from '@/api/restaurants.api';
import {
  createConversation,
  getDirectConversation,
  addConversationMembers,
  removeConversationMember,
} from '@/api/message.api';
import type { IUser } from '@/types/user.type';
import type { IMember } from '@/types/message.type';
import { cn } from '@/lib/utils';

const MAX_LENGTH = 2000;

// Chuyển ISO/date sang chuỗi giờ ngắn (HH:mm hoặc ngày/giờ).
const formatTime = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hhmm = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return hhmm;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

// Kiểm tra user hiện tại có phải admin (creator) của group không
const isGroupAdmin = (
  conv: { type: string; members?: Array<{ userId: unknown; role?: string }> },
  currentUserId: string,
): boolean => {
  if (conv.type !== 'group') return false;
  return (conv.members ?? []).some((m) => String(m.userId) === currentUserId && m.role === 'admin');
};

// Tên hiển thị của member (userId có thể là object populated hoặc string)
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

// Nhãn tiếng Việt cho role
const roleLabelOf = (role?: string): string => {
  if (role === 'admin') return 'Admin';
  if (role === 'manager') return 'Quản lý';
  if (role === 'staff') return 'Nhân viên';
  return role || 'Thành viên';
};

// Nhà hàng chính của user (restaurantIds[0]) dùng để nhóm danh sách khi tạo 1-1
const restaurantIdOf = (u: IUser): string => {
  const first = u.restaurantIds?.[0];
  if (!first) return 'other';
  return typeof first === 'string' ? first : String(first._id);
};

/**
 * Trang nhắn tin nội bộ — toàn bộ tính năng trước đây nằm trong MessageModal
 * giờ là một page riêng (2 cột: danh sách hội thoại + khung chat).
 */
const MessagePage = () => {
  const currentUser = useAppSelector((state) => state.auth.user);
  const currentUserId = currentUser?._id ?? '';
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';
  const isAdmin = currentUser?.role === 'admin';
  const currentRestaurantId = useAppSelector((state) => state.auth.currentRestaurantId);

  const [searchParams] = useSearchParams();

  // Mobile: kiểm soát việc ẩn/hiện cột danh sách hội thoại
  const [showListOnMobile, setShowListOnMobile] = useState(false);

  const {
    conversations,
    visibleConversations,
    activeTab,
    setActiveTab,
    activeConversationId,
    messagesMap,
    unreadMap,
    onlineUserIds,
    isLoading,
    isMessageLoading,
    loadConversations,
    openConversation,
    send,
    emitTyping,
    loadMoreMessages,
    typingMap,
  } = useMessaging();

  const [searchQuery, setSearchQuery] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [internalUsers, setInternalUsers] = useState<IUser[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  // Quản lý thành viên nhóm (inline panel thay vì modal)
  const [showMemberPanel, setShowMemberPanel] = useState(false);
  const [memberPickerUsers, setMemberPickerUsers] = useState<IUser[]>([]);
  const [isManagingMembers, setIsManagingMembers] = useState(false);
  const [memberError, setMemberError] = useState('');
  // Map restaurantId -> tên nhà hàng (admin hiển thị badge nhà hàng chéo chuỗi)
  const [restaurantNameMap, setRestaurantNameMap] = useState<Record<string, string>>({});
  // Nhà hàng mà admin chọn khi tạo nhóm (mặc định = tenant đang chọn)
  const [groupRestaurantId, setGroupRestaurantId] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);

  // Load danh sách hội thoại khi vào trang
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Mở đúng hội thoại khi có ?conv= (từ MailBoxPopover / deep link)
  const convParam = searchParams.get('conv');
  useEffect(() => {
    if (convParam) {
      setShowListOnMobile(false);
      openConversation(convParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convParam]);

  // Tên hiển thị 1 hội thoại
  const convName = useCallback(
    (conv: (typeof conversations)[number]) =>
      conv.type === 'group' ? conv.name || 'Nhóm' : conv.otherMember?.name || 'Thành viên',
    [],
  );

  // Filter client-side theo search (lọc trên danh sách đã theo tab)
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return visibleConversations;
    const q = searchQuery.toLowerCase();
    return visibleConversations.filter((c) => {
      const name = convName(c).toLowerCase();
      const lastMsg = c.lastMessage?.text.toLowerCase() ?? '';
      return name.includes(q) || lastMsg.includes(q);
    });
  }, [visibleConversations, searchQuery, convName]);

  const currentChat = useMemo(
    () => conversations.find((c) => c._id === activeConversationId),
    [conversations, activeConversationId],
  );

  const currentOtherUserId = currentChat?.otherMember?.userId;
  const isOtherTyping = useMemo(() => {
    if (!activeConversationId || !currentOtherUserId) return false;
    return typingMap[activeConversationId]?.has(currentOtherUserId) ?? false;
  }, [typingMap, activeConversationId, currentOtherUserId]);

  // Infinite scroll ngược: khi cuộn lên đầu mà còn dữ liệu thì load thêm trang cũ hơn
  const handleConversationScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop < 40 && activeConversationId) {
      loadMoreMessages(activeConversationId);
    }
  };

  // Cuộn xuống đáy khi mở hội thoại mới / có tin mới
  const activeMessagesCount = messagesMap[activeConversationId ?? '']?.length;
  useEffect(() => {
    if (activeConversationId) {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [activeConversationId, activeMessagesCount]);

  // Admin: nạp map tên nhà hàng (badge chéo chuỗi + mặc định tenant tạo nhóm)
  useEffect(() => {
    if (!isAdmin) return;
    getMyRestaurants()
      .then((restaurants) => {
        const map: Record<string, string> = {};
        (restaurants ?? []).forEach((r) => {
          if (r._id && r.name) map[r._id] = r.name;
        });
        setRestaurantNameMap(map);
        setGroupRestaurantId((prev) => {
          if (prev) return prev;
          const fallback = (currentRestaurantId && map[currentRestaurantId] ? currentRestaurantId : '') ||
            (Object.keys(map)[0] ?? '');
          return fallback;
        });
      })
      .catch((error) => {
        console.error('Lỗi lấy danh sách nhà hàng:', error);
      });
  }, [isAdmin, currentRestaurantId]);

  // Danh bạ "Nội Bộ": manager/staff thấy admin + nhân viên cùng nhà hàng, admin thấy toàn chuỗi
  useEffect(() => {
    let cancelled = false;
    getUsersWithFilter(
      ['staff', 'manager', 'admin'],
      isAdmin ? undefined : (currentRestaurantId ?? undefined),
    )
      .then((users) => {
        if (!cancelled) setInternalUsers((users ?? []).filter((u) => u._id !== currentUserId));
      })
      .catch((error) => {
        console.error('Lỗi lấy danh sách nội bộ:', error);
        if (!cancelled) setInternalUsers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, currentRestaurantId, currentUserId]);

  // Mở form tạo hội thoại — giờ chỉ còn tạo group
  const openCreateForm = () => {
    setShowCreate(true);
    setCreateError('');
    setSelectedIds([]);
    setGroupName('');
  };

  // Hội thoại 1-1 với nhân viên (tab Nội Bộ) nếu đã có
  const directConversationOf = (userId: string) =>
    conversations.find(
      (c) =>
        c.type === 'direct' &&
        (c.otherMember?.userId === userId || (c.members ?? []).some((m) => String(m.userId) === userId)),
    );

  // Danh sách nội bộ sau khi filter theo tìm kiếm
  const filteredInternalUsers = useMemo(() => {
    if (!searchQuery.trim()) return internalUsers;
    const q = searchQuery.toLowerCase();
    return internalUsers.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q) ||
        roleLabelOf(u.role).toLowerCase().includes(q),
    );
  }, [internalUsers, searchQuery]);

  // Chọn người nhận → mở thẳng hội thoại 1-1 (không cần bấm nút tạo)
  // Tối ưu: tìm hội thoại 1-1 sẵn có trước (GET nhẹ); chỉ POST tạo khi chưa tồn tại.
  const handlePickDirectUser = async (userId: string) => {
    if (!userId || isCreating) return;
    setIsCreating(true);
    setCreateError('');
    try {
      const existing = await getDirectConversation(userId);
      const conv =
        existing ??
        (await createConversation({
          type: 'direct',
          memberIds: [userId],
          restaurantId: currentRestaurantId ?? undefined,
        }));
      setShowCreate(false);
      setSelectedIds([]);
      setSearchQuery('');
      await loadConversations();
      setShowListOnMobile(false);
      openConversation(conv._id);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      setCreateError(err?.response?.data?.message || 'Không mở được hội thoại');
    } finally {
      setIsCreating(false);
    }
  };

  // Tạo nhóm — chỉ cần tên, thêm thành viên sau ở header
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setCreateError('Nhóm cần có tên');
      return;
    }
    setIsCreating(true);
    setCreateError('');
    try {
      const conv = await createConversation({
        type: 'group',
        name: groupName.trim(),
        restaurantId: (isAdmin ? groupRestaurantId : currentRestaurantId) ?? undefined,
      });
      setShowCreate(false);
      setGroupName('');
      await loadConversations();
      setShowListOnMobile(false);
      openConversation(conv._id);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      setCreateError(err?.response?.data?.message || 'Không tạo được hội thoại nhóm');
    } finally {
      setIsCreating(false);
    }
  };

  // Mở panel quản lý member cho group
  const openMemberPanel = async () => {
    if (!activeConversationId) return;
    setShowMemberPanel(true);
    setMemberError('');
    setSelectedIds([]);
    try {
      const conv = conversations.find((c) => c._id === activeConversationId);
      const restaurantId = conv?.restaurantId ?? currentRestaurantId ?? undefined;
      const users = await getUsersWithFilter(['staff', 'manager', 'admin'], restaurantId);
      const existingMemberIds = new Set(conv?.members?.map((m) => String(m.userId)) ?? []);
      setMemberPickerUsers(
        (users ?? []).filter((u) => u._id !== currentUserId && !existingMemberIds.has(u._id)),
      );
    } catch (error) {
      console.error('Lỗi lấy danh sách thành viên:', error);
      setMemberPickerUsers([]);
    }
  };

  const toggleMemberSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleAddMembers = async () => {
    if (!activeConversationId || selectedIds.length === 0) return;
    setIsManagingMembers(true);
    setMemberError('');
    try {
      await addConversationMembers(activeConversationId, selectedIds);
      setShowMemberPanel(false);
      setSelectedIds([]);
      await loadConversations();
      setShowListOnMobile(false);
      openConversation(activeConversationId);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      setMemberError(err?.response?.data?.message || 'Không thêm được thành viên');
    } finally {
      setIsManagingMembers(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeConversationId) return;
    setIsManagingMembers(true);
    setMemberError('');
    try {
      await removeConversationMember(activeConversationId, userId);
      await loadConversations();
      setShowListOnMobile(false);
      openConversation(activeConversationId);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      setMemberError(err?.response?.data?.message || 'Không gỡ được thành viên');
    } finally {
      setIsManagingMembers(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversationId || !inputMessage.trim()) return;
    send(activeConversationId, inputMessage);
    setInputMessage('');
    emitTyping(activeConversationId, false);
  };

  // Mobile: khi đang mở chat → ẩn cột trái, hiện nút quay lại
  const showList = !activeConversationId || showListOnMobile;

  return (
    <div className="h-full overflow-hidden bg-slate-100 p-0 md:p-4">
      <div className="flex h-full overflow-hidden rounded-none bg-white text-slate-700 md:rounded-2xl md:border md:border-slate-200 md:shadow-card">
        {/* 👥 CỘT TRÁI: DANH SÁCH CUỘC HỘI THOẠI */}
        <div
          className={cn(
            'flex shrink-0 flex-col select-none border-r border-slate-100 bg-slate-50 md:rounded-l-2xl',
            'w-full md:w-[300px] lg:w-[340px] xl:w-[360px]',
            showList ? 'flex' : 'hidden md:flex',
          )}
        >
          {/* Header tìm kiếm + nút tạo */}
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Tin nhắn nội bộ
              </h3>
              {isManager && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="rounded-lg p-1.5 text-cerulean-blue-600 transition-all hover:bg-cerulean-blue-50"
                  aria-label="Tạo hội thoại"
                  title="Tạo nhóm"
                >
                  <MessageSquarePlus size={16} />
                </button>
              )}
            </div>
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm cuộc trò chuyện..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-8 text-xs text-slate-700 outline-none transition-all focus:border-cerulean-blue-500 focus:bg-white"
              />
              <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Tab Tất cả / Nhóm / Nội Bộ */}
            <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('tat-ca')}
                className={cn(
                  'flex-1 rounded-md px-2 py-1 text-[10px] font-bold transition-all',
                  activeTab === 'tat-ca'
                    ? 'bg-white text-cerulean-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('nhom')}
                className={cn(
                  'flex-1 rounded-md px-2 py-1 text-[10px] font-bold transition-all',
                  activeTab === 'nhom'
                    ? 'bg-white text-cerulean-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                Nhóm
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('noi-bo')}
                className={cn(
                  'flex-1 rounded-md px-2 py-1 text-[10px] font-bold transition-all',
                  activeTab === 'noi-bo'
                    ? 'bg-white text-cerulean-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                Nội Bộ
              </button>
            </div>
          </div>

          {showCreate && (
            <div className="space-y-2.5 border-b border-slate-100 bg-cerulean-blue-50/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600">Tạo nhóm</span>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
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
                    onChange={(e) => setGroupRestaurantId(e.target.value)}
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
                  onChange={(e) => setGroupName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateGroup();
                  }}
                  placeholder="Tên nhóm..."
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-cerulean-blue-500"
                />
              </div>

              {createError && <p className="text-[10px] text-red-500">{createError}</p>}
              <button
                type="button"
                onClick={handleCreateGroup}
                disabled={isCreating}
                className="w-full rounded-lg bg-cerulean-blue-600 py-1.5 text-[11px] font-bold text-white transition-all hover:bg-cerulean-blue-700 disabled:bg-slate-200"
              >
                {isCreating ? 'Đang tạo...' : 'Tạo nhóm'}
              </button>
            </div>
          )}

          {/* List Chat cuộn */}
          <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto p-2">
            {isLoading && conversations.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">Đang tải...</div>
            )}
            {activeTab === 'noi-bo' ? (
              <>
                {filteredInternalUsers.map((u) => {
                  const conv = directConversationOf(u._id);
                  const isOnline = onlineUserIds.has(u._id);
                  const unread = conv ? unreadMap[conv._id] ?? 0 : 0;
                  const displayName = u.name || 'Thành viên';
                  const rid = restaurantIdOf(u);
                  const isSelected = conv ? activeConversationId === conv._id : false;
                  return (
                    <button
                      key={u._id}
                      onClick={() => {
                        setShowListOnMobile(false);
                        handlePickDirectUser(u._id);
                      }}
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
                          {roleLabelOf(u.role)}
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
                })}
                {!isLoading && filteredInternalUsers.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Không có nhân viên nào
                  </div>
                )}
              </>
            ) : (
              <>
                {filteredConversations.map((chat) => {
                  const isSelected = activeConversationId === chat._id;
                  const name = convName(chat);
                  const otherId = chat.otherMember?.userId;
                  const isOnline = otherId ? onlineUserIds.has(otherId) : false;
                  const unread = unreadMap[chat._id] ?? 0;
                  const membersTyping =
                    chat.type === 'group'
                      ? Array.from(typingMap[chat._id] ?? new Set<string>())
                      : (typingMap[chat._id]?.size ?? 0) > 0
                        ? ['họ']
                        : [];
                  return (
                    <button
                      key={chat._id}
                      onClick={() => {
                        setShowListOnMobile(false);
                        openConversation(chat._id);
                      }}
                      className={cn(
                        'group relative flex w-full gap-3 rounded-xl p-3 text-left transition-all',
                        isSelected
                          ? 'border border-cerulean-blue-100 bg-cerulean-blue-50'
                          : 'hover:bg-slate-200/50',
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
                          {membersTyping.length > 0
                            ? 'đang gõ...'
                            : chat.lastMessage?.text || 'Bắt đầu trò chuyện'}
                        </p>
                        <span
                          className={cn(
                            'mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold',
                            chat.type === 'group' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600',
                          )}
                        >
                          {chat.type === 'group'
                            ? 'Nhóm'
                            : roleLabelOf(chat.otherMember?.role)}
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
                })}
                {!isLoading && filteredConversations.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Không tìm thấy cuộc hội thoại nào
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 💬 CỘT PHẢI: KHUNG CHÁT CHI TIẾT */}
        <div className="relative flex min-w-0 flex-1 flex-col bg-white">
          {/* Header thanh Chat Action */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4">
            {currentChat ? (
              <div className="flex min-w-0 items-center gap-3">
                {activeConversationId && !showListOnMobile && (
                  <button
                    type="button"
                    onClick={() => setShowListOnMobile(true)}
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
                  onClick={openMemberPanel}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-cerulean-blue-200 bg-cerulean-blue-50 px-2 py-1 text-[10px] font-bold text-cerulean-blue-600 transition-all hover:bg-cerulean-blue-100"
                  aria-label="Thêm thành viên"
                  title="Thêm/Quản lý thành viên"
                >
                  <UserPlus size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Vùng hiển thị tin nhắn (Cuộn) */}
          <div
            ref={scrollRef}
            onScroll={handleConversationScroll}
            className="custom-scrollbar flex-1 space-y-4 overflow-y-auto bg-slate-50/40 p-4"
          >
            {currentChat ? (
              messagesMap[currentChat._id] ? (
                messagesMap[currentChat._id].length > 0 ? (
                  messagesMap[currentChat._id].map((msg) => {
                    const isOwn = msg.senderId === currentUserId;
                    return (
                      <div
                        key={msg._id}
                        className={cn('flex max-w-[80%] gap-2', isOwn ? 'ml-auto flex-row-reverse' : 'mr-auto')}
                      >
                        {/* Avatar nhỏ bên cạnh tin nhắn */}
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-white bg-slate-200 text-[9px] font-bold uppercase shadow-sm">
                          {isOwn ? 'ME' : convName(currentChat).charAt(0)}
                        </div>

                        {/* Khối bong bóng tin nhắn */}
                        <div className="flex flex-col">
                          <div
                            className={cn(
                              'break-words rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm',
                              isOwn
                                ? 'rounded-tr-none bg-cerulean-blue-600 text-white'
                                : 'rounded-tl-none border border-slate-100 bg-white text-slate-800',
                            )}
                          >
                            {msg.text}
                          </div>

                          {/* Thời gian */}
                          <div
                            className={cn(
                              'mt-1 flex items-center gap-1 text-[9px] text-slate-400',
                              isOwn ? 'justify-end' : 'justify-start',
                            )}
                          >
                            <span>{formatTime(msg.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex h-full select-none flex-col items-center justify-center text-slate-400">
                    <MessageSquarePlus size={36} className="mb-2 stroke-[1.5] text-slate-200" />
                    <p className="text-xs">Chưa có tin nhắn nào — hãy gửi tin đầu tiên</p>
                  </div>
                )
              ) : isMessageLoading(currentChat._id) ? (
                <div className="flex h-full select-none flex-col items-center justify-center text-slate-400">
                  <Loader2 size={28} className="mb-2 animate-spin text-cerulean-blue-500" />
                  <p className="text-xs">Đang tải tin nhắn...</p>
                </div>
              ) : (
                <div className="flex h-full select-none flex-col items-center justify-center text-slate-400">
                  <MessageSquarePlus size={36} className="mb-2 stroke-[1.5] text-slate-200" />
                  <p className="text-xs">Chưa có tin nhắn nào — hãy gửi tin đầu tiên</p>
                </div>
              )
            ) : (
              <div className="flex h-full select-none flex-col items-center justify-center text-slate-400">
                <User size={36} className="mb-2 stroke-[1.5] text-slate-200" />
                <p className="text-xs">Hãy chọn một cuộc hội thoại để bắt đầu nhắn tin</p>
              </div>
            )}
          </div>

          {/* Ô THANH CHỮ ĐÁY CHÁT (GỬI TIN NHẮN) */}
          <form
            onSubmit={handleSend}
            className="z-10 flex shrink-0 items-center gap-2 border-t border-slate-100 bg-white p-3"
          >
            <input
              type="text"
              value={inputMessage}
              maxLength={MAX_LENGTH}
              onChange={(e) => {
                setInputMessage(e.target.value);
                if (activeConversationId) emitTyping(activeConversationId, e.target.value.length > 0);
              }}
              onKeyDown={(e) => {
                // Enter: gửi; Ctrl+Enter / Shift+Enter: xuống dòng
                if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
                  e.preventDefault();
                  if (activeConversationId && inputMessage.trim()) {
                    send(activeConversationId, inputMessage);
                    setInputMessage('');
                    emitTyping(activeConversationId, false);
                  }
                }
              }}
              disabled={!currentChat}
              placeholder={
                currentChat ? `Nhập tin nhắn đến ${convName(currentChat)}... (Enter để gửi)` : 'Vui lòng chọn chat'
              }
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-cerulean-blue-500 focus:bg-white disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || !currentChat}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cerulean-blue-600 shadow-sm transition-all hover:bg-cerulean-blue-700 active:scale-95 disabled:bg-slate-100 disabled:text-slate-400"
              aria-label="Gửi tin nhắn"
            >
              <Send size={13} className="ml-0.5" />
            </button>
          </form>
          {currentChat && inputMessage.length >= MAX_LENGTH - 100 && (
            <div className="pointer-events-none absolute bottom-12 right-3 text-[9px] text-slate-400">
              {inputMessage.length}/{MAX_LENGTH}
            </div>
          )}

          {/* 🔧 PANEL QUẢN LÝ THÀNH VIÊN NHÓM (inline, thay cho modal) */}
          {showMemberPanel && currentChat && (
            <div className="absolute inset-y-0 right-0 z-20 flex w-[320px] max-w-full flex-col border-l border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <span className="text-xs font-bold text-slate-700">Quản lý thành viên</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowMemberPanel(false);
                    setSelectedIds([]);
                    setMemberError('');
                  }}
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
                            onClick={() => handleRemoveMember(String(m.userId))}
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
                            onChange={() => toggleMemberSelect(u._id)}
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
                    onClick={handleAddMembers}
                    disabled={isManagingMembers || selectedIds.length === 0}
                    className="flex-1 rounded-lg bg-cerulean-blue-600 py-1.5 text-[11px] font-bold text-white transition-all hover:bg-cerulean-blue-700 disabled:bg-slate-200"
                  >
                    {isManagingMembers ? 'Đang thêm...' : 'Thêm'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMemberPanel(false);
                      setSelectedIds([]);
                      setMemberError('');
                    }}
                    className="rounded-lg bg-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-700 transition-all hover:bg-slate-300"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagePage;